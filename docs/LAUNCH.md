# Launch checklist and demand test

Production orders stay paused until the following items are complete. This is a launch preparation guide; no outreach has been sent and no real payments have been made as part of development.

The account connection, remote D1 migration and paused deployment at https://w3rise-studio.w3rise-studio.workers.dev are complete. Local fictional fulfilment passed; production remains empty. Access and production Turnstile are now configured. Owner email-code sign-in, authenticated access checks, live Turnstile acceptance/replay rejection and the fictional production rehearsal remain pending.

Owner details supplied on 12 October 2026: operator/support email, public WhatsApp and confirmation of the supplied Paynow merchant recipient. Identity/contact values belong in private encrypted Cloudflare configuration. Response hours are Monday–Friday, 09:00–17:00 CAT (Africa/Harare). The owner has approved the business policies below and authorized the controlled fictional production test and opening only after every launch check passes. Configuration is not verification: owner sign-in, live Turnstile checks and actual USD checkout/merchant transaction visibility remain required.

The three owner/contact bindings, a cryptographically random rate-limit salt and the production Turnstile secret are encrypted in Cloudflare; public email/WhatsApp links and hours are verified on the deployed site. The Turnstile secret was transferred entirely in MCP memory without printing or saving it locally. The database still contains zero orders and its persistent pause is unchanged.

## Approved operating decisions

- **Revision:** one consolidated customer request within seven calendar days of receiving the first drafts, submitted through WhatsApp. Record receipt and the deadline manually. Correct operator mistakes without consuming the included revision.
- **Cancellations/refunds:** review each request case by case; the operator handles communication and any actual refund personally.
- **Unpaid briefs:** a 90-day manual cleanup cutoff, measured from the last update, for unpaid orders without a provider transaction ID.
- **Paid records:** retain required business/tax records for at least six years from the last entry under section 37B of the Income Tax Act, longer where applicable requirements or legal holds require it; see [ZIMRA's record-keeping guidance](https://www.zimra.co.zw/domestic-taxes/corporate/record-keeping-explained). Paid D1 orders remain preserved pending manual review; no financial-only archive or automatic paid-record deletion exists.
- **Downloads/logos:** manually clean up design downloads and customer logos 30 days after final delivery, subject to required legal/dispute evidence. Keep legally required financial records and exports separately.
- **Capacity/timing:** no more than three active paid orders. Check capacity and pause/reopen intake manually. Confirm timing individually after brief review and deliver through WhatsApp.
- **Backups:** the private owner-selected folder and its three child folders have been created and verified. Its actual path belongs only in the ignored `.wrangler/owner-operations.json`; exports and backups remain outside Git.
- **Production test/opening:** one clearly fictional production rehearsal is authorized. Opening for customers is authorized only after all checks pass; any incomplete or failed check keeps intake paused.

The application enforces the one-revision allowance and payment/version/review gates. It does not enforce the seven-day deadline, three-order capacity or retention schedules, send files or issue refunds automatically.

## Remaining setup and verification

- Access is configured in `w3rise-studio.cloudflareaccess.com`: one self-hosted application covers `/admin*` and `/api/admin*` on the real hostname, with an exact-email-only Allow policy, email one-time PIN sign-in and an eight-hour application session. The production managed Turnstile widget has pre-clearance disabled and permits only the real production hostname. Public identifiers are in source; secrets remain encrypted. Preserve this configuration using [DEPLOYMENT.md](DEPLOYMENT.md).
- The owner must open the deployed `/admin` page and complete the email-code login privately. Then verify the selected operator can retrieve the queue and perform authorized actions, while signed-out visitors and a different identity are denied records, exports and operator actions. Confirm the support routes reach monitored accounts. Cloudflare MCP is loaded and authenticated; no restart is needed, and MCP authentication does not replace this browser login.
- Restore access to the Paynow merchant account; the owner has confirmed they cannot currently access it. Then verify actual USD checkout and that the operator can inspect transaction ID, reference, amount, Paid status, fees and settlement. The supplied recipient is confirmed, but these checks remain unverified and block customer launch. Never substitute a screenshot, simulated record or invented confirmation for actual merchant verification.
- Publish and check terms/privacy matching the approved policies, complete the authenticated fictional rehearsal below, inspect every output and confirm the manual backup/cleanup procedure.

## Before accepting a real order

To restore Paynow access, open the official [Log On page](https://www.paynow.co.zw/User/LogIn), enter the existing registered merchant email privately and choose **Next**. Follow the account's recovery prompts if sign-in fails. If recovery is unavailable or you cannot access the registered email, use the support contact published on that page to request merchant account recovery. The owner must complete identity checks and any password change directly with Paynow; never put passwords, PINs or recovery codes in chat. After recovery, check **Receive Payments**, **View Transaction History** and **Manage Payment Bank Accounts**, then inspect USD checkout without treating an unpaid checkout as a payment. If no genuine transaction exists, record that fact and leave real payment verification pending; the technical rehearsal uses explicitly simulated records only. See the [official merchant FAQ](https://www.paynow.co.zw/home/merchanttutorial).

- Complete the deployment and hostname security checks in [DEPLOYMENT.md](DEPLOYMENT.md).
- Verify samples clearly say “Sample concept — not a client project”; no invented results, affiliations or customer claims appear.
- Read the exact scope: an A4 PDF, three Status PNGs, approved template customization and one consolidated revision for US$20. Printing, a new logo, editable source files and advertising placement are excluded.
- Confirm contact actions reach the owner's actual account, the user chooses whether to send the WhatsApp message, and failure fallback preserves the brief.
- The full fictional workflow has passed locally. After verifying the configured Access sign-in and access boundaries, run the already-authorized production rehearsal with live Turnstile acceptance and replay rejection, then scope, visibly simulated payment/settlement verification, generation, visual review, recorded simulated delivery and revision. Keep intake paused throughout configuration and anonymous verification; open only for the fictional submission and necessary live security assertions, then pause immediately. Mark the record fictional/test before simulated payment handling. Confirm public visitors cannot read orders and test orders do not affect live totals. This technical rehearsal does not resolve the actual Paynow USD/merchant launch blocker.
- Open every export; inspect the PDF at readable size and three PNGs at their full dimensions. Confirm revised content loses approval and unpaid/unreviewed orders are blocked.
- Confirm public terms/privacy reflect the chosen policies and the real canonical/share origin. Read [verification limitations](VERIFICATION.md).
- Open intake only after every launch check passes. For the first genuine brief, check the three-active-paid-order limit, personally confirm scope/timing and send the order-specific USD payment instructions. Do not invent customer details or payment confirmations to pass a check.

## Small demand test

Show the original sample pack to ten relevant salon, nail or barber business owners. Offer the actual US$20 package without an invented discount. Record the date, business type, whether they saw the sample, whether they submitted a brief, whether a full-price payment was verified, and their stated reason for declining. Ask permission before keeping extra identifiable research notes.

Two unrelated full-price purchases are a proposed pilot checkpoint for continuing the experiment. They do not establish a reliable conversion rate, dependable daily demand, profit or an income guarantee. Review actual time spent, revisions, fees and net receipts alongside the customers' feedback before expanding the offer. Keep fictional and technical test records out of this assessment.

## Owner-sendable introduction (not sent)

“Hi, I’m introducing w3Rise Studio. For US$20, I customize an A4 price-list PDF and three WhatsApp Status promotions for salons, nail businesses and barbers, using your approved information. One consolidated revision is included. Here’s a fictional sample pack: [your public sample link]. If it suits your business, you can send a brief; I’ll confirm the scope and delivery time before payment.”
