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

Deployed on 12 October 2026 at **https://w3rise-studio.w3rise-studio.workers.dev**. Production intake is deliberately paused in both configuration and D1. The production database contains zero orders. Cloudflare Access is configured for the private desk and API, with an Allow policy restricted to the selected operator email and email one-time PIN sign-in. The deployed `/admin` page reaches the Access email-code login; successful owner sign-in and authenticated production checks remain pending. Public pages and samples work. No real payment, customer delivery or demand test has occurred.

The owner supplied the operator/support email and WhatsApp number; these and a cryptographically random rate-limit salt are deployed as encrypted Worker bindings, and the public support links are verified. Response hours are Monday–Friday, 09:00–17:00 CAT (Africa/Harare). Timing is confirmed individually after brief review, and files are delivered manually through WhatsApp. The owner approved the revision, refund, retention and three-active-paid-order policies documented in the [operator guide](docs/OPERATOR.md). Production Turnstile is configured only for the real production hostname, with its secret stored as an encrypted Worker binding. Remaining technical checks are owner email-code sign-in, authenticated access tests, live Turnstile acceptance/replay rejection and the fictional production rehearsal. The owner cannot currently access the Paynow merchant account; USD checkout, transaction/fee visibility and settlement remain unverified and block customer launch. Keep customer intake paused while completing these checks. Cloudflare MCP tools are now loaded and authenticated; no Codex restart is required. Run `npm.cmd run test:deployed -- https://w3rise-studio.w3rise-studio.workers.dev` to repeat the anonymous paused-deployment checks without submitting a customer brief.

The owner has already authorized one clearly fictional production rehearsal and opening intake only after all launch checks pass. This authorization does not bypass the pending verification or Paynow checks. The private backup folder and its three child folders have been created and verified; their actual path is kept only in the ignored `.wrangler/owner-operations.json` operating configuration.

Follow [deployment instructions](docs/DEPLOYMENT.md), [operator guide](docs/OPERATOR.md) and [launch checklist](docs/LAUNCH.md). [Implementation milestones](docs/IMPLEMENTATION.md) record assumptions. See [font and original-asset licences](docs/ASSET-LICENSES.md).

## Important boundaries

- Brief submission saves an enquiry; the operator then confirms scope and timing before requesting payment.
- The authoritative package price is US$20 (2,000 integer cents). Paynow simple links are instructions, not proof of payment. The operator verifies the actual USD transaction.
- Production requires a verified payment and approved content. Delivery requires review of the current output version. Test orders stay outside live totals.
- No public uploads or customer file URLs exist. An optional PNG/JPEG logo is loaded only in the operator's browser.
- The included revision is one consolidated request within seven calendar days of the customer receiving the first drafts. Refunds are considered case by case; both are handled manually.
- Capacity is three active paid orders, checked manually. Pause intake at that limit and confirm each customer's timing individually before payment.
- Eligible unpaid briefs have a 90-day cleanup cutoff measured from their last update. Cleanup is manual; paid records and private file copies follow separate retention rules in the operator guide.
