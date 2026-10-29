import variantLimits from './listingImageVariantLimits.json';

export const LISTING_RESPONSIVE_WIDTHS = [160, 320, 480, 720, 1080, 1440, 1920] as const;
const availableWidthsByImage: Record<string, number[]> = variantLimits;

function splitPath(pathValue: string): { directory: string; filename: string } | null {
  const slashIndex = pathValue.lastIndexOf("/");
  if (slashIndex <= 0 || slashIndex === pathValue.length - 1) return null;
  return {
    directory: pathValue.slice(0, slashIndex),
    filename: pathValue.slice(slashIndex + 1),
  };
}

export function toListingCardVariantPath(sourcePath: string): string {
  if (!sourcePath) return sourcePath;
  const parts = splitPath(sourcePath);
  if (!parts) return sourcePath;
  if (parts.filename.startsWith("card_")) return sourcePath;

  const baseName = parts.filename.replace(/\.[^.]+$/, "");
  return `${parts.directory}/card_${baseName}.webp`;
}

export function toListingCardVariantUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    const decodedPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (!decodedPath.startsWith("listings/")) return rawUrl;

    const cardPath = toListingCardVariantPath(decodedPath);
    if (cardPath === decodedPath) return rawUrl;

    const encodedPath = cardPath
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    url.pathname = `/${encodedPath}`;
    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function toListingResponsiveVariantPath(sourcePath: string, width: number): string {
  const parts = splitPath(sourcePath);
  if (!parts) return sourcePath;
  const filename = parts.filename.replace(/^card_/, '').replace(/\.[^.]+$/, '');
  return `${parts.directory}/responsive_v1_${width}_${filename}.webp`;
}

export function getListingImageVariantPaths(sourcePath: string): string[] {
  return [
    toListingCardVariantPath(sourcePath),
    ...LISTING_RESPONSIVE_WIDTHS.map((width) => toListingResponsiveVariantPath(sourcePath, width)),
  ];
}

export function toListingResponsiveVariantUrl(rawUrl: string, width: number): string | undefined {
  try {
    const url = new URL(rawUrl);
    const sourcePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    // Only uploaded property/attraction photos have variants; leave other assets and previews alone.
    if (!['https:', 'http:'].includes(url.protocol) || !/^(listings|attractions)\//.test(sourcePath)) return undefined;
    if (sourcePath.split('/').pop()?.startsWith('responsive_v1_')) return undefined;
    if (!getListingResponsiveWidths(rawUrl).includes(width)) return undefined;
    url.pathname = '/' + toListingResponsiveVariantPath(sourcePath, width)
      .split('/').map((segment) => encodeURIComponent(segment)).join('/');
    return url.toString();
  } catch {
    return undefined;
  }
}

function getListingResponsiveWidths(rawUrl: string): readonly number[] {
  try {
    const url = new URL(rawUrl);
    const sourcePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const imageKey = sourcePath.replace(/(^|\/)card_/, '$1').replace(/\.[^/.]+$/, '');
    const maxWidth = url.searchParams.get('r2w');
    if (maxWidth !== null && /^\d+$/.test(maxWidth)) {
      return LISTING_RESPONSIVE_WIDTHS.filter((width) => width <= Number(maxWidth));
    }
    return availableWidthsByImage[imageKey] || LISTING_RESPONSIVE_WIDTHS;
  } catch {
    return [];
  }
}

export function getListingResponsiveSrcSet(rawUrl: string): string | undefined {
  const candidates = getListingResponsiveWidths(rawUrl).map((width) => {
    const url = toListingResponsiveVariantUrl(rawUrl, width);
    return url ? `${url} ${width}w` : '';
  }).filter(Boolean);
  return candidates.length ? candidates.join(', ') : undefined;
}

export function withListingImageVariantLimit(rawUrl: string, maxWidth: number): string {
  const url = new URL(rawUrl);
  // Record the available widths without adding a database column or enlarging the original.
  url.searchParams.set('r2w', String(maxWidth));
  return url.toString();
}
