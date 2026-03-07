import sharp from "sharp";
import { toListingCardVariantPath } from "@/lib/listingImagePaths";

export const LISTING_CARD_WIDTH = 720;
export const LISTING_CARD_QUALITY = 72;

export async function buildListingCardVariantBuffer(sourceBuffer: Buffer): Promise<Buffer> {
  return sharp(sourceBuffer)
    .rotate()
    .resize({ width: LISTING_CARD_WIDTH, withoutEnlargement: true })
    .webp({ quality: LISTING_CARD_QUALITY })
    .toBuffer();
}

export { toListingCardVariantPath };
