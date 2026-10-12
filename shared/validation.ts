import type { Brief } from './types';

export const BRIEF_LIMITS = {
  customerName: 60, businessName: 80, whatsapp: 16, email: 254,
  location: 80, tagline: 120, featured: 160, notes: 600, serviceName: 60,
  serviceCount: 8, priceCents: 999999,
} as const;
export const isValidColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);
export const isValidWhatsapp = (value: string) => /^\+[1-9]\d{7,14}$/.test(value);
export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value) && value.length <= 254;
export function moneyToCents(value: string): number | null {
  if (!/^(?:0|[1-9]\d{0,3})(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ''] = value.trim().split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return cents <= BRIEF_LIMITS.priceCents ? cents : null;
}
export const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Validate rather than truncate. Lengths count Unicode code points, not UTF-16 halves. */
export function validateBrief(value: unknown): { brief: Brief | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!isRecord(value)) return { brief: null, errors: { brief: 'Provide a brief object.' } };
  const allowed = ['customerName', 'businessName', 'whatsapp', 'email', 'location', 'tagline', 'brandColor', 'services', 'featured', 'notes', 'acceptedTerms'];
  if (Object.keys(value).some(key => !allowed.includes(key))) errors.brief = 'The brief includes unsupported fields.';
  const text = (key: string, max: number, required = false, multiline = false): string => {
    const raw = value[key] ?? '';
    if (typeof raw !== 'string') { errors[key] = 'Use text for this field.'; return ''; }
    const normalized = raw.normalize('NFC').trim();
    if (required && !normalized) errors[key] = 'Please complete this field.';
    if (Array.from(normalized).length > max) errors[key] = `Use ${max} characters or fewer.`;
    if ((multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u : /[\u0000-\u001f\u007f]/u).test(normalized)) errors[key] = 'Remove unsupported control characters.';
    return normalized;
  };
  const brief: Brief = {
    customerName: text('customerName', BRIEF_LIMITS.customerName, true),
    businessName: text('businessName', BRIEF_LIMITS.businessName, true),
    whatsapp: text('whatsapp', BRIEF_LIMITS.whatsapp, true),
    email: text('email', BRIEF_LIMITS.email), location: text('location', BRIEF_LIMITS.location),
    tagline: text('tagline', BRIEF_LIMITS.tagline), brandColor: text('brandColor', 7, true),
    featured: text('featured', BRIEF_LIMITS.featured, true), notes: text('notes', BRIEF_LIMITS.notes, false, true),
    services: [], acceptedTerms: value.acceptedTerms === true,
  };
  if (!isValidWhatsapp(brief.whatsapp)) errors.whatsapp = 'Use + followed by country code and 8–15 digits, without spaces.';
  if (brief.email && !isValidEmail(brief.email)) errors.email = 'Enter a valid email address or leave it blank.';
  if (!isValidColor(brief.brandColor)) errors.brandColor = 'Choose a colour in #RRGGBB format.';
  if (!brief.acceptedTerms) errors.acceptedTerms = 'Accept the displayed package scope and service terms.';
  if (!Array.isArray(value.services) || value.services.length < 1 || value.services.length > 8) {
    errors.services = 'Provide one to eight services.';
  } else {
    value.services.forEach((service, index) => {
      if (!isRecord(service) || Object.keys(service).some(key => !['name', 'priceCents'].includes(key))) {
        errors[`services.${index}`] = 'Provide a service name and USD price.'; return;
      }
      const name = typeof service.name === 'string' ? service.name.normalize('NFC').trim() : '';
      if (!name || Array.from(name).length > BRIEF_LIMITS.serviceName || /[\u0000-\u001f\u007f]/u.test(name)) errors[`services.${index}.name`] = 'Use a service name of 1–60 characters.';
      if (typeof service.priceCents !== 'number' || !Number.isSafeInteger(service.priceCents) || service.priceCents < 0 || service.priceCents > BRIEF_LIMITS.priceCents) errors[`services.${index}.priceCents`] = 'Use a USD price from 0.00 to 9999.99 with at most two decimal places.';
      brief.services.push({ name, priceCents: service.priceCents as number });
    });
  }
  return { brief: Object.keys(errors).length ? null : brief, errors };
}
