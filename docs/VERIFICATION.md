# Verification record

Local build verified and paused production deployed on **12 October 2026** on Windows, Node 26.10.0, installed Chrome, Wrangler 4.149.0 and Cloudflare Vite plugin 1.63.1. Production is **https://w3rise-studio.w3rise-studio.workers.dev**, version `3529810a-0a14-4003-a82c-1550252ed90e`. No real Paynow payment, bank settlement, outbound customer message or live purchase was performed. Local test records are explicitly fictional and excluded from live totals; production contains zero orders.

## Executed checks

| Area | Observed result | Evidence |
| --- | --- | --- |
| Type/build | TypeScript and production frontend/Worker builds pass; generator loads separately from the public page | `npm run check`, `npm run build` |
| API/security | 20 tests pass using real Miniflare/workerd D1 SQLite: strict Unicode-aware limits, integer cents, invalid colours, bounded/oversized streaming input, repeated/concurrent idempotency, public state injection, same-origin checks, Access token signature/issuer/audience/email/expiry, challenge binding, persistent atomic abuse limit, optimistic conflicts, safe exports and retention | `npm test`, `tests/api.test.ts` |
| Production bundle | Exact compiled production Worker denies admin pages, nested pages, order reads, export and mutation without authentication, even when runtime vars request local auth; intake stays closed without configuration | `npm run test:production` |
| Browser workflows | Five end-to-end tests pass: public navigation and keyboard previews, invalid → eight-service save/refresh, failed save preservation + manual contact fallback, fictional fulfilment, stale edit/logo/revision flow | `npm run test:e2e` |
| Responsive/accessibility | Desktop 1440 px, mobile 390 px and narrow 320 px inspected; no horizontal overflow; form labels, focus/error summary, dialog keyboard navigation/Escape/focus restoration, menu, FAQ and reduced motion checked | `artifacts/private/public-*.png`, `brief-mobile.png`, operator screenshots |
| Contrast | Selected visible sales-page text and CTAs meet 4.5:1; minimum measured 5.16:1 | `artifacts/private/contrast-evidence.json` (targeted measurement, not a complete accessibility audit) |
| Payment/finances | Exact reference, USD, 2000 gross cents and Paid status required; duplicate case-insensitive provider transaction IDs rejected; actual fees, net and settlement remain separate; test totals remain zero | API suite, `workflow-evidence.json` |
| Full fictional fulfilment | Saved brief → scope/timing → explicitly simulated payment → four files → human review → recorded simulated delivery; operator correction preserves revision; customer revision generates/reviews/delivers v4 | `workflow-evidence.json`, `stale-logo-revision-evidence.json` |
| Latest content and logo | Stale tab cannot overwrite newer saved content. All three UI PNG byte hashes match generation from the latest stored brief and exact selected logo. Logo fingerprint persists; regeneration after refresh refuses a missing logo. Logo changes create a new version | Fifth browser test; no logo file is uploaded |
| State gates | Unpaid generation and unreviewed/stale delivery fail. Regeneration clears review. Revision clears generation/review/current delivery; customer allowance consumed once; earlier events retain delivery history | API/browser suites |
| Output integrity | Two complete preset packs, each A4 PDF at 595.28 × 841.89 points and three decoded 1080 × 1920 PNGs; long names, eight services and accented text; unsupported glyph/fit/unsafe logo errors are explicit | `npm run test:generator` (13 checks) |
| Actual PDF and images | Exported PDF reopened and rendered with PDF.js; its A4 page and all three Status PNGs visually inspected, with readable text and safe margins. Desk shows the exact raster embedded in the PDF | `npm run test:pdf`, `exported-A4-pdf-render.png`, versioned private PNGs |
| Public asset privacy | Built public files contain no test customer markers, server secret/token markers, source maps, private directories or customer deliverable filenames | `npm run test:assets` (15 text assets), manual build/source review |
| Paused live deployment | 17 checks pass against the actual HTTPS origin: public pages/samples and canonical/share metadata load; production local bypass is off; anonymous admin pages, queue, exports and settings action return 403; empty submission returns paused 503 | `npm run test:deployed -- https://w3rise-studio.w3rise-studio.workers.dev`, private `deployment-evidence.json` |
| Remote database | Migration applied; query after anonymous checks confirms `orders_count=0` and persistent `orders_open=false` | Remote Wrangler D1 read-only query; no customer brief or payment submitted |

Run `npm run db:migrate` before `npm run verify`. Browser tests create local fictional records and require Chrome, Edge, an explicit `PLAYWRIGHT_EXECUTABLE_PATH`, or Playwright Chromium. Generator/PDF inspections use short-lived loopback servers and close them when complete. Private artifacts and local D1 state are ignored by Git and excluded from public assets.

## Failures found and repaired

- Local Vite forwarding headers initially triggered the local-only auth denial. The guard now recognizes the precise loopback peer/host while rejecting external proxies; production still compiles the bypass out.
- Gallery focus restoration initially targeted the modal's removed button. The opener is now recorded, and the modal is closed before restoring focus.
- Browser-native embedded PDF viewing could show blank. The desk now uses the exact A4 artwork preview, links to the actual PDF, and the actual export is independently rendered for QA.
- Export inspection caught intermittently missing drawn content. The generator now uses software-backed canvases, waits for fonts, and the browser suite checks visible heading pixels in every output; those checks and subsequent visual inspection pass.
- Stale drafts and browser-local logos could otherwise change output without a trustworthy version. Pinned edit timestamps, persisted logo fingerprints, explicit reload, matching-file checks and generation/review invalidation repair those paths.
- Deployed visual inspection found literal line-break markup in the terms/privacy headings. The headings now use actual React line breaks. Final deployed desktop/mobile inspection is pending the follow-up source deployment.

The final checks above pass. The responsive navigation/gallery check was rerun after the final control-size adjustments and passed. The three downloaded workflow PNGs were independently decoded again to confirm their saved heading content, and the A4 PDF and all three PNGs were inspected at original resolution. Deployment with an unset database configuration is intentionally refused by `preflight-deploy.mjs`; the actual configured database and Worker have now been deployed while intake remains paused.

## Remaining limits and deployment-only checks

- The production configuration disables Version URLs and anonymous access is denied on the deployed public hostname. Real owner Access sign-in, wrong-identity denial, verification of all subsequently added hostnames, deployed Turnstile, real support links, a controlled production fictional workflow and Workers CPU/quota behavior still require owner configuration. Cryptographic and production-bundle tests are not proof of a completed Access dashboard policy. Worker startup time is not request CPU measurement.
- Manual Paynow verification requires the owner's actual merchant account. Simple links remain tamperable, do not force USD and do not confirm fees or bank settlement.
- The A4 PDF embeds sharp 200-dpi raster artwork; it has no editable/selectable text layer. Unsupported font glyphs stop generation for operator correction. Layout tests cover demanding valid examples, not every possible text combination.
- Retention cleanup preserves paid financial records until the owner adopts their separate retention policy. Local downloads, backups and WhatsApp/Paynow records need separate handling.
- No automated test establishes demand, legal policy suitability or owner capacity. Those decisions remain in the launch checklist.
- Workers Logs/Traces remain disabled; aggregate dashboard metrics do not provide full diagnostic traces. No deployed request CPU or quota-load benchmark has been completed.
