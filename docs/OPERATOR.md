# Operator guide

Use `/admin` through Cloudflare Access in production. Local development provides a clearly local test desk. Keep the browser, downloaded briefs and output files private. The site does not send WhatsApp messages, deliver files, verify Paynow automatically or make refunds.

## Complete an order

1. **Read the brief.** Review the age/state list, contact details, 1–8 services and USD prices, featured service, colours and notes. Check scope and information directly with the customer. Save approved content and the confirmed timing before requesting payment. A submitted brief alone is not a confirmed order or production start.
2. **Send payment instructions manually.** Copy the order-specific Paynow link and reference. The price is US$20. Ask the customer to confirm USD at Paynow checkout. For another currency, quote explicitly; never infer an exchange rate.
3. **Verify the actual transaction in Paynow.** Check transaction ID, order reference, USD currency, gross amount and **Paid** status in the merchant account. Enter the provider transaction ID and actual fees; the form starts pending and does not assume zero fees. A screenshot, customer message or returned browser page is insufficient. Keep ambiguous or mismatched payments pending. A provider transaction ID cannot pay two orders.
4. **Record finances separately.** Enter actual fees and net amount from Paynow; do not guess them. Record settlement separately when it really reaches the destination. Payment confirmation is not settlement. Financial exports and totals distinguish these fields and exclude test orders.
5. **Generate the current approved content.** Choose a preset and, if supplied with permission, load a validated PNG or JPEG logo locally (maximum 4 MB, 4096 pixels per side). SVG/executable files are not accepted. Save a new output version after adding, replacing or removing a logo. Only its SHA-256 fingerprint is stored: after refresh/order switching, reselect the matching local file before regenerating. The generator does not upload the logo. Production is blocked until verified payment and scope confirmation.
6. **Inspect all four outputs.** The desk shows all four images; the A4 preview is the exact artwork embedded in the PDF and links to the PDF itself. Open the A4 PDF and all three 1080 × 1920 PNGs: services/prices, featured service/offer, and business/booking contact. Check spelling, USD values, facts, contact number, logo, contrast, wrapping and safe margins. Resolve any fit error. Download the versioned files together.
7. **Review, revise and deliver.** Approve only the inspected current version. Use the included consolidated revision for customer-requested changes once. Correct operator mistakes without consuming that revision. Changing approved content creates a new output version and clears the earlier review approval; regenerate and inspect it. Delivery recording is blocked for unreviewed or stale outputs.
8. **Send the files manually**, through WhatsApp or the agreed channel. Only after actual delivery record the delivery action and useful channel/time notes. Generation or a ZIP download is not delivery. Retain the sent version privately.

## Payment-link behavior

The configured recipient comes from the owner's supplied link. Per-order links follow Paynow's documented sequence: URL-encode values, join `search`, `amount=20.00`, `reference` and `l=1`, Base64-encode that string, then URL-encode the result into `q`. There is no invented currency parameter. Even locked simple links can be edited; the actual transaction must be checked. See [Paynow's simple payment documentation](https://developers.paynow.co.zw/docs/paynow/simple_paynow_request_button/).

## Capacity, support and corrections

Pause new intake from the desk when capacity is full; existing records remain available for fulfilment. Reopen only when the promised workload is manageable. Contact routes, response hours and the privacy retention value are configured in the production Worker settings. Confirm delivery time after reviewing each brief unless the owner has adopted a real, sustainable published estimate.

Use notes to record the agreed timing, customer approval, consolidated change list, unusual payment facts, delivery channel and any cancellation/refund enquiry. Do not record card details, PINs or passwords. Process cancellations and refunds personally under the owner-approved policy; nothing in this build moves funds.

If another tab changes an order, your draft remains visible but cannot overwrite the newer saved content. Refresh the queue, compare the changes, then use **Reload latest saved content** to replace your draft before continuing. Generation uses saved approved content, not unsaved edits. Refreshing or regenerating never carries an old review approval forward.

For a deployed technical rehearsal, mark the record **fictional/test** before entering any simulated verification. That flag is permanent and excludes the record from live totals. Use explicitly simulated transaction/delivery notes and never treat them as actual transactions. Local development does this automatically.

## Records and retention

Export order and financial records regularly and before destructive maintenance. CSV/JSON exports are private customer records. Keep test orders marked as tests and confirm they stay outside live submitted/paid/revenue/delivery totals.

The draft retention period is 180 days and must be approved or changed by the owner. Cleanup removes only unpaid orders with no provider transaction ID whose last update is older than `RETENTION_DAYS` (supported range: 30–3650). Paid financial records remain pending the owner's record-retention policy. There is no automatic deletion job.

Export private JSON first and inspect the records older than the configured cutoff. After confirming they are no longer needed, use **Retention cleanup** below the desk, select the confirmation checkbox and remove eligible unpaid briefs. The equivalent authenticated API command, from browser developer tools while signed into `/admin`, is:

```javascript
await fetch('/api/admin/retention', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ confirmed: true })
}).then(response => response.json());
```

This deletes eligible database records immediately. Check the returned count and keep the export private. Changing `RETENTION_DAYS` changes eligibility; it does not run cleanup by itself.

Review downloaded deliverables, logos, exports, backups and WhatsApp records separately. D1 cleanup does not remove them or Paynow's independent payment records. Decide how long financial records need to be retained before deleting order history.
