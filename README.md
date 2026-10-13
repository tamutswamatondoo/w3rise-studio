# w3Rise Studio

A small Zimbabwe digital design service: US$20 for one branded A4 price-list PDF, three distinct 1080 × 1920 WhatsApp Status images, and one consolidated revision. Reusable original templates are customized with approved customer information.

React, TypeScript and Vite serve the public website and private order desk. One Cloudflare Worker handles the API and Static Assets; D1 stores briefs, fulfilment history and financial records. The browser creates deliverables locally. Files and messages are delivered manually.

## Run locally

Use Node.js 22.12 or newer and npm. In Windows PowerShell, use the `.cmd` executables to avoid script execution-policy issues.

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run dev
```

Open `http://127.0.0.1:5173`; the desk is at `/admin`. Local configuration explicitly enables local authentication and marks submissions as test orders. Keep the development server on loopback. Local data stays in `.wrangler/state`; restarting or refreshing does not remove it.

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build
npm.cmd run test:production
npm.cmd run test:generator
npm.cmd run test:e2e
npm.cmd run test:pdf
```

Browser checks use an installed Chrome or Edge on Windows. Set `PLAYWRIGHT_EXECUTABLE_PATH` for a different executable. If none is available, install Playwright's Chromium using `npx.cmd playwright install chromium` before running the browser checks.

`npm.cmd run verify` runs the combined checks. Run local migrations first; browser tests create visibly fictional records in the local database. `npm.cmd run samples` reproducibly rebuilds the original sample previews. Read [verification evidence and limits](docs/VERIFICATION.md) before treating a build as verified.

## Launch state

Deployed on 12 October 2026 at **https://w3rise-studio.w3rise-studio.workers.dev**. Production intake is deliberately paused in both configuration and D1. One permanently marked fictional test order is excluded from live totals. Cloudflare Access is configured for the private desk and API, with an Allow policy restricted to the selected operator email and email one-time PIN sign-in. The owner's successful email-code login is independently verified by the Access audit. Authenticated queue, refresh, private JSON export and the complete fictional production workflow have passed through the live desk. Public pages and samples work. No real payment, customer delivery or demand test has occurred.

The owner supplied the operator/support email and WhatsApp number; these and a cryptographically random rate-limit salt are deployed as encrypted Worker bindings, and the public support links are verified. Response hours are Monday–Friday, 09:00–17:00 CAT (Africa/Harare). Timing is confirmed individually after brief review, and files are delivered manually through WhatsApp. The owner approved the revision, refund, retention and three-active-paid-order policies documented in the [operator guide](docs/OPERATOR.md). Production Turnstile is configured only for the real production hostname, with its secret stored as an encrypted Worker binding; a genuine token was accepted by the backend for the fictional brief. Live token replay rejection with a new request ID and denial of an actual non-owner identity remain unverified. The owner cannot currently access the Paynow merchant account; USD checkout, transaction/fee visibility and settlement remain unverified and block customer launch. Keep customer intake paused while completing these checks and the backup access and storage-protection review. Cloudflare MCP tools are loaded and authenticated. Run `npm.cmd run test:deployed -- https://w3rise-studio.w3rise-studio.workers.dev` to repeat the anonymous paused-deployment checks without submitting a customer brief.

The authorized fictional production rehearsal is complete. The owner explicitly approved an intake window of up to two minutes for that brief, and intake was paused immediately after submission. Payment, fees, net, settlement and WhatsApp delivery entries are visibly simulated; no funds moved or outbound message was sent. All four downloaded outputs were inspected, including the reopened A4 PDF, followed by a consolidated revision and replacement-logo correction using the latest saved details. Opening for customers remains authorized only after every launch check passes. Manual backup and restore of three fictional files passed with matching hashes and no overwrites. An additional individual account's folder access still needs owner review, folder EFS encryption is off, disk encryption is unverified and backups are manual. Recovery of the tested files is verified; storage privacy and encryption remain unverified. The actual path is kept only in the ignored `.wrangler/owner-operations.json` operating configuration.

The owner reports that the live Turnstile widget shows “Success” in an ordinary Chrome/Edge browser. Actual post-deployment inspection at 320, 390 and 1440 px also passes: the compact 150 × 140 px widget is fully visible, shows “Success”, has no horizontal overflow and leaves paused submission disabled. The earlier in-app browser failure is historical. Local TypeScript, production build and 15-asset privacy checks passed. After the rehearsal, all 17 paused-deployment checks and an additional anonymous check of the existing private test record passed: 18 checks total. The deployment is at 100%; the pre-rehearsal readback confirmed all five encrypted bindings, zero orders and the persisted pause. The later fictional brief is the sole production test record; live totals remain zero. The earlier deployment connection timeout has resolved; see the [verification evidence and remaining checks](docs/VERIFICATION.md).

Follow [deployment instructions](docs/DEPLOYMENT.md), [operator guide](docs/OPERATOR.md) and [launch checklist](docs/LAUNCH.md). [Implementation milestones](docs/IMPLEMENTATION.md) record assumptions. See [font and original-asset licences](docs/ASSET-LICENSES.md).

## Important boundaries

- Brief submission saves an enquiry; the operator then confirms scope and timing before requesting payment.
- The authoritative package price is US$20 (2,000 integer cents). Paynow simple links are instructions, not proof of payment. The operator verifies the actual USD transaction.
- Production requires a verified payment and approved content. Delivery requires review of the current output version. Test orders stay outside live totals.
- No public uploads or customer file URLs exist. An optional PNG/JPEG logo is loaded only in the operator's browser.
- The included revision is one consolidated request within seven calendar days of the customer receiving the first drafts. Refunds are considered case by case; both are handled manually.
- Capacity is three active paid orders, checked manually. Pause intake at that limit and confirm each customer's timing individually before payment.
- Eligible unpaid briefs have a 90-day cleanup cutoff measured from their last update. Cleanup is manual; paid records and private file copies follow separate retention rules in the operator guide.
