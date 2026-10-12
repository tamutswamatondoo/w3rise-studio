import { PDFDocument } from 'pdf-lib';
import { zipSync } from 'fflate';
import type { Brief } from '../../shared/types';
import { BRIEF_LIMITS } from '../../shared/validation';
import { assertCharacters, loadProductionFonts } from './fonts';
import { renderArtwork, type ArtworkKind, type Preset } from './render';
import { validateLogo } from './logo';
export { validateLogo } from './logo';
export type { Preset } from './render';

export interface GeneratedFile { name: string; blob: Blob; url: string; previewUrl?: string; width: number; height: number; kind: 'pdf' | 'png' }
export interface GeneratedPack { files: GeneratedFile[]; dispose: () => void }
export interface GenerationOptions { reference: string; version: number; preset: Preset; logo?: File }

async function validateContent(brief: Brief) {
  for (const field of ['businessName', 'location', 'tagline', 'featured', 'whatsapp'] as const) {
    if (typeof brief[field] !== 'string' || Array.from(brief[field].normalize('NFC')).length > BRIEF_LIMITS[field]) throw new Error(`${field} is too long or invalid. Maximum ${BRIEF_LIMITS[field]} characters; nothing has been shortened.`);
  }
  if (!/^#[0-9a-f]{6}$/i.test(brief.brandColor)) throw new Error('Use a six-digit hexadecimal brand colour.');
  if (!brief.businessName.trim() || !brief.featured.trim()) throw new Error('The approved business name and featured service or offer are required.');
  if (!Array.isArray(brief.services) || brief.services.length < 1 || brief.services.length > 8) throw new Error('Include between one and eight approved services.');
  if (brief.services.some(service => typeof service.name !== 'string' || !service.name.trim() || Array.from(service.name.normalize('NFC')).length > BRIEF_LIMITS.serviceName || !Number.isSafeInteger(service.priceCents) || service.priceCents < 0 || service.priceCents > 999999)) throw new Error('Each service needs a name of 1–60 characters and a valid USD price in integer cents.');
  const fonts = await loadProductionFonts();
  for (const [field, value] of [['Business name', brief.businessName], ['Location', brief.location], ['Tagline', brief.tagline], ['Featured service or offer', brief.featured], ['WhatsApp number', brief.whatsapp]] as const) assertCharacters(value, field, fonts.sans);
  brief.services.forEach((service, index) => assertCharacters(service.name, `Service ${index + 1}`, fonts.sans));
  return fonts;
}

export async function generatePack(brief: Brief, options: GenerationOptions): Promise<GeneratedPack> {
  if (!/^[a-z0-9-]{3,80}$/i.test(options.reference) || !Number.isInteger(options.version) || options.version < 1 || options.version > 999) throw new Error('A valid order reference and content version are required.');
  if (!['botanical', 'editorial'].includes(options.preset)) throw new Error('Choose a supported style preset.');
  const fonts = await validateContent(brief);
  if (options.preset === 'botanical') {
    assertCharacters(brief.businessName, 'Business name', fonts.serif);
    assertCharacters(brief.featured, 'Featured service or offer', fonts.serif);
  }
  let logo: ImageBitmap | undefined;
  const files: GeneratedFile[] = [];
  try {
    if (options.logo) { await validateLogo(options.logo); logo = await createImageBitmap(options.logo); }
    const stem = `${options.reference}-v${String(options.version).padStart(2, '0')}`;
    const kinds: ArtworkKind[] = ['price-list', 'services', 'feature', 'booking'];
    for (const kind of kinds) {
      const art = renderArtwork(brief, kind, options.preset, { logo });
      const png = await art.png();
      let blob = png;
      if (kind === 'price-list') {
        const pdf = await PDFDocument.create();
        pdf.setTitle(`${brief.businessName} — price list`);
        pdf.setCreator('w3Rise Studio');
        const page = pdf.addPage([595.28, 841.89]);
        const image = await pdf.embedPng(await png.arrayBuffer());
        page.drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 });
        blob = new Blob([new Uint8Array(await pdf.save())], { type: 'application/pdf' });
      }
      const isPDF = kind === 'price-list';
      files.push({ name: `${stem}-${isPDF ? 'price-list.pdf' : `status-${kind}.png`}`, blob, url: URL.createObjectURL(blob), previewUrl: isPDF ? URL.createObjectURL(png) : undefined, width: isPDF ? 1654 : 1080, height: isPDF ? 2339 : 1920, kind: isPDF ? 'pdf' : 'png' });
    }
    const dispose = () => files.forEach(file => { URL.revokeObjectURL(file.url); if (file.previewUrl) URL.revokeObjectURL(file.previewUrl); });
    return { files, dispose };
  } catch (error) { files.forEach(file => { URL.revokeObjectURL(file.url); if (file.previewUrl) URL.revokeObjectURL(file.previewUrl); }); throw error; }
  finally { logo?.close(); }
}

export async function downloadPack(pack: GeneratedPack): Promise<void> {
  if (pack.files.length !== 4) throw new Error('A complete pack must contain all four deliverables.');
  const entries = Object.fromEntries(await Promise.all(pack.files.map(async file => [file.name, new Uint8Array(await file.blob.arrayBuffer())] as const)));
  const zip = zipSync(entries, { level: 0 });
  const url = URL.createObjectURL(new Blob([new Uint8Array(zip)], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url; link.download = pack.files[0].name.replace(/-price-list\.pdf$/, '-pack.zip');
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Used only to create the public fictional samples; customer artwork stays in browser memory. */
export async function generateSampleSVGs(brief: Brief, preset: Preset) {
  const fonts = await validateContent(brief);
  if (preset === 'botanical') {
    assertCharacters(brief.businessName, 'Business name', fonts.serif);
    assertCharacters(brief.featured, 'Featured service or offer', fonts.serif);
  }
  return Object.fromEntries((['price-list', 'services', 'feature', 'booking'] as ArtworkKind[]).map(kind => [kind, renderArtwork(brief, kind, preset, { sample: true }).svg(fonts.css)]));
}
