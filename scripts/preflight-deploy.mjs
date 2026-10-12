import { readFile } from 'node:fs/promises';
const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const database = config.d1_databases?.find(binding => binding.binding === 'DB');
if (!database || !/^[a-f0-9-]{36}$/i.test(database.database_id) || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(database.database_id)) {
  throw new Error('Create the owner’s Cloudflare D1 database and set its actual database_id in wrangler.jsonc before deploying. See docs/DEPLOYMENT.md.');
}
if (config.vars.APP_ENV !== 'production' || config.vars.LOCAL_AUTH || config.preview_urls !== false) {
  throw new Error('Deploy only the production configuration with preview_urls:false and no LOCAL_AUTH.');
}
console.log('Production configuration selected. Missing Access or intake settings still fail closed in the Worker.');
