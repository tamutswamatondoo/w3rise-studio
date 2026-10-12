import { createServer } from 'vite';
import { launchBrowser } from './browser.mjs';
import { PDFDocument } from 'pdf-lib';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'artifacts/private/generator'); await mkdir(directory, { recursive: true });
const server = await createServer({ root, configFile: false, plugins: [{ name: 'generator-test-page', configureServer(instance) {
  instance.middlewares.use('/__generator-test', (_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Generator verification</title><body></body>'); });
} }], server: { host: '127.0.0.1', port: 5189, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await page.goto('http://127.0.0.1:5189/__generator-test');
  const result = await page.evaluate(async () => {
    const { generatePack, validateLogo } = await import('/src/generator/index.ts');
    const { renderArtwork, contrastInk } = await import('/src/generator/render.ts');
    const { loadProductionFonts } = await import('/src/generator/fonts.ts');
    const brief = {
      customerName: 'Fictional generator check', businessName: 'Élan & Co. Hair, Nails and Personal Grooming Studio for the Whole Family',
      whatsapp: '+263000000000', email: '', location: 'Fictional location for a private test, never published as a booking contact',
      tagline: 'A carefully supplied long tagline with accented names: Chipo, Rutendo, José and Anaïs.', brandColor: '#53684d',
      services: Array.from({ length: 8 }, (_, i) => ({ name: `${i + 1}. Complete styling, hair and nail care with a consultation`, priceCents: i === 7 ? 999999 : (i + 1) * 1250 })),
      featured: 'Complete hair and nail styling with a detailed consultation, using only the approved business information provided.', notes: '', acceptedTerms: true,
    };
    // This deliberately fills all eight rows with long, valid service names.
    const packs = [];
    for (const preset of ['botanical', 'editorial']) {
      const pack = await generatePack(brief, { reference: `TEST-${preset.toUpperCase()}`, version: 2, preset });
      const files = [];
      for (const file of pack.files) {
        const bytes = new Uint8Array(await file.blob.arrayBuffer());
        let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        const decoded = file.kind === 'png' ? await createImageBitmap(file.blob) : null;
        if (decoded && (decoded.width !== 1080 || decoded.height !== 1920)) throw new Error('Incorrect PNG dimensions');
        decoded?.close();
        files.push({ name: file.name, kind: file.kind, base64: btoa(binary) });
      }
      // Keep an exact A4 raster alongside the PDF for human visual inspection.
      const print = renderArtwork(brief, 'price-list', preset).canvas.toDataURL('image/png').split(',')[1];
      packs.push({ preset, files, print }); pack.dispose();
    }
    const checks = [];
    async function rejection(name, run, expected) {
      try { await run(); throw new Error(`${name} was accepted`); } catch (error) { if (!expected.test(error.message)) throw error; checks.push(name); }
    }
    await rejection('unsupported Unicode explicitly rejected', () => generatePack({ ...brief, businessName: 'Test 🦄 Studio' }, { reference: 'TEST-UNICODE', version: 1, preset: 'botanical' }), /unsupported character/);
    await rejection('oversized text explicitly rejected', () => generatePack({ ...brief, businessName: 'X'.repeat(81) }, { reference: 'TEST-LENGTH', version: 1, preset: 'editorial' }), /too long/);
    await rejection('SVG logo rejected', () => validateLogo(new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })), /PNG or JPEG/);
    await rejection('spoofed PNG logo rejected', () => validateLogo(new File(['<svg/>'], 'logo.png', { type: 'image/png' })), /valid PNG or JPEG|does not match/);
    await rejection('oversized logo rejected', () => validateLogo(new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'logo.png', { type: 'image/png' })), /4 MB/);
    const logoCanvas = document.createElement('canvas'); logoCanvas.width = 64; logoCanvas.height = 64;
    logoCanvas.getContext('2d').fillRect(0, 0, 64, 64);
    const logoBlob = await new Promise(resolve => logoCanvas.toBlob(resolve, 'image/png'));
    await validateLogo(new File([logoBlob], 'valid.png', { type: 'image/png' })); checks.push('valid local PNG logo accepted');
    const fonts = await loadProductionFonts();
    if (!fonts.sans('Ł'.codePointAt(0)) || !fonts.serif('Ł'.codePointAt(0))) throw new Error('Latin Extended glyph coverage failed');
    checks.push('actual font cmap covers accented Latin');
    if (contrastInk('#ffffff') !== '#121512' || contrastInk('#000000') !== '#ffffff') throw new Error('Accent contrast selection failed');
    checks.push('light and dark accent text contrast');
    return { packs, checks };
  });
  for (const pack of result.packs) {
    await writeFile(path.join(directory, `${pack.preset}-A4-raster.png`), Buffer.from(pack.print, 'base64'));
    for (const file of pack.files) {
      const bytes = Buffer.from(file.base64, 'base64'); await writeFile(path.join(directory, file.name), bytes);
      if (file.kind === 'pdf') {
        const pdf = await PDFDocument.load(bytes); assert.equal(pdf.getPageCount(), 1);
        const size = pdf.getPage(0).getSize(); assert.equal(size.width, 595.28); assert.equal(size.height, 841.89);
      } else {
        assert.equal(bytes.readUInt32BE(16), 1080); assert.equal(bytes.readUInt32BE(20), 1920);
      }
      assert.match(file.name, /-v02-(price-list\.pdf|status-(services|feature|booking)\.png)$/);
    }
  }
  console.log(JSON.stringify({ passed: ['two complete four-file packs generated', 'A4 PDF page size 595.28 × 841.89 pt', 'all six PNGs decoded at 1080 × 1920', 'versioned stable names', 'eight long service names in both presets', ...result.checks], privateArtifacts: directory }, null, 2));
} finally { await browser.close(); await server.close(); }
