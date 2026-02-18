import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { hasMinimumPublishedListings } from "@/lib/seoIndexing";
import { getSeoIndexable, getSeoPageUrl } from "@/lib/seoPages";

const REGION_URL_ALIASES = new Map<string, string>([
  ["/regiune/transilvania", "/regiune/transilvania-rurala"],
]);

const GEO_ZONE_CACHE_TTL_MS = 60 * 1000;

let geoZoneIndexCache: Record<string, boolean> | null = null;
let geoZoneCacheExpiresAt = 0;
let geoZoneLoadPromise: Promise<Record<string, boolean>> | null = null;

export function invalidateGeoZoneIndexCache() {
  geoZoneIndexCache = null;
  geoZoneCacheExpiresAt = 0;
  geoZoneLoadPromise = null;
}

function canonicalizeRegionUrl(path: string): string {
  const normalized = String(path || "").trim().toLowerCase();
  return REGION_URL_ALIASES.get(normalized) || normalized;
}

function canonicalizeSeoRoutePath(path: string): string {
  return canonicalizeRegionUrl(path);
}

export function normalizeSeoRoutePath(path: string): string | null {
  const normalized = getSeoPageUrl({ path });
  if (!normalized) return null;
  return canonicalizeSeoRoutePath(normalized);
}

async function loadGeoZoneIndexMap(): Promise<Record<string, boolean>> {
  const now = Date.now();
  if (geoZoneIndexCache && now < geoZoneCacheExpiresAt) return geoZoneIndexCache;
  if (geoZoneLoadPromise) return geoZoneLoadPromise;

  geoZoneLoadPromise = (async () => {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin.from("geo_zones").select("*");
      if (error || !data) {
        geoZoneIndexCache = {};
      } else {
        const next: Record<string, boolean> = {};
        for (const row of data as Array<Record<string, unknown>>) {
          const routePath = getSeoPageUrl(row);
          if (!routePath) continue;
          next[canonicalizeSeoRoutePath(routePath)] = getSeoIndexable(row);
        }
        geoZoneIndexCache = next;
      }
    } catch {
      geoZoneIndexCache = {};
    } finally {
      geoZoneCacheExpiresAt = Date.now() + GEO_ZONE_CACHE_TTL_MS;
      geoZoneLoadPromise = null;
    }

    return geoZoneIndexCache || {};
  })();

  return geoZoneLoadPromise;
}

export async function getGeoZoneIndexability(path: string): Promise<boolean | null> {
  const normalizedPath = normalizeSeoRoutePath(path);
  if (!normalizedPath) return null;

  const map = await loadGeoZoneIndexMap();
  if (!Object.prototype.hasOwnProperty.call(map, normalizedPath)) return null;
  return map[normalizedPath];
}

export async function resolveListingsRouteIndexability(
  path: string,
  publishedListingsCount: number
): Promise<boolean> {
  if (!hasMinimumPublishedListings(publishedListingsCount)) return false;
  const geoIndexable = await getGeoZoneIndexability(path);
  return geoIndexable ?? true;
}
