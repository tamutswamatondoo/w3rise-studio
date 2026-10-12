import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';
import type { Brief, Order } from '../../shared/types';

const artifactDir = join(process.cwd(), 'artifacts', 'private');
const businessName = 'Éclat Salon & Nails — Approved Fictional Studio for Styles and Personal Care'.padEnd(80, '.');
const longService = 'Precision styling and consultation for approved salon service';
const fictionalBrief: Brief = {
  customerName: 'Fictional QA Owner', businessName, whatsapp: '+263770000000',
  email: 'qa@example.invalid', location: 'Fictional studio — no real booking location',
  tagline: 'Your approved style, considered with care.', brandColor: '#60735e',
  services: Array.from({ length: 8 }, (_, i) => ({ name: `${longService.slice(0, 57)} ${i + 1}`, priceCents: 500 + i * 250 })),
  featured: 'Precision styling and consultation — US$5.00',
  notes: 'Fictional test only. Do not fulfil or contact this invented business.', acceptedTerms: true,
};

async function api<T>(page: Page, path: string, body?: unknown): Promise<T> {
  const result = await page.evaluate(async ({ path, body }) => {
    const response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(data)}`);
    return data;
  }, { path, body });
  return result as T;
}

async function noHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function inspectTextContrast(page: Page) {
  const results = await page.evaluate(() => {
    const rgba = (value: string) => {
      const match = value.match(/[\d.]+/g)?.map(Number) || [0, 0, 0];
      return [match[0], match[1], match[2], match[3] ?? 1];
    };
    const luminance = (rgb: number[]) => {
      const linear = rgb.slice(0, 3).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
      return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
    };
    const selectors = '.hero-subtitle,.hero-description,.hero-note,.fine-print,.sample-label,.button.primary,.button.light,.scope-exclusion,.process-step p,.faq-list summary';
    return [...document.querySelectorAll<HTMLElement>(selectors)].filter(element => element.getClientRects().length).map(element => {
      const foreground = rgba(getComputedStyle(element).color);
      let background = [255, 255, 255, 1];
      for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) {
        const color = rgba(getComputedStyle(parent).backgroundColor);
        if (color[3] === 1) { background = color; break; }
      }
      const one = luminance(foreground), two = luminance(background);
      return { text: element.textContent?.trim().slice(0, 70), ratio: (Math.max(one, two) + .05) / (Math.min(one, two) + .05) };
    });
  });
  expect(results.length).toBeGreaterThan(10);
  expect(results.filter(result => result.ratio < 4.5)).toEqual([]);
  await writeFile(join(artifactDir, 'contrast-evidence.json'), JSON.stringify({ minimumRatio: Math.min(...results.map(result => result.ratio)), results }, null, 2));
}

async function fictionalSupportConfig(page: Page) {
  // Exercise contact-link construction without configuring or contacting a real number.
  await page.route('**/api/config', async route => {
    const response = await route.fetch();
    const config = await response.json();
    await route.fulfill({ response, json: { ...config, supportWhatsapp: '+263770000000', supportEmail: 'qa@example.invalid' } });
  });
}

async function fillBrief(page: Page, brief = fictionalBrief) {
  await page.getByLabel('Your name', { exact: true }).fill(brief.customerName);
  await page.getByLabel('Business name', { exact: true }).fill(brief.businessName);
  await page.getByLabel('WhatsApp number', { exact: true }).fill(brief.whatsapp);
  await page.getByLabel('Email address', { exact: false }).fill(brief.email);
  await page.getByLabel('Business location', { exact: false }).fill(brief.location);
  await page.getByLabel('Short tagline', { exact: false }).fill(brief.tagline);
  await page.locator('#brandColor').fill(brief.brandColor);
  for (let i = 0; i < brief.services.length; i++) {
    if (i) await page.getByRole('button', { name: 'Add a service' }).click();
    await page.getByLabel(`Service ${i + 1}`, { exact: true }).fill(brief.services[i].name);
    await page.getByLabel(`USD price ${i + 1}`, { exact: true }).fill((brief.services[i].priceCents / 100).toFixed(2));
  }
  await page.getByLabel('Service or offer to feature', { exact: true }).fill(brief.featured);
  await page.getByLabel('Short notes', { exact: false }).fill(brief.notes);
  await page.getByRole('checkbox').check();
}

test.beforeAll(async () => { await mkdir(artifactDir, { recursive: true }); });

test('public desktop and mobile navigation, original samples and keyboard previews', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page).toHaveTitle(/w3Rise Studio/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A polished');
  await expect(page.getByRole('link', { name: /Start my order/ }).first()).toHaveAttribute('href', '/order');
  await page.getByRole('link', { name: 'Samples', exact: true }).click();
  await expect(page.locator('#samples')).toBeInViewport();
  await page.getByRole('button', { name: 'Enlarge Sage & Silk A4 price list' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close preview' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('heading')).toHaveText('Services & prices');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Previous sample' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Enlarge Sage & Silk A4 price list' })).toBeFocused();
  await page.getByRole('button', { name: /FORM Barber club/ }).click();
  await expect(page.getByRole('button', { name: 'Enlarge FORM Business & booking' })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.goto('/');
  await inspectTextContrast(page);
  await page.screenshot({ path: join(artifactDir, 'public-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('button', { name: 'Close navigation' })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('link', { name: 'Package', exact: true }).click();
  await expect(page.locator('#package')).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false');
  await noHorizontalOverflow(page);
  await page.goto('/');
  await page.screenshot({ path: join(artifactDir, 'public-mobile.png'), fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await page.setViewportSize({width:320,height:740});
  await noHorizontalOverflow(page);
  await page.screenshot({path:join(artifactDir,'public-mobile-320.png'),fullPage:true});
});

test('mobile brief validation preserves inputs, saves eight services, and persists after refresh', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fictionalSupportConfig(page);
  await page.goto('/order');
  await api(page, '/api/admin/settings', { ordersOpen: true });
  await page.reload();
  await page.getByRole('button', { name: 'Submit my brief' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toBeFocused();
  await fillBrief(page);
  await expect(page.getByRole('button', { name: 'Add a service' })).toBeDisabled();
  await page.getByLabel('WhatsApp number', { exact: true }).fill('0770000000');
  await page.getByRole('button', { name: 'Submit my brief' }).click();
  await expect(page.getByRole('alert')).toContainText('country code');
  await expect(page.getByLabel('Business name', { exact: true })).toHaveValue(businessName);
  await page.getByLabel('WhatsApp number', { exact: true }).fill(fictionalBrief.whatsapp);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: join(artifactDir, 'brief-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Submit my brief' }).click();
  const reference = await page.locator('.reference strong').textContent();
  expect(reference).toMatch(/^W3-\d{8}-[A-F0-9]{12}$/);
  await expect(page.locator('.order-success')).toContainText('does not confirm payment');
  const whatsapp = page.getByRole('link', { name: 'Continue on WhatsApp' });
  const href = await whatsapp.getAttribute('href');
  expect(href).toContain('https://wa.me/263770000000?text=');
  expect(decodeURIComponent(href!)).toContain(reference);
  const stored = await api<{ order: Order }>(page, `/api/admin/orders/${reference}`);
  expect(stored.order.brief.businessName).toBe(businessName);
  expect(stored.order.brief.services).toHaveLength(8);
  expect(stored.order.isTest).toBe(true);
  expect(stored.order.paymentStatus).toBe('pending');
  await page.reload();
  const persisted = await api<{ order: Order }>(page, `/api/admin/orders/${reference}`);
  expect(persisted.order.brief).toEqual(stored.order.brief);
  await writeFile(join(artifactDir, 'intake-evidence.json'), JSON.stringify({ reference, isTest: true, persistedAfterRefresh: true, services: 8 }, null, 2));
});

test('failed intake preserves the complete brief and never shows success', async ({ page }) => {
  await fictionalSupportConfig(page);
  await page.goto('/order');
  await api(page, '/api/admin/settings', { ordersOpen: true });
  await page.reload();
  await fillBrief(page);
  await page.route('**/api/orders', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Fictional simulated network failure.' }) }));
  await page.getByRole('button', { name: 'Submit my brief' }).click();
  await expect(page.getByRole('alert')).toContainText('simulated network failure');
  await expect(page.getByRole('alert')).toContainText('preserved');
  await expect(page.getByLabel('Business name', { exact: true })).toHaveValue(businessName);
  await expect(page.getByLabel('Service 8', { exact: true })).toHaveValue(fictionalBrief.services[7].name);
  const fallback = page.getByRole('link', { name: 'ask for help on WhatsApp' });
  await expect(fallback).toHaveAttribute('href', /^https:\/\/wa\.me\/263770000000\?text=/);
  await expect(page.locator('.order-success')).toHaveCount(0);
});

test('fictional operator workflow exports four valid files and clears stale review on correction', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/order');
  await api(page, '/api/admin/settings', { ordersOpen: true });
  const { reference } = await api<{ reference: string }>(page, '/api/orders', {
    brief: fictionalBrief, requestId: crypto.randomUUID(), honeypot: '', turnstileToken: '',
  });
  await page.goto('/admin');
  await page.locator('.order-row').filter({ hasText: reference }).click();
  await expect(page.getByRole('button', { name: 'Generate current pack', includeHidden: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Record files delivered', includeHidden: true })).toBeDisabled();
  await page.getByLabel('Delivery timing agreed with customer').fill('Fictional QA simulation only — no customer deadline or fulfilment.');
  await page.getByRole('button', { name: 'Confirm scope & timing' }).click();
  await expect(page.getByLabel('Per-order Paynow URL')).toHaveValue(/www\.paynow\.co\.zw/);
  const paynowUrl = await page.getByLabel('Per-order Paynow URL').inputValue();
  const decoded = Buffer.from(new URL(paynowUrl).searchParams.get('q')!, 'base64').toString('utf8');
  expect(decoded).toContain(`reference=${reference}`);
  expect(decoded).toContain('amount=20.00');
  expect(decoded).toContain('l=1');
  expect(decoded).not.toContain('currency=');

  await page.getByLabel('Provider transaction ID', { exact: true }).fill(`QA-FICTIONAL-${Date.now()}`);
  await page.getByLabel('Actual provider fees', { exact: true }).fill('0.70');
  await page.getByLabel('Actual provider status').selectOption('paid');
  await page.getByRole('checkbox', { name: /I inspected this actual transaction/ }).check();
  await page.getByRole('button', { name: 'Verify payment', exact: true }).click();
  await expect(page.locator('.payment-record')).toContainText('US$19.30');
  await expect(page.getByRole('button', { name: 'Generate current pack' })).toBeEnabled();
  await page.getByRole('button', { name: 'Generate current pack' }).click();
  await expect(page.locator('.generated-grid img')).toHaveCount(4);
  await expect(page.getByAltText('Generated A4 price list preview')).toBeVisible();
  const headerPixels=await page.evaluate(async()=>{
    const counts=[];
    for(const image of document.querySelectorAll<HTMLImageElement>('.generated-grid img')){
      const bitmap=await createImageBitmap(await(await fetch(image.src)).blob());
      const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;
      const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(bitmap,0,0,1080,1920);bitmap.close();
      const pixels=ctx.getImageData(90,260,900,430).data;let ink=0;
      for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-32)<8&&Math.abs(pixels[i+1]-39)<8&&Math.abs(pixels[i+2]-31)<8)ink++;
      counts.push(ink);
    }return counts;
  });
  expect(headerPixels.every(count=>count>2000)).toBe(true);
  await expect(page.getByRole('button', { name: 'Approve current version' })).toBeDisabled();
  await page.screenshot({ path: join(artifactDir, 'operator-generated-desktop.png'), fullPage: true });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all four files (.zip)' }).click();
  const download = await downloadPromise;
  const zipPath = join(artifactDir, download.suggestedFilename());
  await download.saveAs(zipPath);
  const files = await inspectDownloadedPack(zipPath, reference, 1);

  await page.getByRole('checkbox', { name: /I inspected all four current files/ }).check();
  await page.getByRole('button', { name: 'Approve current version' }).click();
  await page.getByLabel('Delivery channel / note').fill('Fictional QA simulated delivery; no files sent to any customer.');
  await page.getByRole('button', { name: 'Record files delivered' }).click();
  await expect(page.locator('.detail-header .status-pill')).toHaveText('Delivered');
  const delivered = (await api<{ order: Order }>(page, `/api/admin/orders/${reference}`)).order;
  expect(delivered.isTest).toBe(true);
  expect(delivered.deliveredAt).toBeTruthy();
  expect(delivered.payment?.grossCents).toBe(2000);
  expect(delivered.payment?.feeCents).toBe(70);
  expect(delivered.payment?.netCents).toBe(1930);
  expect(delivered.payment?.settledCents).toBe(0);

  await page.getByLabel('Service or offer to feature', { exact: true }).fill('Approved operator correction — precision styling US$5.00');
  await page.getByLabel('Reason for a new content/output version').selectOption('operator_correction');
  await page.getByRole('button', { name: 'Save new content version' }).click();
  const corrected = (await api<{ order: Order }>(page, `/api/admin/orders/${reference}`)).order;
  expect(corrected.contentVersion).toBe(2);
  expect(corrected.reviewedVersion).toBeNull();
  expect(corrected.generatedVersion).toBeNull();
  expect(corrected.deliveredAt).toBeNull();
  expect(corrected.revisionUsed).toBe(false);
  await expect(page.getByRole('button', { name: 'Record files delivered', includeHidden: true })).toBeDisabled();
  await expect(page.locator('.generated-grid')).toHaveCount(0);
  const list = await api<{ metrics: Record<string, number> }>(page, '/api/admin/orders');
  expect(Object.values(list.metrics).every(value => value === 0)).toBe(true);
  await writeFile(join(artifactDir, 'workflow-evidence.json'), JSON.stringify({
    reference, isTest: true, simulatedPaymentOnly: true, simulatedDeliveryOnly: true,
    files, generatedVersion: 1, correctedVersion: corrected.contentVersion,
    staleReviewCleared: corrected.reviewedVersion === null, revisionAllowancePreserved: !corrected.revisionUsed,
  }, null, 2));
  await page.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow(page);
  await page.screenshot({ path: join(artifactDir, 'operator-mobile.png'), fullPage: true });
});

test('stale edits cannot overwrite saved content and logo versions survive refresh safely', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/order');
  const created = await api<{reference:string}>(page,'/api/orders',{brief:fictionalBrief,requestId:crypto.randomUUID(),honeypot:'',turnstileToken:''});
  const reference = created.reference;
  let order = (await api<{order:Order}>(page,`/api/admin/orders/${reference}`)).order;
  const act = async (action:string, values:Record<string,unknown>) => {
    order = (await api<{order:Order}>(page,`/api/admin/orders/${reference}/action`,{action,expectedUpdatedAt:order.updatedAt,...values})).order;
  };
  await act('confirm_scope',{approvedBrief:fictionalBrief,timing:'Fictional test only',preset:'botanical'});
  await act('verify_payment',{providerTransactionId:`QA-SIMULATED-LOGO-${Date.now()}`,reference,currency:'USD',grossCents:2000,feeCents:0,status:'paid',checkedInPaynow:true});
  await page.goto('/admin');
  await page.locator('.order-row').filter({hasText:reference}).click();
  await page.getByLabel('Service or offer to feature',{exact:true}).fill('Unsaved stale draft that must never overwrite saved content');
  await act('revise',{approvedBrief:{...fictionalBrief,featured:'Latest customer-approved service — US$5.00'},reason:'operator_correction',preset:'botanical'});
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.locator('.detail-meta')).toContainText('Output v2');
  await page.getByRole('button',{name:'Save new content version'}).click();
  await expect(page.getByRole('alert')).toContainText('changed');
  order = (await api<{order:Order}>(page,`/api/admin/orders/${reference}`)).order;
  expect(order.approvedBrief?.featured).toBe('Latest customer-approved service — US$5.00');
  await page.getByRole('button',{name:'Reload latest saved content (replaces this draft)'}).click();
  await expect(page.getByLabel('Service or offer to feature',{exact:true})).toHaveValue(order.approvedBrief!.featured);

  const logoBytes = await page.evaluate(async () => {
    const canvas=document.createElement('canvas');canvas.width=100;canvas.height=100;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#53684d';ctx.fillRect(0,0,100,100);ctx.fillStyle='#ffffff';ctx.fillRect(20,20,60,60);
    const blob=await new Promise<Blob>(resolve=>canvas.toBlob(blob=>resolve(blob!),'image/png'));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  const logo={name:'fictional-approved-logo.png',mimeType:'image/png',buffer:Buffer.from(logoBytes)};
  await page.locator('#local-logo').setInputFiles(logo);
  await expect(page.getByRole('button',{name:'Generate current pack'})).toBeDisabled();
  await page.getByRole('button',{name:'Save new content version'}).click();
  await expect(page.locator('.detail-meta')).toContainText('Output v3');
  order = (await api<{order:Order}>(page,`/api/admin/orders/${reference}`)).order;
  expect(order.logoSha256).toMatch(/^[a-f0-9]{64}$/);
  await page.getByRole('button',{name:'Generate current pack'}).click();
  await expect(page.locator('.generated-grid img')).toHaveCount(4);
  // Compare the actual UI PNG bytes against the latest stored brief + exact local logo.
  const matches=await page.evaluate(async ({approvedBrief,reference,logoBytes,version})=>{
    // @ts-expect-error Browser Vite module URL is resolved by the running dev server.
    const {generatePack}=await import('/src/generator/index.ts');
    const pack=await generatePack(approvedBrief,{reference,version,preset:'botanical',logo:new File([new Uint8Array(logoBytes)],'logo.png',{type:'image/png'})});
    const sha=async(bytes:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).join(',');
    const expected=await Promise.all(pack.files.filter((f:{kind:string})=>f.kind==='png').map(async(f:{blob:Blob})=>sha(await f.blob.arrayBuffer())));
    const actual=await Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>('.generated-grid img:not([alt="Generated A4 price list preview"])')).map(async img=>sha(await(await fetch(img.src)).arrayBuffer())));
    pack.dispose();return JSON.stringify(expected)===JSON.stringify(actual);
  },{approvedBrief:order.approvedBrief,reference,logoBytes,version:3});
  expect(matches).toBe(true);
  await page.reload();await page.locator('.order-row').filter({hasText:reference}).click();
  await page.getByRole('button',{name:'Generate current pack'}).click();
  await expect(page.getByRole('alert')).toContainText('Reselect the approved local logo');
  await expect(page.locator('.generated-grid')).toHaveCount(0);
  await page.locator('#local-logo').setInputFiles(logo);
  await page.getByRole('button',{name:'Generate current pack'}).click();
  await expect(page.locator('.generated-grid img')).toHaveCount(4);
  await page.getByRole('checkbox',{name:/I inspected all four current files/}).check();
  await page.getByRole('button',{name:'Approve current version'}).click();
  await page.getByLabel('Service or offer to feature',{exact:true}).fill('Customer consolidated revision — latest approved wording');
  await page.getByLabel('Reason for a new content/output version').selectOption('customer_revision');
  await page.getByRole('button',{name:'Save new content version'}).click();
  await expect(page.locator('.detail-meta')).toContainText('Output v4');
  await expect(page.getByRole('button',{name:'Record files delivered',includeHidden:true})).toBeDisabled();
  await page.getByRole('button',{name:'Generate current pack'}).click();
  await expect(page.locator('.generated-grid img')).toHaveCount(4);
  await page.getByRole('checkbox',{name:/I inspected all four current files/}).check();
  await page.getByRole('button',{name:'Approve current version'}).click();
  await page.getByLabel('Delivery channel / note').fill('Fictional revised delivery only. No customer contacted.');
  await page.getByRole('button',{name:'Record files delivered'}).click();
  await expect(page.locator('.detail-header .status-pill')).toHaveText('Delivered');
  order = (await api<{order:Order}>(page,`/api/admin/orders/${reference}`)).order;
  expect(order.revisionUsed).toBe(true);expect(order.reviewedVersion).toBe(4);expect(order.isTest).toBe(true);
  expect(order.events.find(e=>e.action==='verify_payment')?.detail).toContain('FICTIONAL TEST');
  await writeFile(join(artifactDir,'stale-logo-revision-evidence.json'),JSON.stringify({reference,isTest:true,simulatedPaymentOnly:true,staleEditRejected:true,threePngBytesMatchLatestSavedBriefAndLogo:matches,logoReselectionRequiredAfterRefresh:true,finalDeliveredVersion:4,customerRevisionUsed:true},null,2));
});

export async function inspectDownloadedPack(path: string, reference: string, version: number) {
  const entries = unzipSync(new Uint8Array(await readFile(path)));
  const names = Object.keys(entries);
  expect(names).toHaveLength(4);
  expect(names.filter(name => name.endsWith('.pdf'))).toHaveLength(1);
  expect(names.filter(name => name.endsWith('.png'))).toHaveLength(3);
  for (const name of names) {
    expect(name).toContain(`${reference}-v${String(version).padStart(2, '0')}`);
    const bytes = entries[name];
    await writeFile(join(artifactDir, name), bytes);
    if (name.endsWith('.pdf')) {
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBe(1);
      expect(pdf.getPage(0).getWidth()).toBeCloseTo(595.28, 2);
      expect(pdf.getPage(0).getHeight()).toBeCloseTo(841.89, 2);
    } else {
      const buffer = Buffer.from(bytes);
      expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(buffer.readUInt32BE(16)).toBe(1080);
      expect(buffer.readUInt32BE(20)).toBe(1920);
    }
  }
  return names;
}
