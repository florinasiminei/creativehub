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
