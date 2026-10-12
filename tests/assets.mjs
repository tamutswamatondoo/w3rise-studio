import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const directory=new URL('../dist/client/',import.meta.url);
const forbidden=['TURNSTILE_SECRET_KEY','RATE_LIMIT_SALT','Cf-Access-Jwt-Assertion','Fictional QA Owner','qa@example.invalid','QA-FICTIONAL-','QA-SIMULATED-','TEST-PAYNOW-','workflow-evidence.json'];
let checked=0;
async function walk(folder){for(const entry of await readdir(folder,{withFileTypes:true})){const target=new URL(entry.name+(entry.isDirectory()?'/':''),folder);if(entry.isDirectory()){assert(!['private','tests','worker','.wrangler'].includes(entry.name));await walk(target);}else{assert(!entry.name.endsWith('.map'));assert(!/^W3-\d{8}-/.test(entry.name));if(/\.(js|css|html|svg|json|txt)$/.test(entry.name)){const text=await readFile(target,'utf8');for(const value of forbidden)assert(!text.includes(value),`${path.basename(target.pathname)} contains private fixture/config marker ${value}`);checked++;}}}}
await walk(directory);console.log(`Public asset audit passed (${checked} text assets): no private fixture data, server secret/token markers, source maps or customer deliverables.`);
