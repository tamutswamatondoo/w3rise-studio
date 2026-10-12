// Anonymous checks for a real deployment while intake is deliberately paused.
// Sends no customer brief, credentials or payment data.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const target = new URL(process.argv[2] || '');
assert.equal(target.protocol, 'https:', 'Supply the actual HTTPS deployment origin.');
assert.equal(target.href, target.origin + '/', 'Supply an origin without a path, query, fragment or credentials.');
assert.equal(target.username + target.password, '', 'Do not put credentials in the URL.');
const origin = target.origin;
const results = [];
const request = (path, options = {}) => fetch(origin + path, {
  ...options, redirect: 'manual', signal: AbortSignal.timeout(20_000),
});
const record = (path, response) => results.push({ path, status: response.status });

const configuration = await request('/api/config');
record('/api/config', configuration);
assert.equal(configuration.status, 200, 'Public configuration must load from the remote database.');
const config = await configuration.json();
assert.equal(config.local, false, 'Production must never enable local authentication.');
assert.equal(config.ordersOpen, false, 'This check requires intake to remain paused.');

await Promise.all(['/', '/order', '/terms', '/privacy'].map(async path => {
  const response = await request(path);
  record(path, response);
  assert.equal(response.status, 200, `${path} must load.`);
  assert.match(response.headers.get('content-type') || '', /text\/html/);
  assert.match(response.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
  const html = await response.text();
  assert.ok(html.includes(`<link rel="canonical" href="${origin}${path}">`), `${path} needs its actual canonical address.`);
  assert.ok(html.includes(`${origin}/samples/share.png`), 'Sharing metadata must use the real origin.');
}));

function denied(path, response) {
  record(path, response);
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const destination = new URL(response.headers.get('location') || '', origin);
    assert.ok(destination.hostname.endsWith('.cloudflareaccess.com'), `${path} must redirect only to Access sign-in.`);
    return;
  }
  assert.ok([401, 403].includes(response.status), `${path} must deny an anonymous visitor (received ${response.status}).`);
  assert.match(response.headers.get('cache-control') || '', /no-store/, `${path} must not cache private responses.`);
}
await Promise.all(['/admin', '/admin/nested', '/api/admin', '/api/admin/orders', '/api/admin/export?format=json', '/api/admin/export?format=csv'].map(async path => denied(path, await request(path))));

for (const path of ['/samples/sage-price-list.svg', '/samples/form-feature.svg', '/samples/share.png', '/favicon.svg']) {
  const response = await request(path);
  record(path, response);
  assert.equal(response.status, 200, `${path} must load.`);
  assert.match(response.headers.get('content-type') || '', /image\//);
}

const headers = { 'Content-Type': 'application/json', Origin: origin };
// If a broken authorization guard allowed this action, it could only pause intake.
denied('/api/admin/settings [POST]', await request('/api/admin/settings', {
  method: 'POST', headers, body: JSON.stringify({ ordersOpen: false }),
}));
// An empty body cannot create a valid order, even if the pause has regressed.
const intake = await request('/api/orders', { method: 'POST', headers, body: '{}' });
record('/api/orders [empty POST]', intake);
assert.equal(intake.status, 503, 'Paused intake must refuse submission.');
assert.match((await intake.json()).error, /paused/i);

await mkdir('artifacts/private', { recursive: true });
await writeFile('artifacts/private/deployment-evidence.json', JSON.stringify({
  verifiedAt: new Date().toISOString(), origin, local: config.local, ordersOpen: config.ordersOpen,
  anonymousChecksOnly: true, customerBriefsSubmitted: 0, results,
}, null, 2));
console.log(`Paused deployment verified: ${origin}; ${results.length} checks passed; no customer brief submitted.`);
