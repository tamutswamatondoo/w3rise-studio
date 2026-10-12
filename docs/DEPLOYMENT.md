# Cloudflare deployment

Deployed on 12 October 2026 at **https://w3rise-studio.w3rise-studio.workers.dev**, Worker version `40769183-8805-4c46-8992-02d650d36293`, from source commit `24fb6cbfe13d819706d233ea2dc5b78670c9ba0b`. The authenticated owner-controlled account and actual `studio-db` D1 binding are recorded in `wrangler.jsonc`; the remote migration is applied. Owner/support identity, contacts, a cryptographically random rate-limit salt and the production Turnstile secret are encrypted Worker bindings; public support links and CAT hours are verified. Intake is paused in configuration and the persistent database setting. Access and production Turnstile are configured as described below. The owner's email-code login is verified by the Access audit and the owner reports that the desk opened. Agent checks of the authenticated queue/actions, live wrong-identity denial, Turnstile acceptance/replay rejection and the production rehearsal remain pending. No customer orders or payment records were created remotely.

Account connection, database creation, migrations, paused deployment, Access configuration, production Turnstile registration and owner email-code login are complete for this installation. Owner identity/contact details and business policies have been supplied; continue with agent security/fulfilment acceptance checks and actual Paynow USD/merchant verification. The owner has authorized the fictional production rehearsal and opening only after all checks pass. Keep the Workers Free plan; do not enable paid subscriptions. No domain purchase is needed.

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

Set non-sensitive server-side values in `wrangler.jsonc`; configure owner identity and contact values privately as encrypted Worker bindings. `PUBLIC_ORIGIN` is already the actual deployed HTTPS origin. Missing configuration keeps intake closed and the private desk inaccessible. On 12 October 2026 the owner supplied the operator/support email and public WhatsApp, and confirmed the supplied Paynow merchant recipient. Response hours are Monday–Friday, 09:00–17:00 CAT (Africa/Harare); timing is confirmed individually after brief review and delivery is through WhatsApp. Owner identity/contact values must not be committed to this public repository. Access and production Turnstile are configured; the owner/contact/rate-limit bindings and `TURNSTILE_SECRET_KEY` are encrypted in the Worker. Their presence does not establish a successful owner login or live Turnstile verification. The owner cannot currently access the Paynow merchant account. Actual USD checkout and visibility of transactions, fees and settlement remain unverified and block customer launch.

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
| `ACCESS_TEAM_DOMAIN` | Set to the configured `w3rise-studio.cloudflareaccess.com` organization. |
| `ACCESS_AUD` | The real audience tag is set in source for the one Access application covering both private paths. Preserve it unless replacing that application. |
| `TURNSTILE_SITE_KEY` | The real public site key is set in source for the production hostname. Live acceptance/replay checks remain pending. |
| `PUBLIC_ORIGIN` | Actual HTTPS origin after the first paused deployment; no trailing slash. |

`SUPPORT_WHATSAPP` must use `+` followed by the country code and number, without spaces. Intake remains closed unless the production contact, Access, origin, merchant and abuse-protection configuration is complete.

`OWNER_EMAIL`, `SUPPORT_EMAIL` and `SUPPORT_WHATSAPP` are intentionally omitted from tracked `vars`. Set them through the Cloudflare encrypted configuration process; normal Wrangler deployments preserve existing secrets. Do not reintroduce these keys as plaintext `vars`, which can conflict with their encrypted bindings. The API intentionally publishes the two customer support values on the public website; the operator identity is not included in public configuration. Website contact publication does not authorize publishing the values in GitHub history.

The production [Turnstile widget](https://developers.cloudflare.com/turnstile/get-started/) is registered in managed mode, with pre-clearance disabled (`no_clearance`), and restricted to `w3rise-studio.w3rise-studio.workers.dev`. Its public site key is in `TURNSTILE_SITE_KEY`. The secret was transferred entirely within authenticated MCP memory into the existing Worker's encrypted `TURNSTILE_SECRET_KEY` binding; no secret value was printed or saved locally. Preserve the widget and encrypted binding when resuming setup.

For a fresh installation or an intentional widget replacement only, register the actual production hostname and set its public site key. In the Cloudflare dashboard, open **Workers & Pages → w3rise-studio → Settings → Variables and Secrets** and add `TURNSTILE_SECRET_KEY` with type **Secret**, then deploy the changes. Follow the official [encrypted configuration instructions](https://developers.cloudflare.com/workers/configuration/secrets/). Keep the secret key out of `VITE_*` values and version control. If an agent performs Turnstile retrieval through a CLI, use the approved canonical Wrangler outside the project; do not pass secrets through project package scripts or package resolution.

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

The latest local connection probe to `api.cloudflare.com` timed out, matching Wrangler/API and deployed-test connection timeouts. Cloudflare MCP account reads/writes continue to work, and Git fetch succeeded; this is a deployment-CLI connectivity blocker rather than evidence that new secrets or reauthorization are needed. The compact mobile-widget change passed local TypeScript, production build, whitespace and 15-asset privacy checks. It is not yet confirmed deployed, and the live version recorded above remains `40769183-8805-4c46-8992-02d650d36293`. When CLI connectivity returns, retry `npm.cmd run deploy` using the existing authenticated configuration, record the actual successful version, repeat the paused-deployment checks and inspect the real widget at narrow/mobile/desktop widths. Keep the persisted intake pause in place throughout.

## 5. Protect the desk and its API

The Zero Trust organization is `w3rise-studio.cloudflareaccess.com`. **One self-hosted Access application** covers the real hostname's `/admin*` and `/api/admin*` paths, including root and nested routes. Its reusable Allow policy includes only the previously selected operator's exact email. Email one-time PIN is the configured identity provider, and the Access application session lasts eight hours. The team's hostname and application's real audience are in production source configuration. No Everyone bypass is used on these destinations. Do not create another application or broaden the policy when resuming verification.

For a fresh installation only, enable Zero Trust on the Free plan, create the same two private destinations in one self-hosted application and configure an identity provider and exact-email Allow policy. The email code is private; the login page states it expires after ten minutes, separately from the eight-hour authenticated session.

Cloudflare's [Workers Access documentation](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) explicitly supports `workers.dev` hostnames and paths. [Application path rules](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/) explain wildcard matching and more-specific policy precedence. If the dashboard's domain selector omits `workers.dev`, use its custom input or the Access API's public destination `uri` fields for the same two paths; do not substitute a domain purchase.

The Worker independently validates the signed Access JWT, expected issuer, audience and owner email. Missing configuration denies production access. Protect these paths on **every** subsequently added custom domain or route, or disable unused hostnames; hostname policies cover only their configured URLs. Confirm there are no Version URLs. Test both the page and API from a signed-out browser and with the wrong identity before enabling intake.

`OWNER_EMAIL`, `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are configured for the selected operator and actual application. Owner login is now independently verified: the Access audit filtered to that operator/application records `allowed: true`, `action: login`, `method: onetimepin` at `2026-10-12T17:02:42Z`, and the owner reports the desk opened. This proves the email-code login, not the agent's authenticated queue/action checks. Reconnect the owner's signed-in browser to complete those checks; if Access requests a fresh code, enter it privately in the sign-in page. Never send a code, session cookie or Access JWT in chat or screenshots. Verify the queue, exports and permitted actions through the agent-controlled authenticated session; a different identity and a signed-out browser must be unable to read records, export or mutate orders. The earlier 403 checks established fail-closed behavior before configuration, and the configured deployment's anonymous checks redirect private paths to Access.

## 6. Public acceptance and opening intake

Verify public samples, real contact actions, privacy/terms, operator authentication and denied unauthenticated mutations while intake stays paused. The public submission workflow and live Turnstile acceptance cannot be fully verified in that state; the complete fictional workflow has already passed locally.

The owner reports that the production `/order` widget shows “Success” in an ordinary Chrome/Edge browser. Earlier it displayed “Verification failed” in Codex's automated in-app browser, with no submission during that check. Cloudflare documents that automated challenge solving is unsupported and embedded-browser support is limited; see [supported browsers](https://developers.cloudflare.com/cloudflare-challenges/reference/supported-browsers/). The ordinary-browser client check is now owner-reported complete; server-side acceptance and replay rejection remain unverified. Keep production keys and protection in place; do not substitute test keys or weaken the challenge.

A separate narrow-screen check found the default 300 px widget overflowing its container at a 320 px viewport. The compact 150 × 140 px display change passed local TypeScript, production build and 15-asset privacy checks. Deployment and actual post-deployment visual inspection at 320, 390 and desktop widths remain pending. This display change does not alter challenge protection or establish backend acceptance.

The owner has already authorized one controlled fictional production test and opening intake only after all launch checks pass. Owner login is verified; first complete agent checks of authenticated queue/actions and live wrong-identity denial using the configured Access application. Keep the launch unannounced and temporarily open intake from the owner desk only for a clearly fictional submission and the necessary live Turnstile acceptance/replay assertions; then pause it immediately. Registration alone does not prove those checks. A paused 503 response does not prove replay rejection; the replay check must use a different submission idempotency key from the accepted fictional request while the controlled test window is open. Mark the order **fictional/test** in the desk before any simulated payment handling. Confirm all four generated files, revision and delivery gates; label payment, settlement and delivery records explicitly simulated and do not make a real payment for a technical test. This rehearsal cannot verify actual Paynow USD checkout or merchant access. Measure deployed CPU/errors and confirm access on all reachable hostnames. Keep the test record marked as a test and check live totals remain zero. Open intake for customers only after every launch check, including actual Paynow USD/merchant verification, passes, with the manual three-active-paid-order limit in effect. The persistent desk setting overrides `ORDERS_OPEN`; redeploying alone does not clear an existing pause. A failed or incomplete launch check keeps customer intake paused.

The owner has approved one consolidated revision within seven calendar days of first-draft receipt, case-by-case cancellation/refund handling, 90-day eligible unpaid cleanup, separate paid-record retention, 30-day downloaded-file/logo cleanup and three active paid orders. Confirm the published terms/privacy and operating instructions match these choices before testing. Revision deadlines, capacity, refunds and cleanup are manual responsibilities; the configuration guards do not enforce them or prove that an Access policy was created correctly. Follow [OPERATOR.md](OPERATOR.md) for the first genuine order and manual WhatsApp delivery.

## Codex Cloudflare tools

The official [Cloudflare agent setup](https://developers.cloudflare.com/agent-setup/prompt.md) was completed: all 17 skills from `cloudflare/skills` were installed globally at revision `c430dd965cea3a8faf0ef035e3b3d73b38518081`, and the `cloudflare` MCP server at `https://mcp.cloudflare.com/mcp` was added and authorized with OAuth. The MCP tools are now loaded and authenticated in the current Codex session; no restart blocker remains. The private user-level Codex configuration and globally installed skills are outside this repository. Wrangler login and MCP authorization are separate and both succeeded. The optional beta `cf` CLI was not needed for this Wrangler project.

Authenticated MCP configuration created the Zero Trust organization, email-PIN identity provider, exact-email Allow policy, the two-path Access application and the production Turnstile widget. The Turnstile secret stayed in MCP memory during transfer to the encrypted Worker binding. The owner separately completed the email-code browser login, confirmed by the Access audit. The agent still needs a connected authenticated browser session to verify the queue/actions and complete the production rehearsal. No API token, password, email code or Turnstile secret should be sent in chat.

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

Workers Logs/Traces are currently disabled (`observability.enabled: false`); aggregate telemetry has been inspected through the authenticated security review. See [verification evidence](VERIFICATION.md) for the measurements and their limits. Before real traffic, decide whether aggregate metrics are sufficient or adopt an owner-approved monitoring configuration that never records briefs, credentials, tokens or payment bodies. No log/trace coverage has been claimed.

## Backup, retention and maintenance

Export order/financial records from the private desk and keep exports and delivered files in an owner-controlled private location. The owner-selected backup folder and its three child folders have been created; consult the ignored `.wrangler/owner-operations.json` for their actual location. A read-only review found no files, allowed access for the current Windows user and no Allow entries for Everyone, Authenticated Users or Builtin Users. One additional individual account has access and requires owner review. Folder EFS encryption is off; disk encryption has not been verified, and no automated backup process is configured. Folder creation and this limited permissions review do not prove complete privacy, encryption or recoverability. Resolve the access review and confirm storage protection before placing customer records there; keep backups manual until an actual automated process is configured and tested.

Never copy the private path, exports or customer files into this repository. Exports contain personal information and are never for the public asset directory or Git. D1 [Time Travel](https://developers.cloudflare.com/d1/platform/limits/) is a short recovery window, not the owner's long-term backup policy.

Set the disclosed unpaid cleanup cutoff to 90 days. The explicit retention action removes only unpaid briefs without a provider transaction ID whose last update is older than that cutoff; no scheduled deletion runs. Paid D1 records remain preserved for manual review. Retain required paid business/tax records for at least six years from the last entry under section 37B of the Income Tax Act, and longer when applicable requirements or a legal hold require it; see [ZIMRA's record-keeping guidance](https://www.zimra.co.zw/domestic-taxes/corporate/record-keeping-explained). The current application preserves the whole paid order, not a separate financial-only archive.

Manually remove downloaded design files and customer logos after 30 days from final delivery, except evidence that must be retained for an applicable legal or unresolved-dispute requirement. Keep required financial records and exports separately; they are not covered by the design-file cleanup period. Review WhatsApp conversations, backups and Paynow records separately. Changing the website's retention value cannot erase those copies. Follow the detailed cleanup process in [OPERATOR.md](OPERATOR.md).
