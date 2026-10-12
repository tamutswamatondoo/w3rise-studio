import type { Brief } from '../../shared/types';
import { SANS, SERIF } from './fonts';

export type Preset = 'botanical' | 'editorial';
export type ArtworkKind = 'price-list' | 'services' | 'feature' | 'booking';
const INK = '#20271f', PAPER = '#f7f5eb';
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]!));
const number = (value: number) => Math.round(value * 100) / 100;
const nfc = (value: string) => value.normalize('NFC').trim();
const money = (value: number) => `$${(value / 100).toFixed(value % 100 ? 2 : 0)}`;

export function contrastInk(hex: string): string {
  const rgb = [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  const light = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  return (light + .05) / .05 > 1.05 / (light + .05) ? '#121512' : '#ffffff';
}

export class Artwork {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  elements: string[] = [];
  height: number;
  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width; this.canvas.height = height;
    this.height = height / width * 1080;
    // Software backing avoids incomplete GPU readbacks on some browser/driver pairs.
    const context = this.canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    if (!context) throw new Error('This browser cannot create artwork. Use an up-to-date desktop browser.');
    this.ctx = context;
    context.scale(width / 1080, width / 1080);
  }
  rect(x: number, y: number, width: number, height: number, color: string) {
    this.ctx.fillStyle = color; this.ctx.fillRect(x, y, width, height);
    this.elements.push(`<rect x="${number(x)}" y="${number(y)}" width="${number(width)}" height="${number(height)}" fill="${color}"/>`);
  }
  path(path: string, fill: string, stroke?: string, strokeWidth = 1) {
    const shape = new Path2D(path);
    if (fill !== 'none') { this.ctx.fillStyle = fill; this.ctx.fill(shape); }
    if (stroke) { this.ctx.strokeStyle = stroke; this.ctx.lineWidth = strokeWidth; this.ctx.stroke(shape); }
    this.elements.push(`<path d="${path}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth}"` : ''}/>`);
  }
  circle(x: number, y: number, radius: number, fill: string) {
    this.ctx.beginPath(); this.ctx.arc(x, y, radius, 0, Math.PI * 2); this.ctx.fillStyle = fill; this.ctx.fill();
    this.elements.push(`<circle cx="${number(x)}" cy="${number(y)}" r="${number(radius)}" fill="${fill}"/>`);
  }
  font(size: number, family: string, weight: number) { this.ctx.font = `${weight} ${size}px ${family}`; }
  measure(text: string, size: number, family = SANS, weight = 400) { this.font(size, family, weight); return this.ctx.measureText(text).width; }
  text(text: string, x: number, y: number, size: number, color = INK, family = SANS, weight = 400) {
    this.font(size, family, weight); this.ctx.fillStyle = color; this.ctx.textBaseline = 'alphabetic';
    this.ctx.fillText(text, x, y + size);
    this.elements.push(`<text x="${number(x)}" y="${number(y + size)}" font-family="${escape(family)}" font-size="${size}" font-weight="${weight}" fill="${color}">${escape(text)}</text>`);
  }
  async png(): Promise<Blob> {
    return new Promise((resolve, reject) => this.canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed. Please try again.')), 'image/png'));
  }
  svg(fontCSS: string) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.canvas.width}" height="${this.canvas.height}" viewBox="0 0 1080 ${number(this.height)}"><defs><style>${fontCSS}</style></defs>${this.elements.join('')}</svg>`;
  }
}

interface Block { lines: string[]; size: number; lineHeight: number; height: number }
function wrap(art: Artwork, value: string, width: number, size: number, family: string, weight: number): string[] {
  const lines: string[] = [];
  for (const paragraph of nfc(value).split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    for (let word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (art.measure(candidate, size, family, weight) <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      if (art.measure(word, size, family, weight) > width) {
        const clusters = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word)].map(item => item.segment);
        word = '';
        for (const cluster of clusters) {
          if (art.measure(word + cluster, size, family, weight) > width) {
            if (!word) throw new Error('A character is too wide for this layout. Please adjust the approved content.');
            lines.push(word); word = cluster;
          } else word += cluster;
        }
      }
      line = word;
    }
    lines.push(line);
  }
  return lines;
}

function fit(art: Artwork, value: string, width: number, maxHeight: number, largest: number, smallest: number, family = SANS, weight = 400, field = 'Content'): Block {
  for (let size = largest; size >= smallest; size -= 2) {
    const lines = wrap(art, value, width, size, family, weight), lineHeight = size * 1.22;
    if (lines.length * lineHeight <= maxHeight) return { lines, size, lineHeight, height: lines.length * lineHeight };
  }
  throw new Error(`${field} cannot fit this layout at a readable size. Shorten the approved text or choose another preset. Nothing has been shortened or clipped.`);
}

function drawBlock(art: Artwork, block: Block, x: number, y: number, color = INK, family = SANS, weight = 400) {
  block.lines.forEach((line, i) => art.text(line, x, y + i * block.lineHeight, block.size, color, family, weight));
  return y + block.height;
}

function leaves(art: Artwork, x: number, y: number, scale: number, color: string) {
  art.path(`M ${x} ${y + 130 * scale} Q ${x + 50 * scale} ${y + 40 * scale} ${x + 120 * scale} ${y}`, 'none', color, 3 * scale);
  for (let i = 0; i < 5; i++) {
    const px = x + i * 21 * scale, py = y + (113 - i * 23) * scale;
    art.path(`M ${px} ${py} Q ${px - 32 * scale} ${py - 42 * scale} ${px - 41 * scale} ${py - 7 * scale} Q ${px - 24 * scale} ${py + 7 * scale} ${px} ${py} Z`, color);
    art.path(`M ${px + 10 * scale} ${py - 9 * scale} Q ${px + 40 * scale} ${py - 22 * scale} ${px + 48 * scale} ${py - 54 * scale} Q ${px + 9 * scale} ${py - 43 * scale} ${px + 10 * scale} ${py - 9 * scale} Z`, color);
  }
}

function decoration(art: Artwork, preset: Preset, accent: string) {
  art.rect(0, 0, 1080, art.height, PAPER);
  if (preset === 'botanical') {
    art.rect(0, 0, 1080, 16, accent);
    leaves(art, 902, 116, .8, accent);
    art.path(`M 42 32 H 1038 V ${number(art.height - 32)} H 42 Z`, 'none', '#c9cdbc', 1.4);
  } else {
    art.rect(0, 0, 24, art.height, accent);
    art.rect(80, 58, 920, 10, INK);
    [0, 1, 2].forEach(i => art.rect(938 + i * 20, 95, 10, 82, accent));
  }
}

function footer(art: Artwork, brief: Brief, bottom: number, sample: boolean, color = INK, width = 900) {
  const contact = sample ? 'Booking contact · sample only' : `WhatsApp ${brief.whatsapp}`;
  const details = [brief.location, contact].filter(Boolean).join('\n');
  const block = fit(art, details, width, 145, 29, 25, SANS, 400, 'Booking details');
  drawBlock(art, block, 90, bottom - block.height, color);
}

function addLogo(art: Artwork, logo: ImageBitmap | undefined, x: number, y: number, maxWidth: number, maxHeight: number) {
  if (!logo) return;
  const ratio = Math.min(maxWidth / logo.width, maxHeight / logo.height);
  const width = logo.width * ratio, height = logo.height * ratio;
  art.ctx.drawImage(logo, x + (maxWidth - width) / 2, y + (maxHeight - height) / 2, width, height);
}

export function renderArtwork(brief: Brief, kind: ArtworkKind, preset: Preset, options: { logo?: ImageBitmap; sample?: boolean } = {}): Artwork {
  const print = kind === 'price-list';
  const art = new Artwork(print ? 1654 : 1080, print ? 2339 : 1920);
  const accent = brief.brandColor, family = preset === 'botanical' ? SERIF : SANS, weight = preset === 'botanical' ? 600 : 700;
  decoration(art, preset, accent);
  const width = 900, right = 990, left = 90, bottom = art.height - 90;
  const label = { 'price-list': 'PRICE LIST', services: 'SERVICES & PRICES', feature: 'IN FOCUS', booking: 'BOOKINGS & ENQUIRIES' }[kind];
  art.text(label, left, 106, 24, INK, SANS, 700);
  addLogo(art, options.logo, 820, 190, 160, 120);
  const brandWidth = options.logo ? 700 : width;
  const brand = fit(art, brief.businessName, brandWidth, print ? 200 : 310, print ? 96 : preset === 'botanical' ? 112 : 92, print ? 36 : 42, family, weight, 'Business name');
  let y = drawBlock(art, brand, left, 208, INK, family, weight) + 24;
  if (brief.tagline) {
    const tagline = fit(art, brief.tagline, width, print ? 84 : 110, 30, 22, SANS, 400, 'Tagline');
    y = drawBlock(art, tagline, left, y) + 30;
  }

  if (kind === 'price-list' || kind === 'services') {
    y += print ? 18 : 50;
    art.rect(left, y, width, 2, accent);
    y += 32;
    const tableBottom = bottom - 190;
    const available = tableBottom - y;
    let rows: { block: Block; height: number; price: string }[] | undefined;
    for (let size = print ? 36 : 39; size >= (print ? 22 : 24); size -= 1) {
      const candidate = brief.services.map(service => {
        const price = money(service.priceCents), priceWidth = art.measure(price, size + 2, SANS, 700);
        const lines = wrap(art, service.name, width - priceWidth - 65, size, SANS, 400), lineHeight = size * 1.22;
        const block = { lines, size, lineHeight, height: lines.length * lineHeight };
        return { block, height: Math.max(block.height, size + 3) + (print ? 20 : 28), price };
      });
      if (candidate.reduce((sum, row) => sum + row.height, 0) <= available) { rows = candidate; break; }
    }
    if (!rows) throw new Error('The full service list cannot fit at a readable size. Shorten the approved service names or choose another preset. No service has been omitted.');
    for (const row of rows) {
      drawBlock(art, row.block, left, y);
      const priceSize = row.block.size + 2;
      art.text(row.price, right - art.measure(row.price, priceSize, SANS, 700), y, priceSize, INK, SANS, 700);
      y += row.height;
      art.rect(left, y - (print ? 12 : 15), width, 1, '#c9cdbc');
    }
    art.text('Prices in USD', left, Math.min(y + 12, tableBottom + 12), 24, INK);
    footer(art, brief, bottom, !!options.sample);
  } else if (kind === 'feature') {
    const panelY = Math.max(y + 60, 700), panelHeight = 670;
    art.rect(0, panelY, 1080, panelHeight, accent);
    const onAccent = contrastInk(accent);
    art.text('FEATURED', left, panelY + 60, 24, onAccent, SANS, 700);
    const feature = fit(art, brief.featured, width, panelHeight - 180, preset === 'botanical' ? 94 : 80, 42, family, weight, 'Featured service or offer');
    drawBlock(art, feature, left, panelY + 130, onAccent, family, weight);
    const exactService = brief.services.find(service => nfc(service.name).toLocaleLowerCase() === nfc(brief.featured).toLocaleLowerCase());
    if (exactService && feature.height <= panelHeight - 290) art.text(`${money(exactService.priceCents)} USD`, left, panelY + panelHeight - 115, 43, onAccent, SANS, 700);
    if (panelY + panelHeight > bottom - 190) throw new Error('The business heading and feature cannot fit together. Shorten the approved business name or tagline, or choose another preset.');
    footer(art, brief, bottom, !!options.sample);
  } else {
    const contactY = Math.max(y + 120, 970);
    if (preset === 'botanical') {
      art.path(`M 90 ${contactY - 70} Q 540 ${contactY - 230} 990 ${contactY - 70}`, 'none', accent, 3);
      leaves(art, 790, contactY - 330, 1.05, accent);
    } else {
      art.rect(left, contactY - 130, 180, 12, accent);
      art.circle(925, contactY - 285, 64, accent);
    }
    art.text('Let’s talk.', left, contactY, 72, INK, family, weight);
    const contact = options.sample ? 'Booking contact\nsample only' : `WhatsApp\n${brief.whatsapp}`;
    const contactBlock = fit(art, contact, width, 210, 43, 32, SANS, 400, 'WhatsApp contact');
    let end = drawBlock(art, contactBlock, left, contactY + 130);
    if (brief.location) {
      const location = fit(art, brief.location, width, 150, 32, 26, SANS, 400, 'Location');
      end = drawBlock(art, location, left, end + 55);
    }
    if (end > bottom - 90) throw new Error('The booking information cannot fit at a readable size. Shorten the approved business name, tagline or location.');
    art.rect(left, bottom - 30, width, 2, accent);
  }
  return art;
}
