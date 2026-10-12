// Run after `npm run build`. Executes the exact production bundle inside workerd.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';

const contents = await readFile(new URL('../dist/w3rise_studio/index.js', import.meta.url), 'utf8');
const mf = new Miniflare({ workers: [{ config: {
  name: 'production-auth-test', compatibilityDate: '2026-10-01', compatibilityFlags: ['nodejs_compat'],
  manifest: { mainModule: 'index.js', modules: { 'index.js': { type: 'esm', contents } } },
  env: {
    DB: { type: 'd1', id: 'production-auth-test-db' },
    APP_ENV: { type: 'json', value: 'local' },
    LOCAL_AUTH: { type: 'json', value: 'enabled' },
    ORDERS_OPEN: { type: 'json', value: 'true' },
  },
} }] });
try {
  const db = await mf.getD1Database('DB');
  const sql = await readFile(new URL('../migrations/0001_orders.sql', import.meta.url), 'utf8');
  for (const statement of sql.split(';').filter(value => value.trim())) await db.prepare(statement).run();
  for (const path of ['/admin', '/admin/deep', '/api/admin/orders', '/api/admin/export?format=json']) {
    const response = await mf.dispatchFetch('http://127.0.0.1' + path);
    assert.equal(response.status, 403, `Production bundle must reject runtime local-auth flags on ${path}`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  const response = await mf.dispatchFetch('http://127.0.0.1/api/admin/settings', { method: 'POST', headers: { origin: 'http://127.0.0.1', 'content-type': 'application/json' }, body: JSON.stringify({ ordersOpen: true }) });
  assert.equal(response.status, 403, 'Production bundle must deny admin mutations with runtime local-auth flags');
  const config = await (await mf.dispatchFetch('http://127.0.0.1/api/config')).json();
  assert.equal(config.local, false, 'Local authentication must be compiled out');
  assert.equal(config.ordersOpen, false, 'Production intake must fail closed when configuration is absent');
  console.log('Production bundle: local authentication compiled out; pages, APIs and mutations denied; intake paused without configuration.');
} finally { await mf.dispose(); }
