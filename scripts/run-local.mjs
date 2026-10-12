// Keep development runtime logs/registries inside the ignored workspace directory.
// Authentication and production Wrangler configuration retain their normal locations.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const [mode, ...extra] = process.argv.slice(2);
const commands = {
  dev: ['vite/bin/vite.js', '--host', '127.0.0.1'],
  build: ['vite/bin/vite.js', 'build'],
  migrate: ['wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'studio-db', '--local', '--config', 'wrangler.local.jsonc'],
};
if (!(mode in commands)) throw new Error('Choose dev, build or migrate.');
const [bin, ...args] = commands[mode];
const child = spawn(process.execPath, [path.join(root, 'node_modules', bin), ...args, ...extra], {
  cwd: root, stdio: 'inherit', env: {
    ...process.env,
    WRANGLER_LOG_PATH: path.join(root, '.wrangler', 'logs'),
    WRANGLER_REGISTRY_PATH: path.join(root, '.wrangler', 'registry'),
    MINIFLARE_REGISTRY_PATH: path.join(root, '.wrangler', 'registry'),
    WRANGLER_SEND_METRICS: 'false',
  },
});
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
