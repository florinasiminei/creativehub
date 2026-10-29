import sharp from "sharp";
import { LISTING_RESPONSIVE_WIDTHS, toListingCardVariantPath, toListingResponsiveVariantPath } from "@/lib/listingImagePaths";
import { uploadBufferToR2 } from "@/lib/server/r2";

export const LISTING_CARD_WIDTH = 720;
export const LISTING_CARD_QUALITY = 72;

export async function buildListingCardVariantBuffer(sourceBuffer: Buffer): Promise<Buffer> {
  return sharp(sourceBuffer)
    .rotate()
    .resize({ width: LISTING_CARD_WIDTH, withoutEnlargement: true })
    .webp({ quality: LISTING_CARD_QUALITY })
    .toBuffer();
}

export async function* buildListingResponsiveVariants(sourceBuffer: Buffer) {
  const metadata = await sharp(sourceBuffer).metadata();
  const sourceWidth = (metadata.orientation || 1) >= 5 ? metadata.height : metadata.width;
  if (!sourceWidth) throw new Error('Invalid image dimensions');

  for (const width of LISTING_RESPONSIVE_WIDTHS) {
    // Width descriptors must match the file. Small originals fall back to their original URL.
    if (width > sourceWidth) break;
    const buffer = await sharp(sourceBuffer)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: LISTING_CARD_QUALITY })
      .toBuffer();
    yield { width, buffer };
  }
}

export async function uploadResponsiveImageVariants(sourcePath: string, sourceBuffer: Buffer) {
  let maxWidth = 0;
  for await (const { width, buffer } of buildListingResponsiveVariants(sourceBuffer)) {
    await uploadBufferToR2(toListingResponsiveVariantPath(sourcePath, width), buffer, 'image/webp');
    maxWidth = width;
  }
  return maxWidth;
}

export { toListingCardVariantPath };
