import type { Brief, Order } from '../shared/types';
import { isRecord, validateBrief } from '../shared/validation';

export class HttpError extends Error {
  constructor(public status: number, message: string, public fields?: Record<string, string>) { super(message); }
}
const fail = (message: string): never => { throw new HttpError(422, message); };
const boundedText = (value: unknown, max: number, label: string, required = true): string => {
  if (typeof value !== 'string' || (required && !value.trim()) || Array.from(value.trim()).length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) return fail(`${label} must be ${required ? '1' : '0'}–${max} characters.`);
  return value.trim();
};
function approved(value: unknown): Brief {
  const result = validateBrief(value);
  if (!result.brief) throw new HttpError(422, 'Check the approved brief.', result.errors);
  return result.brief;
}
function preset(value: unknown): 'botanical' | 'editorial' {
  if (value !== 'botanical' && value !== 'editorial') return fail('Choose a supported style preset.');
  return value;
}
function cents(value: unknown, max: number, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max) return fail(`${label} must be whole cents between 0 and ${max}.`);
  return value;
}
function version(order: Order, input: Record<string, unknown>) {
  if (input.version !== order.contentVersion) throw new HttpError(409, 'The content version changed. Refresh and use the current files.');
}
function logoHash(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) return fail('The approved local logo fingerprint is invalid.');
  return value;
}

/** Pure server state machine; the caller persists this result with optimistic locking. */
export function applyAction(existing: Order, input: unknown): Order {
  if (!isRecord(input) || typeof input.action !== 'string') throw new HttpError(400, 'Provide an operator action.');
  if (input.expectedUpdatedAt !== existing.updatedAt) throw new HttpError(409, 'This order changed. Refresh before saving.');
  const order: Order = structuredClone(existing);
  const now = new Date(Math.max(Date.now(), Date.parse(existing.updatedAt) + 1)).toISOString();
  let detail = '';
  const ready = () => {
    if (order.paymentStatus !== 'verified' || !order.payment) return fail('Verify payment in Paynow before production.');
    if (!order.scopeConfirmedAt || !order.approvedBrief) return fail('Confirm the scope and approved information first.');
  };
  switch (input.action) {
    case 'confirm_scope':
      if (order.scopeConfirmedAt) return fail('Scope is already confirmed. Use revision or operator correction to change content.');
      order.approvedBrief = approved(input.approvedBrief);
      order.timing = boundedText(input.timing, 240, 'Confirmed delivery timing');
      order.preset = preset(input.preset);
      order.logoSha256 = logoHash(input.logoSha256 ?? null);
      order.scopeConfirmedAt = now;
      detail = `Scope and timing confirmed; content v${order.contentVersion}.`;
      break;
    case 'verify_payment': {
      if (!order.scopeConfirmedAt) return fail('Confirm scope and timing before requesting or verifying payment.');
      if (order.paymentStatus === 'verified') return fail('Payment has already been verified.');
      if (input.checkedInPaynow !== true) return fail('Check the actual transaction in Paynow first.');
      if (input.reference !== order.reference || input.currency !== order.currency || input.grossCents !== order.priceCents) return fail('Reference, USD currency and gross amount must exactly match this order. Leave ambiguous payments pending.');
      if (typeof input.status !== 'string' || input.status.trim().toLowerCase() !== 'paid') return fail('Only a transaction with confirmed Paid status can be verified.');
      const transaction = boundedText(input.providerTransactionId, 100, 'Paynow transaction ID');
      if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/.test(transaction)) return fail('Use the actual Paynow transaction ID without spaces.');
      const fee = cents(input.feeCents, order.priceCents, 'Actual fees');
      order.payment = { providerTransactionId: transaction, reference: order.reference, currency: 'USD', grossCents: order.priceCents, feeCents: fee, netCents: order.priceCents - fee, status: 'paid', verifiedAt: now, settledCents: 0, settledAt: null };
      order.paymentStatus = 'verified';
      detail = order.isTest ? 'FICTIONAL TEST: simulated Paynow verification only; no real transaction or settlement.' : 'Actual Paynow transaction manually verified; settlement remains separate.';
      break;
    }
    case 'settlement':
      ready();
      order.payment!.settledCents = cents(input.settledCents, order.payment!.netCents, 'Cumulative amount settled');
      order.payment!.settledAt = order.payment!.settledCents > 0 ? now : null;
      detail = 'Cumulative settlement recorded separately from payment confirmation.';
      break;
    case 'generated':
      ready(); version(order, input);
      if (logoHash(input.logoSha256 ?? null) !== (order.logoSha256 ?? null)) return fail('Use the matching approved local logo, or save a new content version to add, replace or remove it.');
      if (order.deliveredAt) return fail('This version was already delivered. Create an operator correction or customer revision before producing new files.');
      order.generatedVersion = order.contentVersion; order.generatedAt = now;
      order.reviewedVersion = null; order.reviewedAt = null; order.productionStatus = 'generated';
      detail = `Four outputs generated locally for v${order.contentVersion}; awaiting human inspection.`;
      break;
    case 'review':
      ready(); version(order, input);
      if (input.confirmed !== true || order.generatedVersion !== order.contentVersion) return fail('Inspect all four current outputs and explicitly approve them.');
      order.reviewedVersion = order.contentVersion; order.reviewedAt = now; order.productionStatus = 'approved';
      detail = `Human review approved all four outputs, v${order.contentVersion}.`;
      break;
    case 'deliver':
      ready(); version(order, input);
      if (order.generatedVersion !== order.contentVersion || order.reviewedVersion !== order.contentVersion || order.productionStatus !== 'approved') return fail('Approve all four files for the current version before recording delivery.');
      if (order.deliveredAt) return fail('Delivery of this version is already recorded.');
      order.deliveryChannel = boundedText(input.channel, 100, 'Actual delivery channel');
      order.deliveredAt = now;
      detail = `Actual delivery recorded for v${order.contentVersion} via ${order.deliveryChannel}.`;
      break;
    case 'revise':
      if (!order.scopeConfirmedAt || !order.approvedBrief) return fail('Confirm scope before editing approved content.');
      if (!['customer_revision', 'operator_correction'].includes(input.reason as string)) return fail('Select customer revision or operator correction.');
      if (input.reason === 'customer_revision') {
        ready();
        if (order.revisionUsed) return fail('The included consolidated customer revision has already been used.');
        if (order.generatedVersion === null) return fail('Generate the first drafts before using the customer revision.');
        order.revisionUsed = true;
      }
      order.approvedBrief = approved(input.approvedBrief); order.preset = preset(input.preset);
      if ('logoSha256' in input) order.logoSha256 = logoHash(input.logoSha256);
      order.contentVersion += 1; order.generatedVersion = null; order.reviewedVersion = null;
      order.generatedAt = null; order.reviewedAt = null; order.deliveredAt = null; order.deliveryChannel = '';
      order.productionStatus = 'not_started';
      detail = `${input.reason === 'operator_correction' ? 'Operator correction (customer allowance preserved)' : 'Included consolidated customer revision'}; now v${order.contentVersion}. Previous review invalidated.`;
      break;
    case 'notes':
      order.operatorNotes = boundedText(input.notes, 2000, 'Operator notes', false); detail = 'Operator notes updated.';
      break;
    case 'mark_test':
      if (input.isTest !== true) return fail('Test orders cannot be promoted into genuine sales.');
      order.isTest = true; detail = 'Excluded from live demand and financial totals.';
      break;
    default: throw new HttpError(400, 'Unknown operator action.');
  }
  order.updatedAt = now;
  order.events.push({ at: now, action: input.action, detail });
  if (order.events.length > 500) return fail('This order has reached its audit history limit. Export it and contact the owner.');
  return order;
}
