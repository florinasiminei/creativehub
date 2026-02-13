import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { LISTING_TYPES } from "@/lib/listingTypes";
import { allRegions, normalizeRegionText, touristRegions } from "@/lib/regions";
import { getCounties } from "@/lib/counties";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { fetchTypeFacilityCountyCombos } from "@/lib/typeFacilityCountySeo";
import { resolveListingsRouteIndexability } from "@/lib/seoRouteIndexing";
import { resolveRegionCountyNames } from "@/lib/seoListingsCounts";

export const revalidate = 60 * 60 * 12;

type ListingRow = {
  slug?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  type?: string | null;
  judet?: string | null;
  city?: string | null;
};

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1);
}

function resolveRegionCountyKeys(regionCounties: string[]): Set<string> {
  return new Set(resolveRegionCountyNames(regionCounties).map((county) => normalizeRegionText(county)));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getCanonicalSiteUrl();
  const lastModified = new Date();
  const supabaseAdmin = getSupabaseAdmin();
  const typeSlugByValue = new Map<string, string>(
    LISTING_TYPES.map((type) => [type.value, type.slug] as const)
  );
  const countyByNormalizedName = new Map(
    getCounties().map((county) => [normalizeRegionText(county.name), county] as const)
  );
  const regionMatchers = allRegions.map((region) => ({
    region,
    countyKeys: resolveRegionCountyKeys(region.counties),
    coreCities:
      region.type === "metro"
        ? new Set((region.coreCities || []).map((city) => normalizeRegionText(city)))
        : null,
  }));

  const safeDate = (value: unknown) => {
    const candidate = value ? new Date(String(value)) : null;
    if (candidate && !Number.isNaN(candidate.getTime())) return candidate;
    return lastModified;
  };

  let listingRows: ListingRow[] = [];
  let hasListingsData = false;
  let listingEntries: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabaseAdmin
      .from("listings")
      .select("slug, updated_at, created_at, type, judet, city")
      .eq("is_published", true);

    listingRows = (data || []) as ListingRow[];
    hasListingsData = true;

    listingEntries = listingRows.flatMap((row) => {
      if (!row?.slug) return [];
      return [
        {
          url: `${siteUrl}/cazare/${row.slug}`,
          lastModified: safeDate(row.updated_at || row.created_at),
          changeFrequency: "weekly",
          priority: 0.8,
        },
      ];
    });
  } catch {
    // Keep sitemap available even if the listings query fails.
    listingEntries = [];
    listingRows = [];
    hasListingsData = false;
  }

  const unknownCount = Number.POSITIVE_INFINITY;
  const totalPublishedListings = hasListingsData ? listingRows.length : unknownCount;
  const typeCountsBySlug = new Map<string, number>();
  const countyCountsBySlug = new Map<string, number>();
  const regionCountsBySlug = new Map<string, number>();
  const typeRegionCountsByKey = new Map<string, number>();

  for (const row of listingRows) {
    const typeKey = String(row.type || "").trim().toLowerCase();
    const typeSlug = typeSlugByValue.get(typeKey);
    if (typeSlug) increment(typeCountsBySlug, typeSlug);

    const countyKey = normalizeRegionText(String(row.judet || ""));
    const county = countyByNormalizedName.get(countyKey);
    if (county) increment(countyCountsBySlug, county.slug);

    const cityKey = normalizeRegionText(String(row.city || ""));
    for (const matcher of regionMatchers) {
      if (!matcher.countyKeys.has(countyKey)) continue;
      if (matcher.region.type === "metro" && !(matcher.coreCities && matcher.coreCities.has(cityKey))) continue;

      increment(regionCountsBySlug, matcher.region.slug);
      if (typeSlug && matcher.region.type === "touristic") {
        increment(typeRegionCountsByKey, `${typeSlug}|${matcher.region.slug}`);
      }
    }
  }

  const listingTypeEntries: MetadataRoute.Sitemap = [];
  for (const type of LISTING_TYPES) {
    const routePath = `/cazari/${type.slug}`;
    const publishedCount = hasListingsData ? (typeCountsBySlug.get(type.slug) || 0) : unknownCount;
    if (!(await resolveListingsRouteIndexability(routePath, publishedCount))) continue;

    listingTypeEntries.push({
      url: `${siteUrl}${routePath}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  const regionEntries: MetadataRoute.Sitemap = [];
  for (const region of allRegions) {
    const routePath = `/regiune/${region.slug}`;
    const publishedCount = hasListingsData ? (regionCountsBySlug.get(region.slug) || 0) : unknownCount;
    if (!(await resolveListingsRouteIndexability(routePath, publishedCount))) continue;

    regionEntries.push({
      url: `${siteUrl}${routePath}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  const countyEntries: MetadataRoute.Sitemap = [];
  for (const county of getCounties()) {
    const routePath = `/judet/${county.slug}`;
    const publishedCount = hasListingsData ? (countyCountsBySlug.get(county.slug) || 0) : unknownCount;
    if (!(await resolveListingsRouteIndexability(routePath, publishedCount))) continue;

    countyEntries.push({
      url: `${siteUrl}${routePath}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  const typeRegionEntries: MetadataRoute.Sitemap = [];
  for (const type of LISTING_TYPES) {
    for (const region of touristRegions) {
      const routePath = `/cazari/${type.slug}/${region.slug}`;
      const publishedCount = hasListingsData
        ? (typeRegionCountsByKey.get(`${type.slug}|${region.slug}`) || 0)
        : unknownCount;
      if (!(await resolveListingsRouteIndexability(routePath, publishedCount))) continue;

      typeRegionEntries.push({
        url: `${siteUrl}${routePath}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  let typeFacilityCountyEntries: MetadataRoute.Sitemap = [];
  try {
    const combos = await fetchTypeFacilityCountyCombos(supabaseAdmin, { publishedOnly: true });
    const filtered: MetadataRoute.Sitemap = [];
    for (const combo of combos) {
      const routePath = `/cazari/${combo.typeSlug}/${combo.facilitySlug}/${combo.countySlug}`;
      if (!(await resolveListingsRouteIndexability(routePath, combo.listingIds.length))) continue;
      filtered.push({
        url: `${siteUrl}${routePath}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.55,
      });
    }
    typeFacilityCountyEntries = filtered;
  } catch {
    typeFacilityCountyEntries = [];
  }

  const shouldIncludeCazariIndex = await resolveListingsRouteIndexability(
    "/cazari",
    totalPublishedListings
  );

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    ...(shouldIncludeCazariIndex
      ? [
          {
            url: `${siteUrl}/cazari`,
            lastModified,
            changeFrequency: "weekly",
            priority: 0.8,
          } satisfies MetadataRoute.Sitemap[number],
        ]
      : []),
    ...listingTypeEntries,
    {
      url: `${siteUrl}/about-us`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/servicii`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...regionEntries,
    ...countyEntries,
    ...typeRegionEntries,
    ...typeFacilityCountyEntries,
    ...listingEntries,
  ];
}
