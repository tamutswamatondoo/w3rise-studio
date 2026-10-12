import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { handleRequest, metricsFor, paynowLink, readJson, type Env } from '../worker/index';
import { authorize, isLocalDevelopment } from '../worker/auth';
import { HttpError } from '../worker/state';
import { moneyToCents, validateBrief } from '../shared/validation';
import type { Brief, Order } from '../shared/types';

const origin = 'http://127.0.0.1:5173';
const brief: Brief = { customerName: 'Fictional Owner', businessName: 'Acacia Sample Salon', whatsapp: '+263770000000', email: '', location: 'Sample location', tagline: 'Care in every detail', brandColor: '#6A4835', services: [{ name: 'Wash & style', priceCents: 1200 }], featured: 'Wash & style — US$12', notes: '', acceptedTerms: true };
let mf: Miniflare;
let env: Env;
const request = (path: string, body?: unknown, overrides: RequestInit = {}) => new Request(origin + path, { ...(body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body) }), ...overrides });
const call = (path: string, body?: unknown, overrides: RequestInit = {}) => handleRequest(request(path, body, overrides), env);
async function create(id = crypto.randomUUID(), changes: Partial<Brief> = {}) {
  const response = await call('/api/orders', { brief: { ...brief, ...changes }, requestId: id, honeypot: '', turnstileToken: '' });
  expect(response.status).toBe(201);
  const data = await response.json() as { reference: string };
  return (await (await call(`/api/admin/orders/${data.reference}`)).json() as { order: Order }).order;
}
async function action(order: Order, name: string, fields: Record<string, unknown> = {}, status = 200): Promise<Order> {
  const response = await call(`/api/admin/orders/${order.reference}/action`, { action: name, expectedUpdatedAt: order.updatedAt, ...fields });
  const payload = await response.json() as { order: Order; error: string };
  expect(response.status, payload.error).toBe(status);
  return payload.order;
}
const scope = (order: Order) => action(order, 'confirm_scope', { approvedBrief: order.brief, timing: 'A fictional agreed delivery time', preset: 'botanical' });
const pay = (order: Order, tx = 'TEST-PAYNOW-100') => action(order, 'verify_payment', { providerTransactionId: tx, reference: order.reference, currency: 'USD', grossCents: 2000, feeCents: 70, status: 'paid', checkedInPaynow: true });

beforeAll(async () => {
  mf = new Miniflare({ workers: [{ config: {
    name: 'api-test', compatibilityDate: '2026-10-01',
    manifest: { mainModule: 'index.js', modules: { 'index.js': { type: 'esm', contents: 'export default { fetch() { return new Response("Test runtime"); } }' } } },
    env: { DB: { type: 'd1', id: 'unit-test-db' } },
  } }] });
  const DB = await mf.getD1Database('DB');
  const sql = await readFile(new URL('../migrations/0001_orders.sql', import.meta.url), 'utf8');
  for (const statement of sql.split(';').filter(value => value.trim())) await DB.prepare(statement).run();
  env = { DB: DB as unknown as D1Database, ASSETS: { fetch: async () => new Response('Public static shell') } as unknown as Fetcher, APP_ENV: 'local', LOCAL_AUTH: 'enabled', ORDERS_OPEN: 'true', PAYNOW_MERCHANT_EMAIL: 'tamutswamatondo04@gmail.com', RETENTION_DAYS: '180' };
}, 30000);
beforeEach(async () => {
  await env.DB.batch(['DELETE FROM orders', 'DELETE FROM settings', 'DELETE FROM intake_rate_limits'].map(sql => env.DB.prepare(sql)));
  vi.unstubAllGlobals();
});
afterAll(async () => { vi.unstubAllGlobals(); await mf?.dispose(); });

describe('intake and persistence with real local D1 SQLite', () => {
  it('saves exactly the validated brief and authoritative USD package', async () => {
    const order = await create();
    expect(order.priceCents).toBe(2000); expect(order.currency).toBe('USD'); expect(order.isTest).toBe(true);
    expect(order.paymentStatus).toBe('pending'); expect(order.productionStatus).toBe('not_started');
    expect(order.brief).toEqual(brief);
    const refreshed = await call(`/api/admin/orders/${order.reference}`);
    expect((await refreshed.json() as { order: Order }).order.reference).toBe(order.reference);
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM orders').first('count')).toBe(1);
  });
  it('deduplicates retries and concurrent identical submissions, rejects changed request reuse', async () => {
    const body = { brief, requestId: crypto.randomUUID(), honeypot: '', turnstileToken: '' };
    const responses = await Promise.all([call('/api/orders', body), call('/api/orders', body)]);
    expect(responses.map(value => value.status).sort()).toEqual([200, 201]);
    const results = await Promise.all(responses.map(value => value.json() as Promise<{ reference: string }>));
    expect(results[0].reference).toBe(results[1].reference);
    expect((await call('/api/orders', { ...body, brief: { ...brief, customerName: 'Changed' } })).status).toBe(409);
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM orders').first('count')).toBe(1);
  });
  it('rejects unsupported status fields, invalid cents, oversized Unicode and honeypots', async () => {
    const body = { brief, requestId: crypto.randomUUID(), honeypot: '', turnstileToken: '' };
    for (const invalid of [{ ...body, paymentStatus: 'verified' }, { ...body, brief: { ...brief, paymentStatus: 'verified' } }, { ...body, brief: { ...brief, services: [{ name: 'Service', priceCents: 5.1 }] } }, { ...body, brief: { ...brief, businessName: '🙂'.repeat(81) } }, { ...body, honeypot: 'bot' }]) expect((await call('/api/orders', invalid)).status).toBe(422);
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM orders').first('count')).toBe(0);
  });
  it('bounds streamed bodies without trusting Content-Length', async () => {
    let reads = 0; let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({ pull(controller) { reads++; controller.enqueue(new Uint8Array(16000)); }, cancel() { cancelled = true; } });
    const streamed = new Request(origin + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: stream, duplex: 'half' } as RequestInit);
    await expect(readJson(streamed)).rejects.toMatchObject({ status: 413 });
    expect(cancelled).toBe(true); expect(reads).toBeLessThanOrEqual(3);
    expect((await call('/api/orders', { enormous: 'a'.repeat(25000) })).status).toBe(413);
  });
  it('rejects malformed JSON, missing terms, and cross-origin requests', async () => {
    expect((await call('/api/orders', undefined, { method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: '{' })).status).toBe(400);
    expect((await call('/api/orders', { brief: { ...brief, acceptedTerms: false }, requestId: crypto.randomUUID(), honeypot: '' })).status).toBe(422);
    expect((await call('/api/orders', { brief }, { headers: { 'content-type': 'application/json', origin: 'https://evil.example' } })).status).toBe(403);
  });
  it('persists capacity pauses and rejects new briefs', async () => {
    expect((await call('/api/admin/settings', { ordersOpen: false })).status).toBe(200);
    expect((await (await call('/api/config')).json() as { ordersOpen: boolean }).ordersOpen).toBe(false);
    expect((await call('/api/orders', { brief, requestId: crypto.randomUUID(), honeypot: '' })).status).toBe(503);
    expect((await call('/api/admin/settings', { ordersOpen: true })).status).toBe(200);
    await create();
  });
});

describe('server production/payment/version state machine', () => {
  it('blocks unpaid production and unreviewed delivery, completes a fictional order, invalidates stale review', async () => {
    let order = await create();
    await action(order, 'generated', { version: 1 }, 422);
    expect((await call(`/api/admin/orders/${order.reference}/payment-link`)).status).toBe(422);
    order = await scope(order);
    const link = await (await call(`/api/admin/orders/${order.reference}/payment-link`)).json() as { url: string };
    expect(link.url).toContain('https://www.paynow.co.zw/Payment/Link/?q=');
    await action(order, 'verify_payment', { providerTransactionId: 'TEST-1', reference: order.reference, currency: 'ZWL', grossCents: 2000, feeCents: 0, status: 'paid', checkedInPaynow: true }, 422);
    await action(order, 'verify_payment', { providerTransactionId: 'TEST-1', reference: order.reference, currency: 'USD', grossCents: 2000, feeCents: 0, status: 'paid', checkedInPaynow: false }, 422);
    order = await pay(order);
    expect(order.payment?.netCents).toBe(1930); expect(order.payment?.settledCents).toBe(0);
    order = await action(order, 'generated', { version: 1 });
    await action(order, 'deliver', { version: 1, channel: 'Fictional WhatsApp handover' }, 422);
    order = await action(order, 'review', { version: 1, confirmed: true });
    order = await action(order, 'generated', { version: 1 });
    expect(order.reviewedVersion).toBeNull(); expect(order.productionStatus).toBe('generated');
    await action(order, 'deliver', { version: 1, channel: 'Fictional WhatsApp handover' }, 422);
    order = await action(order, 'review', { version: 1, confirmed: true });
    order = await action(order, 'deliver', { version: 1, channel: 'Fictional WhatsApp handover' });
    expect(order.deliveredAt).toBeTruthy();
    await action(order, 'generated', { version: 1 }, 422);
    order = await action(order, 'revise', { approvedBrief: { ...brief, tagline: 'Customer approved revision' }, reason: 'customer_revision', preset: 'editorial' });
    expect(order.contentVersion).toBe(2); expect(order.revisionUsed).toBe(true); expect(order.reviewedVersion).toBeNull(); expect(order.deliveredAt).toBeNull();
    await action(order, 'deliver', { version: 1, channel: 'Fictional' }, 409);
    await action(order, 'deliver', { version: 2, channel: 'Fictional' }, 422);
    await action(order, 'revise', { approvedBrief: brief, reason: 'customer_revision', preset: 'editorial' }, 422);
    order = await action(order, 'revise', { approvedBrief: brief, reason: 'operator_correction', preset: 'botanical' });
    expect(order.contentVersion).toBe(3); expect(order.revisionUsed).toBe(true);
    order = await action(order, 'generated', { version: 3 });
    order = await action(order, 'review', { version: 3, confirmed: true });
    order = await action(order, 'deliver', { version: 3, channel: 'Fictional WhatsApp handover' });
    order = await action(order, 'settlement', { settledCents: 1930 });
    expect(order.events.filter(event => event.action === 'deliver')).toHaveLength(2);
    expect(order.payment?.settledAt).toBeTruthy();
    const listed = await (await call('/api/admin/orders')).json() as { metrics: ReturnType<typeof metricsFor> };
    expect(listed.metrics).toEqual({ submitted: 0, paid: 0, grossCents: 0, feeCents: 0, netCents: 0, settledCents: 0, delivered: 0 });
    expect(metricsFor([{ ...order, isTest: false }])).toMatchObject({ submitted: 1, paid: 1, grossCents: 2000, feeCents: 70, netCents: 1930, settledCents: 1930, delivered: 1 });
  });
  it('prevents duplicate transaction IDs with a database UNIQUE constraint, including case variants', async () => {
    const first = await pay(await scope(await create()), 'TEST-TX-UNIQUE');
    const second = await scope(await create());
    await action(second, 'verify_payment', { providerTransactionId: 'test-tx-unique', reference: second.reference, currency: 'USD', grossCents: 2000, feeCents: 0, status: 'paid', checkedInPaynow: true }, 409);
    expect((await (await call(`/api/admin/orders/${second.reference}`)).json() as { order: Order }).order.payment).toBeNull();
    expect(first.paymentStatus).toBe('verified');
  });
  it('uses optimistic concurrency and preserves customer revision allowance for operator corrections', async () => {
    const stale = await scope(await create());
    let order = await pay(stale);
    await action(stale, 'notes', { notes: 'Stale edit' }, 409);
    order = await action(order, 'revise', { approvedBrief: brief, reason: 'operator_correction', preset: 'editorial' });
    expect(order.revisionUsed).toBe(false); expect(order.contentVersion).toBe(2);
    await action(order, 'mark_test', { isTest: false }, 422);
  });
  it('allows an operator to correct approved scope before payment without allowing unpaid production', async () => {
    let order = await scope(await create());
    order = await action(order, 'revise', { approvedBrief: { ...brief, businessName: 'Corrected Sample Salon' }, reason: 'operator_correction', preset: 'botanical' });
    expect(order.paymentStatus).toBe('pending'); expect(order.contentVersion).toBe(2); expect(order.revisionUsed).toBe(false);
    await action(order, 'generated', { version: 2 }, 422);
    await action(order, 'revise', { approvedBrief: brief, reason: 'customer_revision', preset: 'botanical' }, 422);
  });
  it('ties local logo fingerprints to a version and rejects missing or changed logo generation', async () => {
    let order = await pay(await scope(await create()));
    const logoSha256 = 'a'.repeat(64);
    await action(order, 'generated', { version: 1, logoSha256 }, 422);
    order = await action(order, 'revise', { approvedBrief: brief, reason: 'operator_correction', preset: 'botanical', logoSha256 });
    expect(order.contentVersion).toBe(2); expect(order.logoSha256).toBe(logoSha256);
    await action(order, 'generated', { version: 2 }, 422);
    await action(order, 'generated', { version: 2, logoSha256: 'b'.repeat(64) }, 422);
    order = await action(order, 'generated', { version: 2, logoSha256 });
    order = await action(order, 'review', { version: 2, confirmed: true });
    order = await action(order, 'revise', { approvedBrief: brief, reason: 'operator_correction', preset: 'botanical', logoSha256: null });
    expect(order.contentVersion).toBe(3); expect(order.logoSha256).toBeNull(); expect(order.reviewedVersion).toBeNull();
    expect(order.revisionUsed).toBe(false);
    order = await action(order, 'generated', { version: 3 });
    expect(order.generatedVersion).toBe(3);
  });
  it('exports private records and protects spreadsheet formulas; retention preserves paid records', async () => {
    const unpaid = await create(crypto.randomUUID(), { businessName: '=1+1' });
    const paid = await pay(await scope(await create()));
    const old = new Date(Date.now() - 200 * 86400000).toISOString();
    await env.DB.prepare('UPDATE orders SET created_at = ?, updated_at = ?').bind(old, old).run();
    const csv = await (await call('/api/admin/export?format=csv')).text();
    expect(csv).toContain('"\'=1+1"'); expect(csv).toContain('feeCents');
    const jsonResponse = await call('/api/admin/export?format=json');
    expect(jsonResponse.headers.get('Cache-Control')).toBe('no-store');
    expect((await jsonResponse.json() as { orders: Order[] }).orders).toHaveLength(2);
    expect((await call('/api/admin/retention', { confirmed: false })).status).toBe(422);
    expect(await (await call('/api/admin/retention', { confirmed: true })).json()).toMatchObject({ deleted: 1 });
    expect((await call(`/api/admin/orders/${unpaid.reference}`)).status).toBe(404);
    expect((await call(`/api/admin/orders/${paid.reference}`)).status).toBe(200);
  });
});

describe('authentication and production fail closed', () => {
  it('denies every admin surface without Access and does not serve assets first', async () => {
    const assetFetch = vi.fn(async () => new Response('must never be served'));
    const production = { ...env, APP_ENV: 'production', LOCAL_AUTH: 'enabled', ASSETS: { fetch: assetFetch } as unknown as Fetcher };
    for (const path of ['/admin', '/admin/', '/admin/deep', '/api/admin', '/api/admin/orders', '/api/admin/export?format=json', '/api/admin/settings']) {
      const response = await handleRequest(new Request('https://studio.example' + path), production);
      expect(response.status).toBe(403); expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
    expect(assetFetch).not.toHaveBeenCalled();
  });
  it('refuses runtime local auth flags at public hosts and through proxy headers', async () => {
    expect(isLocalDevelopment(new Request('https://studio.example/admin'), env)).toBe(false);
    expect(isLocalDevelopment(new Request(origin + '/admin', { headers: { 'cf-connecting-ip': '1.2.3.4' } }), env)).toBe(false);
    expect(isLocalDevelopment(new Request(origin + '/admin', { headers: { 'forwarded': 'for=1.2.3.4' } }), env)).toBe(false);
    expect(isLocalDevelopment(new Request(origin + '/admin', { headers: { 'cf-connecting-ip': '127.0.0.1', 'x-forwarded-host': '127.0.0.1:5173' } }), env)).toBe(true);
    expect(isLocalDevelopment(new Request(origin + '/admin', { headers: { 'cf-connecting-ip': '127.0.0.1', 'x-forwarded-host': 'public-tunnel.example' } }), env)).toBe(false);
    expect(await authorize(new Request('https://studio.example/admin'), env)).toBe(false);
    const production = { ...env, APP_ENV: 'production', PUBLIC_ORIGIN: 'https://studio.example', ORDERS_OPEN: 'true' };
    const response = await handleRequest(new Request('https://studio.example/api/config'), production);
    const config = await response.json() as Record<string, unknown>;
    expect(config.ordersOpen).toBe(false); expect(config.local).toBe(false);
    expect(Object.keys(config)).not.toContain('TURNSTILE_SECRET_KEY');
    expect((await handleRequest(new Request('https://studio.example/api/orders', { method: 'POST', headers: { origin: 'https://studio.example', 'content-type': 'application/json' }, body: '{}' }), production)).status).toBe(503);
  });
  it('validates Access JWT signatures, issuer, audience, expiration and exact owner email', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey); jwk.kid = 'test-key'; jwk.alg = 'RS256'; jwk.use = 'sig';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'content-type': 'application/json' } })));
    const securedEnv = { ...env, APP_ENV: 'production', ACCESS_TEAM_DOMAIN: 'unit-test.cloudflareaccess.com', ACCESS_AUD: 'test-application-audience', OWNER_EMAIL: 'owner@example.com' };
    const sign = (changes: Record<string, unknown> = {}) => new SignJWT({ email: 'owner@example.com', type: 'app', ...changes }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuer('https://unit-test.cloudflareaccess.com').setAudience('test-application-audience').setSubject('owner-id').setIssuedAt().setExpirationTime('5m').sign(privateKey);
    const jwtRequest = (token: string) => new Request('https://studio.example/api/admin/orders', { headers: { 'Cf-Access-Jwt-Assertion': token } });
    const valid = await sign();
    expect(await authorize(jwtRequest(valid), securedEnv)).toBe(true);
    expect(await authorize(jwtRequest(await sign({ email: 'stranger@example.com' })), securedEnv)).toBe(false);
    expect(await authorize(jwtRequest(valid), { ...securedEnv, ACCESS_AUD: 'wrong-audience' })).toBe(false);
    expect(await authorize(jwtRequest(valid), { ...securedEnv, ACCESS_TEAM_DOMAIN: 'other-team.cloudflareaccess.com' })).toBe(false);
    const expired = await new SignJWT({ email: 'owner@example.com', type: 'app' }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuer('https://unit-test.cloudflareaccess.com').setAudience('test-application-audience').setSubject('owner-id').setIssuedAt().setExpirationTime(1).sign(privateKey);
    expect(await authorize(jwtRequest(expired), securedEnv)).toBe(false);
    const parts = valid.split('.'); parts[1] = btoa(JSON.stringify({ email: 'owner@example.com' }));
    expect(await authorize(jwtRequest(parts.join('.')), securedEnv)).toBe(false);
    expect((await handleRequest(jwtRequest(valid), securedEnv)).status).toBe(200);
  });
  it('rejects correctly signed tokens with a non-application type or missing required claims', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey); jwk.kid = 'claim-test-key'; jwk.alg = 'RS256'; jwk.use = 'sig';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'content-type': 'application/json' } })));
    const issuer = 'https://claim-test.cloudflareaccess.com';
    const securedEnv = { ...env, APP_ENV: 'production', ACCESS_TEAM_DOMAIN: 'claim-test.cloudflareaccess.com', ACCESS_AUD: 'claim-test-audience', OWNER_EMAIL: 'owner@example.com' };
    const now = Math.floor(Date.now() / 1000);
    const claims: Record<string, unknown> = { iss: issuer, aud: securedEnv.ACCESS_AUD, exp: now + 300, iat: now, sub: 'owner-id', email: 'owner@example.com', type: 'app' };
    const signedRequest = async (payload: Record<string, unknown>) => new Request('https://studio.example/api/admin/orders', {
      headers: { 'Cf-Access-Jwt-Assertion': await new SignJWT(payload).setProtectedHeader({ alg: 'RS256', kid: 'claim-test-key' }).sign(privateKey) },
    });
    expect((await handleRequest(await signedRequest(claims), securedEnv)).status).toBe(200);
    for (const type of ['org', 'service']) {
      expect((await handleRequest(await signedRequest({ ...claims, type }), securedEnv)).status, `Reject token type ${type}`).toBe(403);
    }
    for (const claim of ['exp', 'iat', 'email', 'sub', 'type']) {
      const incomplete = { ...claims }; delete incomplete[claim];
      expect((await handleRequest(await signedRequest(incomplete), securedEnv)).status, `Reject missing ${claim}`).toBe(403);
    }
  });
  it('rejects cross-origin admin mutations even with a valid owner token and preserves the saved pause', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey); jwk.kid = 'mutation-test-key'; jwk.alg = 'RS256'; jwk.use = 'sig';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'content-type': 'application/json' } })));
    const productionOrigin = 'https://studio.example';
    const securedEnv = { ...env, APP_ENV: 'production', PUBLIC_ORIGIN: productionOrigin, ACCESS_TEAM_DOMAIN: 'mutation-test.cloudflareaccess.com', ACCESS_AUD: 'mutation-test-audience', OWNER_EMAIL: 'owner@example.com' };
    const token = await new SignJWT({ email: 'owner@example.com', type: 'app' }).setProtectedHeader({ alg: 'RS256', kid: 'mutation-test-key' }).setIssuer('https://mutation-test.cloudflareaccess.com').setAudience(securedEnv.ACCESS_AUD).setSubject('owner-id').setIssuedAt().setExpirationTime('5m').sign(privateKey);
    const mutate = (ordersOpen: boolean, requestOrigin: string | null, requestHost = productionOrigin, fetchSite?: string) => {
      const headers = new Headers({ 'Content-Type': 'application/json', 'Cf-Access-Jwt-Assertion': token });
      if (requestOrigin !== null) headers.set('Origin', requestOrigin);
      if (fetchSite) headers.set('Sec-Fetch-Site', fetchSite);
      return handleRequest(new Request(requestHost + '/api/admin/settings', { method: 'POST', headers, body: JSON.stringify({ ordersOpen }) }), securedEnv);
    };
    expect((await mutate(false, productionOrigin)).status).toBe(200);
    for (const attempt of [
      () => mutate(true, 'https://evil.example'),
      () => mutate(true, null),
      () => mutate(true, productionOrigin, 'https://other-host.example'),
      () => mutate(true, productionOrigin, productionOrigin, 'cross-site'),
    ]) {
      expect((await attempt()).status).toBe(403);
      expect(await env.DB.prepare("SELECT value FROM settings WHERE key = 'orders_open'").first('value')).toBe('false');
    }
  });
});

describe('production intake abuse controls', () => {
  const production = (): Env => ({ ...env, APP_ENV: 'production', PUBLIC_ORIGIN: 'https://studio.example', SUPPORT_EMAIL: 'help@example.com', SUPPORT_WHATSAPP: '+263770000000', ACCESS_TEAM_DOMAIN: 'test.cloudflareaccess.com', ACCESS_AUD: 'application-audience', OWNER_EMAIL: 'owner@example.com', TURNSTILE_SITE_KEY: 'public-site-key', TURNSTILE_SECRET_KEY: 'private-test-secret', RATE_LIMIT_SALT: 'fictional-test-salt-at-least-32-characters' });
  const submission = (id = crypto.randomUUID(), token = 'challenge-token') => new Request('https://studio.example/api/orders', { method: 'POST', headers: { origin: 'https://studio.example', 'content-type': 'application/json', 'CF-Connecting-IP': '203.0.113.5' }, body: JSON.stringify({ brief, requestId: id, honeypot: '', turnstileToken: token }) });
  it('requires successful challenge with the correct hostname and order action', async () => {
    for (const challengeResult of [{ success: false }, { success: true, hostname: 'evil.example', action: 'order' }, { success: true, hostname: 'studio.example', action: 'wrong-action' }]) {
      vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(challengeResult))));
      expect((await handleRequest(submission(), production())).status).toBe(422);
    }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, hostname: 'studio.example', action: 'order' }))));
    const response = await handleRequest(submission(), production());
    expect(response.status).toBe(201);
    const reference = (await response.json() as { reference: string }).reference;
    const stored = await env.DB.prepare('SELECT data FROM orders WHERE reference = ?').bind(reference).first<{ data: string }>();
    expect((JSON.parse(stored!.data) as Order).isTest).toBe(false);
    const config = await handleRequest(new Request('https://studio.example/api/config'), production());
    const text = await config.text(); expect(text).not.toContain('private-test-secret'); expect(text).not.toContain('fictional-test-salt');
  });
  it('uses a persistent atomic D1 hourly rate limit and stores no raw IP address', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, hostname: 'studio.example', action: 'order' }))));
    for (let index = 0; index < 8; index++) expect((await handleRequest(submission(), production())).status).toBe(201);
    expect((await handleRequest(submission(), production())).status).toBe(429);
    const rows = await env.DB.prepare('SELECT * FROM intake_rate_limits').all<{ key: string; count: number }>();
    expect(rows.results).toHaveLength(1); expect(rows.results[0].key).toMatch(/^[a-f0-9]{64}$/); expect(rows.results[0].count).toBe(9);
  });
  it('fails closed for missing secrets or unavailable challenge verification', async () => {
    expect((await handleRequest(submission(), { ...production(), TURNSTILE_SECRET_KEY: '' })).status).toBe(503);
    expect((await handleRequest(submission(), { ...production(), RATE_LIMIT_SALT: 'short' })).status).toBe(503);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Simulated challenge service unavailable'); }));
    expect((await handleRequest(submission(), production())).status).toBe(503);
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM orders').first('count')).toBe(0);
  });
});

describe('shared validation and documented Paynow encoding', () => {
  it('accepts Unicode text, exact decimal cents and eight services without truncation', () => {
    const unicode = { ...brief, businessName: 'Māori 日本語 Salon', services: Array.from({ length: 8 }, (_, i) => ({ name: `Service ${i}`, priceCents: 999999 })) };
    expect(validateBrief(unicode).brief).toEqual(unicode);
    expect(validateBrief({ ...unicode, services: [...unicode.services, unicode.services[0]] }).brief).toBeNull();
    expect(moneyToCents('20.01')).toBe(2001); expect(moneyToCents('1e3')).toBeNull(); expect(moneyToCents('1.001')).toBeNull(); expect(moneyToCents('-1')).toBeNull();
  });
  it('encodes each argument then base64 then q, locks amount/reference and invents no currency', () => {
    const url = new URL(paynowLink({ reference: 'W3-20261012-ABCDEF123456', priceCents: 2000, currency: 'USD' }, 'tamutswamatondo04@gmail.com'));
    expect(atob(url.searchParams.get('q')!)).toBe('search=tamutswamatondo04%40gmail.com&amount=20.00&reference=W3-20261012-ABCDEF123456&l=1');
    expect(atob(url.searchParams.get('q')!)).not.toContain('currency');
    expect(() => paynowLink({ reference: 'bad', priceCents: 1, currency: 'USD' }, 'merchant@example.com')).toThrow(HttpError);
  });
});
