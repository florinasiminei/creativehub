import 'server-only';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { downloadBufferFromR2, getR2ObjectKeyFromUrl, getR2ObjectMetadata, getR2PublicUrl, uploadBufferToR2 } from '@/lib/server/r2';
import type { PromotionImage, PromotionSource } from '@/lib/social/instagram';

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

async function readImage(url: string) {
  const r2Key = getR2ObjectKeyFromUrl(url);
  if (r2Key) {
    const metadata = await getR2ObjectMetadata(r2Key);
    if (metadata.contentLength !== null && metadata.contentLength > MAX_SOURCE_BYTES) throw new Error('Fotografia depășește limita de 15 MB.');
    const bytes = await downloadBufferFromR2(r2Key);
    if (bytes.length > MAX_SOURCE_BYTES) throw new Error('Fotografia depășește limita de 15 MB.');
    return bytes;
  }
  const parsed = new URL(url);
  const storageOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!storageOrigin || parsed.origin !== new URL(storageOrigin).origin || !parsed.pathname.startsWith('/storage/v1/object/public/')) {
    throw new Error('Fotografia trebuie să provină din galeria CABN.');
  }
  const response = await fetch(parsed, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) });
  if (!response.ok || !response.body || Number(response.headers.get('content-length')) > MAX_SOURCE_BYTES) {
    throw new Error('Fotografia nu a putut fi încărcată.');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > MAX_SOURCE_BYTES) throw new Error('Fotografia depășește limita de 15 MB.');
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks);
}

function xml(text: string) {
  return text.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]!));
}

function titleLines(title: string) {
  const words = title.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > 25 && line) { lines.push(line); line = ''; }
    line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 3).map((value, index) => `<text x="72" y="${1010 + index * 72}" font-size="60" font-weight="700">${xml(value.slice(0, 32))}</text>`).join('');
}

export async function renderInstagramImages(source: PromotionSource, images: PromotionImage[]) {
  const version = randomUUID();
  const urls: string[] = [];
  // Sequential rendering keeps memory bounded on the existing Node runtime.
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const original = source.images.find((item) => item.id === image.imageId);
    if (!original) throw new Error('O fotografie nu mai există în galeria cazării.');
    const bytes = await readImage(original.url);
    const metadata = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata();
    if (!metadata.format || !['jpeg', 'png', 'webp', 'avif', 'heif'].includes(metadata.format)) {
      throw new Error('Fotografia trebuie să fie JPG, PNG, WebP sau AVIF.');
    }
    const cropped = await sharp(bytes, { limitInputPixels: 40_000_000 })
      .rotate().resize(1080, 1350, { fit: 'cover', position: image.position }).toBuffer();
    const overlay = index === 0 ? Buffer.from(`<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#052e2b" stop-opacity="0"/><stop offset="1" stop-color="#052e2b" stop-opacity="0.95"/></linearGradient></defs>
      <rect y="650" width="1080" height="700" fill="url(#shade)"/>
      <g font-family="sans-serif" fill="white"><text x="72" y="930" font-size="28" letter-spacing="5">CAZARE NOUĂ PE CABN</text>${titleLines(source.title)}
      <text x="72" y="1265" font-size="30">${xml(source.location.slice(0, 55))}</text></g></svg>`) : null;
    const output = await sharp(cropped).composite(overlay ? [{ input: overlay }] : []).jpeg({ quality: 90 }).toBuffer();
    const key = `social/instagram/${source.id}/${version}/${index + 1}.jpg`;
    await uploadBufferToR2(key, output, 'image/jpeg');
    urls.push(getR2PublicUrl(key));
  }
  return urls;
}
