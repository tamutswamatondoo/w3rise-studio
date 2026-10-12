import type { Metrics, Order, PublicConfig } from '../shared/types';
import { isRecord, isValidEmail, isValidWhatsapp, validateBrief } from '../shared/validation';
import { accessIssuer, authorize, isLocalDevelopment } from './auth';
import { applyAction, HttpError } from './state';

export interface Env {
  DB: D1Database; ASSETS: Fetcher;
  APP_ENV?: string; LOCAL_AUTH?: string; ORDERS_OPEN?: string;
  PAYNOW_MERCHANT_EMAIL?: string; SUPPORT_EMAIL?: string; SUPPORT_WHATSAPP?: string;
  RESPONSE_HOURS?: string; RETENTION_DAYS?: string;
  ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string; OWNER_EMAIL?: string;
  TURNSTILE_SITE_KEY?: string; TURNSTILE_SECRET_KEY?: string; RATE_LIMIT_SALT?: string;
  PUBLIC_ORIGIN?: string;
}
interface Row { reference: string; request_hash: string; data: string; updated_at: string }
const MAX_BODY_BYTES = 24 * 1024;
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const sha256 = async (text: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('');

export function publicOrigin(env: Env): string | null {
  try {
    const url = new URL(env.PUBLIC_ORIGIN || '');
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || ['localhost', '127.0.0.1'].includes(url.hostname)) return null;
    return url.origin;
  } catch { return null; }
}
async function publicConfig(request: Request, env: Env): Promise<PublicConfig> {
  const local = isLocalDevelopment(request, env);
  const setting = await env.DB.prepare("SELECT value FROM settings WHERE key = 'orders_open'").first<{ value: string }>();
  const requestedOpen = setting ? setting.value === 'true' : env.ORDERS_OPEN === 'true';
  const configured = !!publicOrigin(env) && !!accessIssuer(env) && !!env.PAYNOW_MERCHANT_EMAIL && isValidEmail(env.PAYNOW_MERCHANT_EMAIL) && !!env.SUPPORT_WHATSAPP && isValidWhatsapp(env.SUPPORT_WHATSAPP) && !!env.SUPPORT_EMAIL && isValidEmail(env.SUPPORT_EMAIL) && !!env.TURNSTILE_SITE_KEY && !!env.TURNSTILE_SECRET_KEY && (env.RATE_LIMIT_SALT?.length || 0) >= 32;
  const days = Number(env.RETENTION_DAYS || 180);
  return {
    ordersOpen: requestedOpen && (local || configured), local,
    supportEmail: env.SUPPORT_EMAIL && isValidEmail(env.SUPPORT_EMAIL) ? env.SUPPORT_EMAIL : '',
    supportWhatsapp: env.SUPPORT_WHATSAPP && isValidWhatsapp(env.SUPPORT_WHATSAPP) ? env.SUPPORT_WHATSAPP : '',
    responseHours: env.RESPONSE_HOURS || 'Response hours will be confirmed by the owner.',
    retentionDays: Number.isInteger(days) && days >= 30 && days <= 3650 ? days : 180,
    turnstileSiteKey: local ? '' : env.TURNSTILE_SITE_KEY || '',
  };
}

function sameOrigin(request: Request, env: Env) {
  const expected = isLocalDevelopment(request, env) ? new URL(request.url).origin : publicOrigin(env);
  if (!expected || request.headers.get('origin') !== expected || new URL(request.url).origin !== expected || request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError(403, 'Open the form on this website and try again.');
}
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new HttpError(415, 'Send JSON data.');
  const declaredLength = Number(request.headers.get('content-length'));
  if (declaredLength > MAX_BODY_BYTES) throw new HttpError(413, 'The brief is too large. Shorten the information and try again.');
  if (!request.body) throw new HttpError(400, 'Provide a request body.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) { await reader.cancel(); throw new HttpError(413, 'The brief is too large. Shorten the information and try again.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!isRecord(parsed)) throw new Error();
    return parsed;
  } catch { throw new HttpError(400, 'The submitted information is not valid JSON.'); }
}

async function limitIntake(request: Request, env: Env) {
  // Cloudflare supplies the connecting IP at the edge. Hash with a secret and daily scope.
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip || !env.RATE_LIMIT_SALT) throw new HttpError(503, 'Orders are temporarily paused. Please use the support contact.');
  const now = Math.floor(Date.now() / 1000);
  const key = await sha256(`${env.RATE_LIMIT_SALT}:${Math.floor(now / 86400)}:${ip}`);
  const row = await env.DB.prepare('INSERT INTO intake_rate_limits(key, count, expires_at) VALUES(?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN expires_at < ? THEN 1 ELSE count + 1 END, expires_at = CASE WHEN expires_at < ? THEN excluded.expires_at ELSE expires_at END RETURNING count')
    .bind(key, now + 3600, now, now).first<{ count: number }>();
  await env.DB.prepare('DELETE FROM intake_rate_limits WHERE expires_at < ?').bind(now - 3600).run();
  if (!row || row.count > 8) throw new HttpError(429, 'Too many submissions. Please wait an hour or contact us manually.');
}

async function challenge(request: Request, env: Env, token: unknown) {
  if (typeof token !== 'string' || token.length < 1 || token.length > 2048) throw new HttpError(422, 'Complete the security check and try again.');
  const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY!, response: token, remoteip: request.headers.get('CF-Connecting-IP') || '' });
  let result: { success?: boolean; hostname?: string; action?: string };
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error();
    result = await response.json();
  } catch { throw new HttpError(503, 'The security check is unavailable. Try again or contact us manually.'); }
  if (!result.success || result.hostname !== new URL(publicOrigin(env)!).hostname || result.action !== 'order') throw new HttpError(422, 'The security check expired or was invalid. Complete it again.');
}

async function intake(request: Request, env: Env): Promise<Response> {
  sameOrigin(request, env);
  const config = await publicConfig(request, env);
  if (!config.ordersOpen) throw new HttpError(503, 'New orders are paused. Please contact us to discuss availability.');
  const body = await readJson(request);
  if (Object.keys(body).some(key => !['brief', 'requestId', 'honeypot', 'turnstileToken'].includes(key))) throw new HttpError(422, 'Unsupported submission fields. Payment and production state can only be set by the operator.');
  if (typeof body.honeypot !== 'string' || body.honeypot !== '') throw new HttpError(422, 'The submission could not be accepted. Please contact us manually.');
  if (typeof body.requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.requestId)) throw new HttpError(422, 'The submission identifier is invalid. Refresh and try again.');
  const { brief, errors } = validateBrief(body.brief);
  if (!brief) throw new HttpError(422, 'Please check the highlighted information.', errors);
  if (!config.local) await limitIntake(request, env);
  const hash = await sha256(JSON.stringify(brief));
  // A network retry may reuse the same already-used Turnstile token, but only retrieve
  // the same reference when the unguessable request ID AND original brief match.
  const previous = await env.DB.prepare('SELECT reference, request_hash FROM orders WHERE request_id = ?').bind(body.requestId).first<Row>();
  if (previous) {
    if (previous.request_hash !== hash) throw new HttpError(409, 'This submission identifier was used with different information. Start a new request.');
    return json({ reference: previous.reference, duplicate: true });
  }
  if (!config.local) await challenge(request, env, body.turnstileToken);
  const now = new Date().toISOString();
  const reference = `W3-${now.slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  const order: Order = {
    reference, brief, approvedBrief: null, createdAt: now, updatedAt: now,
    packageVersion: 'studio-usd20-v1', priceCents: 2000, currency: 'USD', isTest: config.local,
    scopeConfirmedAt: null, timing: '', paymentStatus: 'pending', payment: null,
    productionStatus: 'not_started', contentVersion: 1, generatedVersion: null, reviewedVersion: null,
    generatedAt: null, reviewedAt: null, deliveredAt: null, deliveryChannel: '', revisionUsed: false,
    operatorNotes: '', preset: 'botanical', logoSha256: null, events: [{ at: now, action: 'submitted', detail: config.local ? 'Local fictional/test brief saved. Excluded from live totals.' : 'Customer brief saved; payment and production pending.' }],
  };
  try {
    await env.DB.prepare('INSERT INTO orders(reference, request_id, request_hash, data, created_at, updated_at, is_test) VALUES(?, ?, ?, ?, ?, ?, ?)')
      .bind(reference, body.requestId, hash, JSON.stringify(order), now, now, order.isTest ? 1 : 0).run();
  } catch (error) {
    const duplicate = await env.DB.prepare('SELECT reference, request_hash FROM orders WHERE request_id = ?').bind(body.requestId).first<Row>();
    if (duplicate?.request_hash === hash) return json({ reference: duplicate.reference, duplicate: true });
    if (duplicate) throw new HttpError(409, 'This submission identifier was already used.');
    throw error;
  }
  return json({ reference }, 201);
}

async function loadOrder(env: Env, reference: string): Promise<Order> {
  const row = await env.DB.prepare('SELECT data FROM orders WHERE reference = ?').bind(reference).first<Row>();
  if (!row) throw new HttpError(404, 'Order not found.');
  return JSON.parse(row.data) as Order;
}
async function allOrders(env: Env): Promise<Order[]> {
  const rows = await env.DB.prepare('SELECT data FROM orders ORDER BY created_at ASC LIMIT 10001').all<Row>();
  if (rows.results.length > 10000) throw new HttpError(422, 'More than 10,000 orders are stored. Export through D1 before using this desk.');
  return rows.results.map(row => JSON.parse(row.data) as Order);
}
export function metricsFor(orders: Order[]): Metrics {
  const live = orders.filter(order => !order.isTest);
  const paid = live.filter(order => order.paymentStatus === 'verified' && order.payment);
  const sum = (key: 'grossCents' | 'feeCents' | 'netCents' | 'settledCents') => paid.reduce((total, order) => total + order.payment![key], 0);
  return { submitted: live.length, paid: paid.length, grossCents: sum('grossCents'), feeCents: sum('feeCents'), netCents: sum('netCents'), settledCents: sum('settledCents'), delivered: live.filter(order => order.deliveredAt).length };
}
function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[\s]*[=+@-]/u.test(text)) text = `'${text}`; // protect spreadsheet formula execution
  return `"${text.replaceAll('"', '""')}"`;
}
function exportOrders(orders: Order[], format: string): Response {
  if (format === 'json') return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), currency: 'USD', metrics: metricsFor(orders), orders }, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="w3rise-private-orders.json"', 'Cache-Control': 'no-store' } });
  if (format !== 'csv') throw new HttpError(400, 'Choose CSV or JSON export.');
  const header = ['reference', 'isTest', 'createdAt', 'businessName', 'customerName', 'whatsapp', 'email', 'priceCents', 'currency', 'paymentStatus', 'providerTransactionId', 'grossCents', 'feeCents', 'netCents', 'settledCents', 'verifiedAt', 'settledAt', 'productionStatus', 'contentVersion', 'generatedAt', 'reviewedAt', 'deliveredAt', 'deliveryChannel', 'operatorNotes'];
  const lines = orders.map(order => [order.reference, order.isTest, order.createdAt, order.brief.businessName, order.brief.customerName, order.brief.whatsapp, order.brief.email, order.priceCents, order.currency, order.paymentStatus, order.payment?.providerTransactionId, order.payment?.grossCents, order.payment?.feeCents, order.payment?.netCents, order.payment?.settledCents, order.payment?.verifiedAt, order.payment?.settledAt, order.productionStatus, order.contentVersion, order.generatedAt, order.reviewedAt, order.deliveredAt, order.deliveryChannel, order.operatorNotes]);
  return new Response('\uFEFF' + [header, ...lines].map(row => row.map(csvCell).join(',')).join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="w3rise-private-finances.csv"', 'Cache-Control': 'no-store' } });
}

export function paynowLink(order: Pick<Order, 'reference' | 'priceCents' | 'currency'>, merchant: string): string {
  if (!isValidEmail(merchant) || order.currency !== 'USD' || order.priceCents !== 2000) throw new HttpError(503, 'The USD payment instructions are not configured.');
  const argumentsText = `search=${encodeURIComponent(merchant)}&amount=${(order.priceCents / 100).toFixed(2)}&reference=${encodeURIComponent(order.reference)}&l=1`;
  return `https://www.paynow.co.zw/Payment/Link/?q=${encodeURIComponent(btoa(argumentsText))}`;
}

async function admin(request: Request, env: Env, path: string): Promise<Response> {
  if (request.method === 'POST') sameOrigin(request, env);
  if (path === '/api/admin/settings' && request.method === 'POST') {
    const body = await readJson(request);
    if (typeof body.ordersOpen !== 'boolean' || Object.keys(body).length !== 1) throw new HttpError(422, 'Set ordersOpen to true or false.');
    await env.DB.prepare("INSERT INTO settings(key, value) VALUES('orders_open', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(String(body.ordersOpen)).run();
    return json(await publicConfig(request, env));
  }
  if (path === '/api/admin/retention' && request.method === 'POST') {
    const body = await readJson(request);
    if (body.confirmed !== true || Object.keys(body).length !== 1) throw new HttpError(422, 'Confirm deletion of unpaid briefs older than the configured retention period.');
    const config = await publicConfig(request, env);
    const cutoff = new Date(Date.now() - config.retentionDays * 86400000).toISOString();
    const result = await env.DB.prepare("DELETE FROM orders WHERE updated_at < ? AND provider_transaction_id IS NULL AND json_extract(data, '$.paymentStatus') = 'pending'").bind(cutoff).run();
    return json({ deleted: result.meta.changes, retentionDays: config.retentionDays });
  }
  if (path === '/api/admin/orders' && request.method === 'GET') {
    const orders = await allOrders(env);
    return json({ orders, metrics: metricsFor(orders) });
  }
  if (path === '/api/admin/export' && request.method === 'GET') return exportOrders(await allOrders(env), new URL(request.url).searchParams.get('format') || 'json');
  const match = /^\/api\/admin\/orders\/(W3-\d{8}-[A-F0-9]{12})(\/action|\/payment-link)?$/.exec(path);
  if (match && request.method === 'GET' && match[2] === '/payment-link') {
    const order = await loadOrder(env, match[1]);
    if (!order.scopeConfirmedAt) throw new HttpError(422, 'Confirm scope and timing before sending payment instructions.');
    return json({ url: paynowLink(order, env.PAYNOW_MERCHANT_EMAIL || ''), instructions: `Your w3Rise Studio package is US$20. Please use reference ${order.reference}. Confirm USD at Paynow checkout; this simple link does not force the currency and its amount/reference can be changed. Other-currency requests need our quote. We verify the actual Paynow transaction before production. Confirmed delivery timing: ${order.timing}` });
  }
  if (match && request.method === 'GET' && !match[2]) return json({ order: await loadOrder(env, match[1]) });
  if (match && request.method === 'POST' && match[2] === '/action') {
    const body = await readJson(request);
    const existing = await loadOrder(env, match[1]);
    const order = applyAction(existing, body);
    try {
      const result = await env.DB.prepare('UPDATE orders SET data = ?, updated_at = ?, is_test = ?, provider_transaction_id = ? WHERE reference = ? AND updated_at = ?')
        .bind(JSON.stringify(order), order.updatedAt, order.isTest ? 1 : 0, order.payment?.providerTransactionId || null, order.reference, existing.updatedAt).run();
      if (result.meta.changes !== 1) throw new HttpError(409, 'This order changed while you were saving. Refresh and try again.');
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (String(error).includes('UNIQUE')) throw new HttpError(409, 'That Paynow transaction is already assigned to an order. Leave this payment pending.');
      throw error;
    }
    return json({ order });
  }
  throw new HttpError(404, 'Operator route not found.');
}

function secured(response: Response, local: boolean, privateRoute: boolean): Response {
  const copy = new Response(response.body, response);
  copy.headers.set('X-Content-Type-Options', 'nosniff');
  copy.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  copy.headers.set('X-Frame-Options', 'DENY');
  copy.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (privateRoute) { copy.headers.set('Cache-Control', 'no-store'); copy.headers.set('X-Robots-Tag', 'noindex, nofollow'); }
  if (!local) {
    copy.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://challenges.cloudflare.com; frame-src 'self' blob: https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    copy.headers.set('Strict-Transport-Security', 'max-age=31536000');
  }
  return copy;
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
  const privateRoute = path === '/admin' || path.startsWith('/admin/') || path === '/api/admin' || path.startsWith('/api/admin/');
  const local = isLocalDevelopment(request, env);
  let response: Response;
  try {
    if (privateRoute && !(await authorize(request, env))) throw new HttpError(403, 'Owner sign-in through Cloudflare Access is required. Production access is disabled until configured.');
    if (path === '/api/config' && request.method === 'GET') response = json(await publicConfig(request, env));
    else if (path === '/api/orders' && request.method === 'POST') response = await intake(request, env);
    else if (path.startsWith('/api/admin/') || path === '/api/admin') response = await admin(request, env, path);
    else if (path.startsWith('/api/')) throw new HttpError(404, 'Route not found.');
    else {
      response = await env.ASSETS.fetch(request);
      if (response.headers.get('content-type')?.includes('text/html')) {
        const origin = publicOrigin(env);
        const rewriter = new HTMLRewriter().on('meta[property="og:image"]', { element(element) { if (origin) element.setAttribute('content', `${origin}/samples/share.png`); else element.remove(); } });
        if (origin && ['/', '/order', '/terms', '/privacy'].includes(path)) rewriter.on('head', { element(element) { element.append(`<link rel="canonical" href="${origin}${path}"><meta property="og:url" content="${origin}${path}">`, { html: true }); } });
        response = rewriter.transform(response);
      }
    }
  } catch (error) {
    if (error instanceof HttpError) response = json({ error: error.message, ...(error.fields ? { fields: error.fields } : {}) }, error.status);
    else response = json({ error: 'The service could not save or retrieve this information. Please try again or contact support.' }, 503);
    // Deliberately never log customer briefs, authentication tokens or request bodies.
  }
  return secured(response, local, privateRoute);
}

export default { fetch: handleRequest } satisfies ExportedHandler<Env>;
