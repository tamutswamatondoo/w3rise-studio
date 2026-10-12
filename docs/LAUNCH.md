# Launch checklist and demand test

Production orders stay paused until the following items are complete. This is a launch preparation guide; no outreach has been sent and no real payments have been made as part of development.

The account connection, remote D1 migration and paused deployment at https://w3rise-studio.w3rise-studio.workers.dev are complete. Local fictional fulfilment passed; production remains empty. Public anonymous checks passed, but the Access owner sign-in flow and production Turnstile await configuration.

Owner details supplied on 12 October 2026: operator/support email, public WhatsApp and confirmation of the supplied Paynow merchant recipient. Identity/contact values belong in private encrypted Cloudflare configuration. Response hours selected at the owner's request: Monday–Friday, 09:00–17:00 CAT (Africa/Harare). These configuration values do not complete Access, Turnstile, policy adoption or the controlled production test.

The three owner/contact bindings and a cryptographically random rate-limit salt are now encrypted in Cloudflare; public email/WhatsApp links and hours are verified on the deployed site. The database still contains zero orders and its persistent pause is unchanged.

## Owner decisions required together

- Confirm the connected Cloudflare account and published `workers.dev` address are the intended production home. Configure the Access team/application/audience for the selected operator and create production Turnstile keys using [DEPLOYMENT.md](DEPLOYMENT.md). Put secrets only into private Wrangler prompts or encrypted dashboard fields.
- Verify that the configured public WhatsApp and support/privacy email reach the owner's monitored accounts. Use the selected CAT response hours and review capacity before launch.
- Verify USD checkout in the confirmed merchant account and establish how the operator will inspect Paynow transactions, fees and settlement.
- Adopt or edit the displayed draft service terms: one consolidated revision, how/when customers submit it, cancellations, refund enquiries, supplied-information approval and delivery channel.
- Approve or change the draft 180-day retention period; decide the treatment of financial records, private exports, customer logos and delivered-file copies. Establish a backup and cleanup schedule.
- Confirm actual capacity and timing practice. Until then keep “We confirm your delivery time after reviewing your brief.” Choose when to pause intake.

## Before accepting a real order

- Complete the deployment and hostname security checks in [DEPLOYMENT.md](DEPLOYMENT.md).
- Verify samples clearly say “Sample concept — not a client project”; no invented results, affiliations or customer claims appear.
- Read the exact scope: an A4 PDF, three Status PNGs, approved template customization and one consolidated revision for US$20. Printing, a new logo, editable source files and advertising placement are excluded.
- Confirm contact actions reach the owner's actual account, the user chooses whether to send the WhatsApp message, and failure fallback preserves the brief.
- The full fictional workflow has passed locally. After configuring Access/Turnstile and explicitly authorizing a controlled launch test, repeat it in production through scope, manual test verification, generation, visual review and recorded test delivery. Keep intake paused throughout configuration and anonymous verification; pause it again immediately after the authorized test submission. Confirm public visitors cannot read orders and test orders do not affect live totals.
- Open every export; inspect the PDF at readable size and three PNGs at their full dimensions. Confirm revised content loses approval and unpaid/unreviewed orders are blocked.
- Confirm public terms/privacy reflect the chosen policies and the real canonical/share origin. Read [verification limitations](VERIFICATION.md).
- Open intake, submit one genuine brief only when ready, personally confirm its scope/timing, and send the order-specific USD payment instructions.

## Small demand test

Show the original sample pack to ten relevant salon, nail or barber business owners. Offer the actual US$20 package without an invented discount. Record the date, business type, whether they saw the sample, whether they submitted a brief, whether a full-price payment was verified, and their stated reason for declining. Ask permission before keeping extra identifiable research notes.

Two unrelated full-price purchases are a proposed pilot checkpoint for continuing the experiment. They do not establish a reliable conversion rate, dependable daily demand, profit or an income guarantee. Review actual time spent, revisions, fees and net receipts alongside the customers' feedback before expanding the offer. Keep fictional and technical test records out of this assessment.

## Owner-sendable introduction (not sent)

“Hi, I’m introducing w3Rise Studio. For US$20, I customize an A4 price-list PDF and three WhatsApp Status promotions for salons, nail businesses and barbers, using your approved information. One consolidated revision is included. Here’s a fictional sample pack: [your public sample link]. If it suits your business, you can send a brief; I’ll confirm the scope and delivery time before payment.”
