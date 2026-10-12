/** Original sample assets, rendered with the same layout code as customer exports. */
import { createServer } from 'vite';
import { launchBrowser } from './browser.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const samples = [
  {
    name: 'sage', preset: 'botanical', brief: {
      customerName: 'Sample only', businessName: 'Sage & Silk', whatsapp: 'sample only', email: '',
      location: 'Harare · sample concept', tagline: 'Nails, thoughtfully styled.', brandColor: '#53684d',
      services: [
        { name: 'Signature manicure', priceCents: 1200 }, { name: 'Gel polish', priceCents: 1500 },
        { name: 'Builder gel set', priceCents: 2200 }, { name: 'Gel removal', priceCents: 600 },
        { name: 'Classic pedicure', priceCents: 1800 }, { name: 'Nail repair', priceCents: 300 },
        { name: 'Hand care treatment', priceCents: 800 }, { name: 'Nail art (per nail)', priceCents: 200 },
      ],
      featured: 'Builder gel set', notes: '', acceptedTerms: true,
    },
  },
  {
    name: 'form', preset: 'editorial', brief: {
      customerName: 'Sample only', businessName: 'FORM\nBarber Club', whatsapp: 'sample only', email: '',
      location: 'Harare · sample concept', tagline: 'Cuts. Shape. Detail.', brandColor: '#8c492e',
      services: [
        { name: 'Classic cut', priceCents: 1200 }, { name: 'Skin fade', priceCents: 1500 },
        { name: 'Beard shaping', priceCents: 800 }, { name: 'Cut & beard', priceCents: 2000 },
        { name: 'Scissor cut', priceCents: 1400 }, { name: 'Head shave', priceCents: 1000 },
        { name: 'Junior cut', priceCents: 800 }, { name: 'Line-up', priceCents: 600 },
      ],
      featured: 'Cut & beard', notes: '', acceptedTerms: true,
    },
  },
];
const server = await createServer({ root, configFile: false, plugins: [{ name: 'sample-render-page', configureServer(instance) {
  instance.middlewares.use('/__sample-render', (_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html><head><title>Original sample renderer</title></head><body></body></html>'); });
} }], server: { host: '127.0.0.1', port: 5188, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5188/__sample-render');
  const result = await page.evaluate(async (sampleData) => {
    const { generateSampleSVGs } = await import('/src/generator/index.ts');
    const artwork = [];
    for (const sample of sampleData) artwork.push({ name: sample.name, files: await generateSampleSVGs(sample.brief, sample.preset) });
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f5f2e9'; ctx.fillRect(0, 0, 1200, 630);
    ctx.fillStyle = '#20271f'; ctx.font = '700 25px "W3 Sans"'; ctx.fillText('w3Rise Studio', 58, 67);
    ctx.font = '600 51px "W3 Serif"'; ctx.fillText('A polished price list.', 58, 148); ctx.fillText('Three ready-to-post', 58, 206); ctx.fillText('promotions.', 58, 264);
    ctx.font = '400 23px "W3 Sans"'; ctx.fillText('Custom designs for your business', 58, 327);
    ctx.font = '700 27px "W3 Sans"'; ctx.fillText('US$20', 58, 372);
    ctx.font = '400 15px "W3 Sans"'; ctx.fillText('Sample concept — not a client project.', 58, 572);
    const images = await Promise.all(['price-list', 'services', 'feature', 'booking'].map(async kind => {
      const image = new Image(); const url = URL.createObjectURL(new Blob([artwork[0].files[kind]], { type: 'image/svg+xml' }));
      image.src = url; await image.decode(); URL.revokeObjectURL(url); return image;
    }));
    const placements = [[568, 84, 265, 375, -.055], [803, 50, 190, 338, .055], [748, 287, 158, 281, -.025], [959, 220, 178, 317, .045]];
    images.forEach((image, i) => {
      const [x, y, w, h, rotation] = placements[i];
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rotation); ctx.shadowColor = '#20271f25'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 10;
      ctx.drawImage(image, -w / 2, -h / 2, w, h); ctx.restore();
    });
    return { artwork, share: canvas.toDataURL('image/png').split(',')[1] };
  }, samples);
  const destination = path.join(root, 'public', 'samples'); await mkdir(destination, { recursive: true });
  for (const sample of result.artwork) for (const [kind, svg] of Object.entries(sample.files)) await writeFile(path.join(destination, `${sample.name}-${kind}.svg`), svg);
  await writeFile(path.join(destination, 'share.png'), Buffer.from(result.share, 'base64'));
  console.log('Created eight original SVG previews and a 1200 × 630 share image.');
} finally { await browser.close(); await server.close(); }
