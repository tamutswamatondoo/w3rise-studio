const MAX_BYTES = 4 * 1024 * 1024;
const MAX_DIMENSION = 4096;

function dimensions(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const png = [137, 80, 78, 71, 13, 10, 26, 10];
  if (png.every((value, i) => bytes[i] === value)) {
    if (bytes.length < 24 || view.getUint32(12) !== 0x49484452) throw new Error('This PNG has an invalid header.');
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    let position = 2;
    while (position + 4 <= bytes.length) {
      if (bytes[position] !== 255) throw new Error('This JPEG has an invalid header.');
      while (bytes[position] === 255) position++;
      const marker = bytes[position++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (position + 2 > bytes.length) break;
      const length = view.getUint16(position);
      if (length < 2 || position + length > bytes.length) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        if (length < 8) break;
        return { width: view.getUint16(position + 5), height: view.getUint16(position + 3) };
      }
      position += length;
    }
  }
  throw new Error('Choose a valid PNG or JPEG logo. SVG and other formats are not accepted.');
}

export async function validateLogo(file: File): Promise<void> {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Choose a PNG or JPEG logo. SVG and other formats are not accepted.');
  if (file.size === 0 || file.size > MAX_BYTES) throw new Error('The logo must be smaller than 4 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png = bytes[0] === 137;
  if ((png && file.type !== 'image/png') || (!png && file.type !== 'image/jpeg')) throw new Error('The logo content does not match its file type.');
  const size = dimensions(bytes);
  if (size.width < 1 || size.height < 1 || size.width > MAX_DIMENSION || size.height > MAX_DIMENSION) throw new Error('The logo must be between 1 and 4096 pixels in each dimension.');
  let decoded: ImageBitmap;
  try { decoded = await createImageBitmap(file); } catch { throw new Error('The logo could not be decoded. Export it as a fresh PNG or JPEG.'); }
  if (decoded.width < 1 || decoded.height < 1 || decoded.width > MAX_DIMENSION || decoded.height > MAX_DIMENSION) {
    decoded.close();
    throw new Error('The decoded logo is too large. Use at most 4096 pixels in each dimension.');
  }
  decoded.close();
}
