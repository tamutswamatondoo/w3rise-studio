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

Deployed on 12 October 2026 at **https://w3rise-studio.w3rise-studio.workers.dev**. Production intake is deliberately paused in both configuration and D1. The production database contains zero orders. Anonymous operator pages, record reads, exports and actions are denied; the owner cannot sign in until Cloudflare Access is configured. Public pages and samples work. No real payment, customer delivery or demand test has occurred.

The owner supplied the operator/support email and WhatsApp number; these and a cryptographically random rate-limit salt are deployed as encrypted Worker bindings, and the public support links are verified. Response hours are Monday–Friday, 09:00–17:00 CAT (Africa/Harare), with delivery timing confirmed after brief review. The remaining launch gates are owner-approved policies, the Access application and production Turnstile keys, followed by authenticated production acceptance checks. Keep intake paused while completing them. Run `npm.cmd run test:deployed -- https://w3rise-studio.w3rise-studio.workers.dev` to repeat the anonymous paused-deployment checks without submitting a customer brief.

Follow [deployment instructions](docs/DEPLOYMENT.md), [operator guide](docs/OPERATOR.md) and [launch checklist and owner decisions](docs/LAUNCH.md). [Implementation milestones](docs/IMPLEMENTATION.md) record assumptions. See [font and original-asset licences](docs/ASSET-LICENSES.md).

## Important boundaries

- Brief submission saves an enquiry; the operator then confirms scope and timing before requesting payment.
- The authoritative package price is US$20 (2,000 integer cents). Paynow simple links are instructions, not proof of payment. The operator verifies the actual USD transaction.
- Production requires a verified payment and approved content. Delivery requires review of the current output version. Test orders stay outside live totals.
- No public uploads or customer file URLs exist. An optional PNG/JPEG logo is loaded only in the operator's browser.
- Public contact details, response hours, privacy retention and policy choices require owner configuration. Until capacity is confirmed: “We confirm your delivery time after reviewing your brief.”
