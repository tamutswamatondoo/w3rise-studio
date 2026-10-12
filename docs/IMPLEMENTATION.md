# Implementation milestones

All three milestones were completed locally on 12 October 2026. The application is now deployed at https://w3rise-studio.w3rise-studio.workers.dev with intake paused and the unconfigured operator desk denied. See [verification evidence](VERIFICATION.md), [deployment](DEPLOYMENT.md), [operator guide](OPERATOR.md) and [launch checklist](LAUNCH.md). No real transaction or customer delivery was performed. Approved policies below supersede the initial draft assumptions; the fictional production rehearsal remains pending.

1. **Foundation and trust boundaries.** React/TypeScript/Vite, one Worker with Static Assets, D1 migrations, strict intake and idempotency, fail-closed Access authentication. Acceptance: persistent brief, rejected invalid/oversized input, no public state mutation or private data access.
2. **Understandable offer and real fulfilment.** Original fictional samples, accessible mobile form, protected desk, manual Paynow verification, local four-file generator and versioned review/delivery. Acceptance: unpaid work cannot generate; unreviewed or stale versions cannot deliver; unique transaction IDs.
3. **Verification and launch handover.** Exercise fictional end-to-end flow, security failures, browser/mobile checks and exported file inspection. Acceptance: A4 PDF plus three 1080×1920 PNGs; documented evidence, deployment and owner decisions.

## Material assumptions

- No pre-existing application or repository instructions were present at inspection.
- The supplied Paynow recipient has been confirmed by the owner. Actual owner/support contacts were separately supplied and installed as encrypted bindings. The owner cannot currently access the merchant account; actual USD checkout and transaction/fee/settlement visibility remain unverified and block customer launch.
- Production stays paused until Access, Turnstile and all launch checks pass. The owner has authorized one clearly fictional production rehearsal and opening only after every check passes; this does not permit bypassing the remaining blockers.
- The owner approved one consolidated revision within seven calendar days of first-draft receipt, case-by-case cancellations/refunds, individually confirmed timing, WhatsApp delivery and a manual three-active-paid-order limit. Deadline, capacity and refund handling are not automated.
- The owner approved 90-day eligible unpaid cleanup measured from the last update, minimum six-year required paid business/tax record retention from the last entry under the Income Tax Act (longer where applicable), and manual downloaded-design-file/logo cleanup 30 days after final delivery. Unpaid D1 cleanup is an explicit operator action, not unattended deletion; paid D1 orders remain preserved for manual review. The application does not implement financial-only archival or local-file cleanup.
- The private backup folder and three child folders have been created and verified. Their actual location is kept only in the ignored `.wrangler/owner-operations.json`, never in tracked documentation.
- Local submissions are visibly fictional/test records and excluded from live totals. Nothing in this build sends customer messages or verifies actual payments automatically.
- The authorized Cloudflare account/D1 setup and paused deployment are complete without purchasing a plan. Access and production Turnstile remain pending; the current Codex session has not loaded the globally authorized Cloudflare MCP tools.
