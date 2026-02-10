export const CANONICAL_SITE_URL = "https://www.cabn.ro";

export function getCanonicalSiteUrl() {
  return CANONICAL_SITE_URL;
}

export function toCanonicalUrl(pathname: string) {
  return new URL(pathname, CANONICAL_SITE_URL).toString();
}
