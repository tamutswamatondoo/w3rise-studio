import sansLatin from '@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff?url';
import sansExtended from '@fontsource/dm-sans/files/dm-sans-latin-ext-400-normal.woff?url';
import sansBoldLatin from '@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff?url';
import sansBoldExtended from '@fontsource/dm-sans/files/dm-sans-latin-ext-700-normal.woff?url';
import serifLatin from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff?url';
import serifExtended from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-ext-600-normal.woff?url';

export const SANS = '"W3 Sans", "W3 Sans Extended"';
export const SERIF = '"W3 Serif", "W3 Serif Extended"';
const definitions = [
  ['W3 Sans', sansLatin, '400'], ['W3 Sans Extended', sansExtended, '400'],
  ['W3 Sans', sansBoldLatin, '700'], ['W3 Sans Extended', sansBoldExtended, '700'],
  ['W3 Serif', serifLatin, '600'], ['W3 Serif Extended', serifExtended, '600'],
] as const;
type Coverage = (point: number) => boolean;
let loading: Promise<{ sans: Coverage; serif: Coverage; css: string }> | undefined;

async function cmapCoverage(buffer: ArrayBuffer): Promise<Coverage> {
  const source = new DataView(buffer);
  if (source.getUint32(0) !== 0x774f4646) throw new Error('The bundled production font is invalid.');
  let table: Uint8Array | undefined;
  for (let i = 0; i < source.getUint16(12); i++) {
    const record = 44 + i * 20;
    if (source.getUint32(record) !== 0x636d6170) continue;
    const start = source.getUint32(record + 4), compressed = source.getUint32(record + 8), original = source.getUint32(record + 12);
    const bytes = buffer.slice(start, start + compressed);
    table = compressed === original ? new Uint8Array(bytes) : new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  }
  if (!table) throw new Error('The bundled font has no character map.');
  const view = new DataView(table.buffer, table.byteOffset, table.byteLength);
  const maps: Coverage[] = [];
  for (let i = 0; i < view.getUint16(2); i++) {
    const at = view.getUint32(4 + i * 8 + 4), format = view.getUint16(at);
    if (format === 12) {
      const groups = view.getUint32(at + 12);
      maps.push(point => {
        for (let n = 0; n < groups; n++) {
          const group = at + 16 + n * 12, first = view.getUint32(group), last = view.getUint32(group + 4);
          if (point >= first && point <= last) return view.getUint32(group + 8) + point - first !== 0;
        }
        return false;
      });
    } else if (format === 4) {
      const count = view.getUint16(at + 6) / 2, end = at + 14, start = end + count * 2 + 2, delta = start + count * 2, ranges = delta + count * 2;
      maps.push(point => {
        if (point > 65535) return false;
        for (let n = 0; n < count; n++) {
          if (point < view.getUint16(start + n * 2) || point > view.getUint16(end + n * 2)) continue;
          const shift = view.getInt16(delta + n * 2), range = view.getUint16(ranges + n * 2);
          if (range === 0) return ((point + shift) & 65535) !== 0;
          const position = ranges + n * 2 + range + (point - view.getUint16(start + n * 2)) * 2;
          const glyph = position < view.byteLength - 1 ? view.getUint16(position) : 0;
          return glyph !== 0 && ((glyph + shift) & 65535) !== 0;
        }
        return false;
      });
    }
  }
  return point => maps.some(map => map(point));
}

function base64(bytes: Uint8Array): string {
  let value = '';
  for (let i = 0; i < bytes.length; i += 8192) value += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(value);
}

export function loadProductionFonts() {
  loading ??= (async () => {
    const records = await Promise.all(definitions.map(async ([family, url, weight]) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Production fonts could not load. Please reload before generating.');
      const bytes = await response.arrayBuffer();
      const face = new FontFace(family, bytes, { weight });
      document.fonts.add(await face.load());
      return { family, weight, coverage: await cmapCoverage(bytes), css: `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};src:url(data:font/woff;base64,${base64(new Uint8Array(bytes))}) format('woff');}` };
    }));
    await document.fonts.ready;
    return {
      sans: (point: number) => records.filter(row => row.family.startsWith('W3 Sans') && row.weight === '400').some(row => row.coverage(point)),
      serif: (point: number) => records.filter(row => row.family.startsWith('W3 Serif')).some(row => row.coverage(point)),
      css: records.map(row => row.css).join(''),
    };
  })().catch(error => { loading = undefined; throw error; });
  return loading;
}

export function assertCharacters(text: string, field: string, coverage: Coverage) {
  for (const char of text.normalize('NFC')) {
    if (char === '\n' || char === '\r' || char === '\t') continue;
    if (!coverage(char.codePointAt(0)!)) throw new Error(`${field} contains an unsupported character “${char}” (U+${char.codePointAt(0)!.toString(16).toUpperCase()}). Use supported text before generating; nothing has been shortened.`);
  }
}
