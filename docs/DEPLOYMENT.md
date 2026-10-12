# Cloudflare deployment

Deployed on 12 October 2026 at **https://w3rise-studio.w3rise-studio.workers.dev**, Worker version `046cccf9-f62d-4f2e-a963-2cbe2e071a4f`, from source commit `e866828bb4a9f913727e4a63fa24796d79b8ff58`. The authenticated owner-controlled account and actual `studio-db` D1 binding are recorded in `wrangler.jsonc`; the remote migration is applied. Owner/support identity, contacts and a cryptographically random rate-limit salt are encrypted Worker bindings; public support links and CAT hours are verified. Intake is paused in configuration and the persistent database setting. Anonymous operator routes return 403 because Access configuration is still missing; owner sign-in is not yet available. No customer orders or payment records were created remotely.

Account connection, database creation, migrations and the first paused deployment below are already complete for this installation. Owner identity/contact details and business policies have been supplied; continue with Access, Turnstile, actual Paynow USD/merchant checks and acceptance checks. The owner has authorized the fictional production rehearsal and opening only after all checks pass. Keep the Workers Free plan; do not enable paid subscriptions. No domain purchase is needed.

## 1. Verify the local build

Run the README setup and `npm.cmd run verify`. The official [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/) runs Worker code in `workerd` during development and builds the frontend and Worker together. The project uses separate local and production Wrangler configurations. Do not deploy `wrangler.local.jsonc`, copy its `LOCAL_AUTH` setting into production, or expose local development to a network.

The deploy script rejects the unset database ID before contacting Cloudflare. Development logs/registries stay under ignored `.wrangler/`; account login credentials retain Wrangler's normal private configuration location. This repository contains no replacement credentials.

## 2. Connect the correct account and D1

Use a Cloudflare account the owner controls, then authenticate interactively:

```powershell
npx.cmd wrangler login
npx.cmd wrangler whoami
npx.cmd wrangler d1 create studio-db
```

For a fresh installation only, replace the `account_id` and `database_id` in **production** `wrangler.jsonc` with that account and database's actual IDs. The current installation already has both; do not create another database or replace its ID when resuming setup. Keep binding `DB` and migration directory `migrations`. Confirm the account and database before applying remote changes:

```powershell
npm.cmd run db:migrate:remote
```

Local migrations and test records do not populate the remote database. Preserve the dependency lockfile and use `npm.cmd ci` on another machine.

## 3. Configure the production values

Set non-sensitive server-side values in `wrangler.jsonc`; configure owner identity and contact values privately as encrypted Worker bindings. `PUBLIC_ORIGIN` is already the actual deployed HTTPS origin. Missing configuration keeps intake closed and the private desk inaccessible. On 12 October 2026 the owner supplied the operator/support email and public WhatsApp, and confirmed the supplied Paynow merchant recipient. Response hours are Monday–Friday, 09:00–17:00 CAT (Africa/Harare); timing is confirmed individually after brief review and delivery is through WhatsApp. Owner identity/contact values must not be committed to this public repository. Access and production Turnstile remain incomplete; the four owner/contact/rate-limit secret bindings are installed. The owner cannot currently access the Paynow merchant account. Actual USD checkout and visibility of transactions, fees and settlement remain unverified and block customer launch.

| Value | Required action |
| --- | --- |
| `APP_ENV` | Keep `production`. |
| `ORDERS_OPEN` | Keep `false` during configuration and verification. The owner authorized a controlled fictional submission, then opening only after all launch checks pass. |
| `PAYNOW_MERCHANT_EMAIL` | Owner confirmed the supplied recipient but cannot access the merchant account. Restore access and verify actual USD checkout, transactions, fees and settlement before customer launch. |
| `SUPPORT_WHATSAPP` | Owner-supplied public number, stored privately as an encrypted Worker binding. |
| `SUPPORT_EMAIL` | Owner-supplied support/privacy email, stored privately as an encrypted Worker binding. |
| `RESPONSE_HOURS` | Monday–Friday, 09:00–17:00 CAT (Africa/Harare). Confirm timing individually after brief review and deliver through WhatsApp. |
| `RETENTION_DAYS` | Set `90` for manual cleanup of eligible unpaid briefs, measured from their last update. This does not delete paid records or local files. |
| `OWNER_EMAIL` | Owner-selected operator, stored privately as an encrypted Worker binding. The Access Allow policy must match this exact address. |
| `ACCESS_TEAM_DOMAIN` | Zero Trust team hostname, e.g. `your-team.cloudflareaccess.com`. |
| `ACCESS_AUD` | Audience tag of the Access application covering both private paths. |
| `TURNSTILE_SITE_KEY` | Public site key for the production hostname. |
| `PUBLIC_ORIGIN` | Actual HTTPS origin after the first paused deployment; no trailing slash. |

`SUPPORT_WHATSAPP` must use `+` followed by the country code and number, without spaces. Intake remains closed unless the production contact, Access, origin, merchant and abuse-protection configuration is complete.

`OWNER_EMAIL`, `SUPPORT_EMAIL` and `SUPPORT_WHATSAPP` are intentionally omitted from tracked `vars`. Set them through the Cloudflare encrypted configuration process; normal Wrangler deployments preserve existing secrets. Do not reintroduce these keys as plaintext `vars`, which can conflict with their encrypted bindings. The API intentionally publishes the two customer support values on the public website; the operator identity is not included in public configuration. Website contact publication does not authorize publishing the values in GitHub history.

Create a [Turnstile widget](https://developers.cloudflare.com/turnstile/get-started/) restricted to `w3rise-studio.w3rise-studio.workers.dev`. Set its public site key in `TURNSTILE_SITE_KEY`. In the Cloudflare dashboard, open **Workers & Pages → w3rise-studio → Settings → Variables and Secrets** and add `TURNSTILE_SECRET_KEY` with type **Secret**, then deploy the changes. Follow the official [encrypted configuration instructions](https://developers.cloudflare.com/workers/configuration/secrets/). Keep the secret key out of `VITE_*` values and version control. If an agent performs Turnstile retrieval through a CLI, use the approved canonical Wrangler outside the project; do not pass secrets through project package scripts or package resolution.

`RATE_LIMIT_SALT` is already an encrypted binding in this installation, created from 32 cryptographically random bytes without printing or writing its value to disk. Preserve it during subsequent deployments. For a fresh installation only, create a cryptographically random value of at least 32 characters and store it as a Secret through the private configuration process. It salts short-lived visitor rate-limit hashes; do not reuse a personal password.

Enter secrets only through the private configuration process or the Cloudflare dashboard's encrypted Worker secret fields. Never send them in chat, command arguments, Git or screenshots. Account IDs, D1 IDs, the Access audience and the Turnstile site key are configuration identifiers, not substitute credentials. No missing secret has been filled with a placeholder.

The site key is intentionally public. A secret key, Cloudflare API token and Access JWT must stay outside browser bundles. Local optional values belong in the ignored `.dev.vars` file, following the environment example. Do not use Turnstile test keys in production.

## 4. Publish while orders are paused

```powershell
npm.cmd run deploy
```

Record the returned `https://w3rise-studio.<account-subdomain>.workers.dev` origin, set `PUBLIC_ORIGIN`, and rebuild/redeploy. Only then should the site emit the canonical address and absolute sharing metadata. Keep `workers_dev: true` and `preview_urls: false`. Cloudflare now calls preview deployments [Version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/); explicitly disabling them avoids an unprotected alternate URL.

This installation has already completed that second deployment with the real origin. After changing owner configuration or Access identifiers, redeploy while the D1 pause remains in place. Repeat the safe anonymous checks:

```powershell
npm.cmd run test:deployed -- https://w3rise-studio.w3rise-studio.workers.dev
```

These checks require paused intake, inspect public pages/assets and metadata, and test anonymous private-route denial. They send only an empty invalid brief and an unauthorized request to pause intake; they submit no customer information. Evidence stays in ignored `artifacts/private/`.

## 5. Protect the desk and its API

Enable Zero Trust on the Free plan. Create **one self-hosted Access application** with public destinations for the real hostname's `/admin*` and `/api/admin*` paths. These broad matches cover the root routes and nested routes. Add an Allow policy restricted to the owner's exact email, using a configured identity provider or email one-time PIN. Copy its audience tag into `ACCESS_AUD`. Do not use an Everyone bypass on these destinations.

Cloudflare's [Workers Access documentation](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) explicitly supports `workers.dev` hostnames and paths. [Application path rules](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/) explain wildcard matching and more-specific policy precedence. If the dashboard's domain selector omits `workers.dev`, use its custom input or the Access API's public destination `uri` fields for the same two paths; do not substitute a domain purchase.

The Worker independently validates the signed Access JWT, expected issuer, audience and owner email. Missing configuration denies production access. Protect these paths on **every** subsequently added custom domain or route, or disable unused hostnames; hostname policies cover only their configured URLs. Confirm there are no Version URLs. Test both the page and API from a signed-out browser and with the wrong identity before enabling intake.

Set `OWNER_EMAIL`, `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` from the actual selected owner and Access application, then redeploy. Verify the intended owner can load the desk and retrieve its queue; a different identity and a signed-out browser must be unable to read records, export or mutate orders. The current 403 checks establish fail-closed behavior, not a completed Access sign-in flow.

## 6. Public acceptance and opening intake

Verify public samples, real contact actions, privacy/terms, operator authentication and denied unauthenticated mutations while intake stays paused. The public submission workflow and live Turnstile acceptance cannot be fully verified in that state; the complete fictional workflow has already passed locally.

The owner has already authorized one controlled fictional production test and opening intake only after all launch checks pass. Complete Access and production Turnstile before the technical rehearsal. Keep the launch unannounced, temporarily open intake from the owner desk, submit a clearly fictional brief and pause intake immediately afterward. Mark that record **fictional/test** in the desk before any simulated payment handling. Confirm all four generated files, revision and delivery gates; label payment, settlement and delivery records explicitly simulated and do not make a real payment for a technical test. This rehearsal cannot verify actual Paynow USD checkout or merchant access. Measure deployed CPU/errors and confirm access on all reachable hostnames. Keep the test record marked as a test and check live totals remain zero. Open intake for customers only after every launch check, including actual Paynow USD/merchant verification, passes, with the manual three-active-paid-order limit in effect. The persistent desk setting overrides `ORDERS_OPEN`; redeploying alone does not clear an existing pause. A failed or incomplete launch check keeps customer intake paused.

The owner has approved one consolidated revision within seven calendar days of first-draft receipt, case-by-case cancellation/refund handling, 90-day eligible unpaid cleanup, separate paid-record retention, 30-day downloaded-file/logo cleanup and three active paid orders. Confirm the published terms/privacy and operating instructions match these choices before testing. Revision deadlines, capacity, refunds and cleanup are manual responsibilities; the configuration guards do not enforce them or prove that an Access policy was created correctly. Follow [OPERATOR.md](OPERATOR.md) for the first genuine order and manual WhatsApp delivery.

## Codex Cloudflare tools

The official [Cloudflare agent setup](https://developers.cloudflare.com/agent-setup/prompt.md) was completed: all 17 skills from `cloudflare/skills` were installed globally at revision `c430dd965cea3a8faf0ef035e3b3d73b38518081`, and the `cloudflare` MCP server at `https://mcp.cloudflare.com/mcp` was added and authorized with OAuth. Global configuration is in `C:\Users\Tamutswa\.codex\config.toml`; skills are in `C:\Users\Tamutswa\.codex\skills`. These private user-level files are outside this repository. Restart Codex/the IDE extension to load the new tools. Wrangler login and MCP authorization are separate and both succeeded. The optional beta `cf` CLI was not needed for this Wrangler project.

At the final contact verification, the running Codex session still had no Cloudflare MCP tools loaded. Its separate in-app browser reached the Cloudflare sign-in page and did not share the earlier authorization session. Resume after restarting Codex/the IDE extension with the authorized MCP connection, or sign in privately to the dashboard for the owner setup above. No new API token, password or Turnstile secret should be sent in chat. Access and Turnstile are still pending; the working Wrangler deployment connection alone does not establish them.

## Free-tier limits and practical limits

Verified against official sources on 12 October 2026; check again at launch.

| Service | Free allowance relevant to this build |
| --- | --- |
| [Workers](https://developers.cloudflare.com/workers/platform/limits/) | 100,000 Worker requests/day, 10 ms CPU/request, 128 MB memory. Daily request allowance resets at midnight UTC. |
| [Static Assets](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) | Asset requests are free and unlimited when served without invoking the Worker; asset storage has no additional charge. `run_worker_first: true` currently invokes the Worker first for every request, so this build's traffic consumes the Worker allowance. |
| [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) | 5 million rows read/day, 100,000 rows written/day, 5 GB total storage. Scanned rows count, including rows not returned. |
| [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) | 10 databases/account, 500 MB/database on Free; seven-day Time Travel recovery. |
| [Zero Trust Free](https://www.cloudflare.com/plans/zero-trust-services/) | Up to 50 users; one owner fits the published Free allowance. |

These are platform allowances, not a throughput guarantee. JWT verification and database queries need deployed measurement against the 10 ms CPU budget. Generated files stay in the browser, reducing server work. Quota exhaustion can stop intake; monitor Workers errors and D1 usage, pause orders if necessary, and optimize before considering any paid plan. No paid plan is enabled by this source.

Workers Logs/Traces are currently disabled (`observability.enabled: false`); use aggregate dashboard metrics for the initial checks. Before real traffic, decide whether aggregate metrics are sufficient or adopt an owner-approved monitoring configuration that never records briefs, credentials, tokens or payment bodies. No log/trace coverage has been claimed.

## Backup, retention and maintenance

Export order/financial records from the private desk and keep exports and delivered files in an owner-controlled private location. The owner-selected backup folder and its three child folders have been created and verified; consult the ignored `.wrangler/owner-operations.json` for their actual location. Never copy that path, the exports or customer files into this repository. Exports contain personal information and are never for the public asset directory or Git. D1 [Time Travel](https://developers.cloudflare.com/d1/platform/limits/) is a short recovery window, not the owner's long-term backup policy.

Set the disclosed unpaid cleanup cutoff to 90 days. The explicit retention action removes only unpaid briefs without a provider transaction ID whose last update is older than that cutoff; no scheduled deletion runs. Paid D1 records remain preserved for manual review. Retain required paid business/tax records for at least six years from the last entry under section 37B of the Income Tax Act, and longer when applicable requirements or a legal hold require it; see [ZIMRA's record-keeping guidance](https://www.zimra.co.zw/domestic-taxes/corporate/record-keeping-explained). The current application preserves the whole paid order, not a separate financial-only archive.

Manually remove downloaded design files and customer logos after 30 days from final delivery, except evidence that must be retained for an applicable legal or unresolved-dispute requirement. Keep required financial records and exports separately; they are not covered by the design-file cleanup period. Review WhatsApp conversations, backups and Paynow records separately. Changing the website's retention value cannot erase those copies. Follow the detailed cleanup process in [OPERATOR.md](OPERATOR.md).
