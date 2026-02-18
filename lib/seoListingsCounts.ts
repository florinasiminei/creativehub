import { findCountyBySlug, getCounties } from "./counties";
import { normalizeRegionText } from "./regions";
import { slugify } from "./utils";

type SupabaseAdminLike = {
  from: (table: string) => {
    select: (columns: string, options?: Record<string, unknown>) => any;
  };
};

export type RegionCountInput = {
  counties: string[];
  type: string;
  coreCities?: string[];
};

export function resolveRegionCountyNames(regionCounties: string[]): string[] {
  const counties = getCounties();
  const byKey = new Map(counties.map((county) => [normalizeRegionText(county.name), county.name] as const));
  const resolved = regionCounties
    .map((county) => {
      const byNormalized = byKey.get(normalizeRegionText(county));
      if (byNormalized) return byNormalized;
      const fuzzy = findCountyBySlug(slugify(String(county || "")));
      return fuzzy?.name || county;
    })
    .filter(Boolean);
  return Array.from(new Set(resolved));
}

function countRowsForRegion(
  rows: Array<{ city?: string | null }>,
  region: RegionCountInput
): number {
  if (region.type !== "metro") return rows.length;

  const normalizedMetroCities = region.coreCities
    ? new Set(region.coreCities.map((city) => normalizeRegionText(city)))
    : null;

  let count = 0;
  for (const row of rows) {
    const cityNorm = normalizeRegionText(String(row?.city || ""));
    if (normalizedMetroCities && normalizedMetroCities.has(cityNorm)) count += 1;
  }
  return count;
}

export async function countPublishedListings(supabaseAdmin: SupabaseAdminLike): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);

  if (error) return Number.POSITIVE_INFINITY;
  return Number(count || 0);
}

export async function countPublishedListingsByType(
  supabaseAdmin: SupabaseAdminLike,
  typeValue: string
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .eq("type", typeValue);

  if (error) return Number.POSITIVE_INFINITY;
  return Number(count || 0);
}

export async function countPublishedListingsByCounty(
  supabaseAdmin: SupabaseAdminLike,
  countyName: string
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .eq("judet", countyName);

  if (error) return Number.POSITIVE_INFINITY;
  return Number(count || 0);
}

export async function countPublishedListingsByTypeAndCounty(
  supabaseAdmin: SupabaseAdminLike,
  typeValue: string,
  countyName: string
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .eq("type", typeValue)
    .eq("judet", countyName);

  if (error) return Number.POSITIVE_INFINITY;
  return Number(count || 0);
}

export async function countPublishedListingsByRegion(
  supabaseAdmin: SupabaseAdminLike,
  region: RegionCountInput
): Promise<number> {
  const countyNames = resolveRegionCountyNames(region.counties);
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("city")
    .eq("is_published", true)
    .in("judet", countyNames);

  if (error) return Number.POSITIVE_INFINITY;
  return countRowsForRegion((data || []) as Array<{ city?: string | null }>, region);
}

export async function countPublishedListingsByTypeAndRegion(
  supabaseAdmin: SupabaseAdminLike,
  typeValue: string,
  region: RegionCountInput
): Promise<number> {
  const countyNames = resolveRegionCountyNames(region.counties);
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("city")
    .eq("is_published", true)
    .eq("type", typeValue)
    .in("judet", countyNames);

  if (error) return Number.POSITIVE_INFINITY;
  return countRowsForRegion((data || []) as Array<{ city?: string | null }>, region);
}
