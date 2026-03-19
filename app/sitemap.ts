import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { LISTING_TYPES } from "@/lib/listingTypes";
import { allRegions, normalizeRegionText } from "@/lib/regions";
import { getCounties } from "@/lib/counties";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { fetchTypeFacilityCountyCombos } from "@/lib/typeFacilityCountySeo";
import { resolveListingsRouteIndexability } from "@/lib/seoRouteIndexing";
import { resolveRegionCountyNames } from "@/lib/seoListingsCounts";
import { buildTypeCountyPath } from "@/lib/typeCountyRoutes";
import { buildRegionPagePath, buildTypeFacilityCountyPath, buildTypeRegionPath } from "@/lib/locationRoutes";

export const revalidate = 60 * 60 * 12;

type ListingRow = {
  id?: string | null;
  slug?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  type?: string | null;
  judet?: string | null;
  city?: string | null;
};

type AttractionRow = {
  slug?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1);
}

function updateLatest(map: Map<string, Date>, key: string, candidate: Date) {
  const previous = map.get(key);
  if (!previous || candidate > previous) {
    map.set(key, candidate);
  }
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
  let attractionEntries: MetadataRoute.Sitemap = [];
  let attractionsIndexLastModified: Date | undefined;
  try {
    const { data } = await supabaseAdmin
      .from("listings")
      .select("id, slug, updated_at, created_at, type, judet, city")
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

  try {
    const { data } = await supabaseAdmin
      .from("attractions")
      .select("slug, updated_at, created_at")
      .eq("is_published", true);

    const attractionRows = (data || []) as AttractionRow[];
    attractionEntries = attractionRows.flatMap((row) => {
      if (!row?.slug) return [];
      const modified = safeDate(row.updated_at || row.created_at);
      if (!attractionsIndexLastModified || modified > attractionsIndexLastModified) {
        attractionsIndexLastModified = modified;
      }

      return [
        {
          url: `${siteUrl}/atractie/${row.slug}`,
          lastModified: modified,
          changeFrequency: "weekly",
          priority: 0.65,
        },
      ];
    });
  } catch {
    attractionEntries = [];
    attractionsIndexLastModified = undefined;
  }

  const unknownCount = Number.POSITIVE_INFINITY;
  const totalPublishedListings = hasListingsData ? listingRows.length : unknownCount;
  const typeCountsBySlug = new Map<string, number>();
  const countyCountsBySlug = new Map<string, number>();
  const regionCountsBySlug = new Map<string, number>();
  const typeRegionCountsByKey = new Map<string, number>();
  const typeCountyCountsByKey = new Map<string, number>();
  const listingLastModifiedById = new Map<string, Date>();
  const typeLastModifiedBySlug = new Map<string, Date>();
  const countyLastModifiedBySlug = new Map<string, Date>();
  const regionLastModifiedBySlug = new Map<string, Date>();
  const typeRegionLastModifiedByKey = new Map<string, Date>();
  const typeCountyLastModifiedByKey = new Map<string, Date>();
  let latestPublishedListingsDate: Date | undefined;

  for (const row of listingRows) {
    const rowLastModified = safeDate(row.updated_at || row.created_at);
    if (!latestPublishedListingsDate || rowLastModified > latestPublishedListingsDate) {
      latestPublishedListingsDate = rowLastModified;
    }

    const listingId = String(row.id || "").trim();
    if (listingId) {
      listingLastModifiedById.set(listingId, rowLastModified);
    }

    const typeKey = String(row.type || "").trim().toLowerCase();
    const typeSlug = typeSlugByValue.get(typeKey);
    if (typeSlug) {
      increment(typeCountsBySlug, typeSlug);
      updateLatest(typeLastModifiedBySlug, typeSlug, rowLastModified);
    }

    const countyKey = normalizeRegionText(String(row.judet || ""));
    const county = countyByNormalizedName.get(countyKey);
    if (county) {
      increment(countyCountsBySlug, county.slug);
      updateLatest(countyLastModifiedBySlug, county.slug, rowLastModified);
    }
    if (typeSlug && county) {
      const typeCountyKey = `${typeSlug}|${county.slug}`;
      increment(typeCountyCountsByKey, typeCountyKey);
      updateLatest(typeCountyLastModifiedByKey, typeCountyKey, rowLastModified);
    }

    const cityKey = normalizeRegionText(String(row.city || ""));
    for (const matcher of regionMatchers) {
      if (!matcher.countyKeys.has(countyKey)) continue;
      if (matcher.region.type === "metro" && !(matcher.coreCities && matcher.coreCities.has(cityKey))) continue;

      increment(regionCountsBySlug, matcher.region.slug);
      updateLatest(regionLastModifiedBySlug, matcher.region.slug, rowLastModified);
      if (typeSlug) {
        const typeRegionKey = `${typeSlug}|${matcher.region.slug}`;
        increment(typeRegionCountsByKey, typeRegionKey);
        updateLatest(typeRegionLastModifiedByKey, typeRegionKey, rowLastModified);
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
      lastModified: typeLastModifiedBySlug.get(type.slug) || latestPublishedListingsDate || lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  const regionEntries: MetadataRoute.Sitemap = [];
  for (const region of allRegions) {
    const routePath = buildRegionPagePath(region);
    const publishedCount = hasListingsData ? (regionCountsBySlug.get(region.slug) || 0) : unknownCount;
    if (!(await resolveListingsRouteIndexability(routePath, publishedCount))) continue;

    regionEntries.push({
      url: `${siteUrl}${routePath}`,
      lastModified: regionLastModifiedBySlug.get(region.slug) || latestPublishedListingsDate || lastModified,
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
      lastModified: countyLastModifiedBySlug.get(county.slug) || latestPublishedListingsDate || lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  const typeRegionEntries: MetadataRoute.Sitemap = [];
  for (const type of LISTING_TYPES) {
    for (const region of allRegions) {
      const routePath = buildTypeRegionPath(type.slug, region);
      const publishedCount = hasListingsData
        ? (typeRegionCountsByKey.get(`${type.slug}|${region.slug}`) || 0)
        : unknownCount;
      if (!(await resolveListingsRouteIndexability(routePath, publishedCount))) continue;

      typeRegionEntries.push({
        url: `${siteUrl}${routePath}`,
        lastModified:
          typeRegionLastModifiedByKey.get(`${type.slug}|${region.slug}`) ||
          regionLastModifiedBySlug.get(region.slug) ||
          typeLastModifiedBySlug.get(type.slug) ||
          latestPublishedListingsDate ||
          lastModified,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  const typeCountyEntries: MetadataRoute.Sitemap = [];
  for (const type of LISTING_TYPES) {
    for (const county of getCounties()) {
      const routePath = buildTypeCountyPath(type.slug, county.slug);
      const publishedCount = hasListingsData
        ? (typeCountyCountsByKey.get(`${type.slug}|${county.slug}`) || 0)
        : unknownCount;
      if (!(await resolveListingsRouteIndexability(routePath, publishedCount))) continue;

      typeCountyEntries.push({
        url: `${siteUrl}${routePath}`,
        lastModified:
          typeCountyLastModifiedByKey.get(`${type.slug}|${county.slug}`) ||
          countyLastModifiedBySlug.get(county.slug) ||
          typeLastModifiedBySlug.get(type.slug) ||
          latestPublishedListingsDate ||
          lastModified,
        changeFrequency: "weekly",
        priority: 0.58,
      });
    }
  }

  let typeFacilityCountyEntries: MetadataRoute.Sitemap = [];
  try {
    const combos = await fetchTypeFacilityCountyCombos(supabaseAdmin, { publishedOnly: true });
    const filtered: MetadataRoute.Sitemap = [];
    for (const combo of combos) {
      const routePath = buildTypeFacilityCountyPath(
        combo.typeSlug,
        combo.countySlug,
        combo.facilitySlug
      );
      if (!(await resolveListingsRouteIndexability(routePath, combo.listingIds.length))) continue;
      const comboLastModified = combo.listingIds.reduce<Date | undefined>((latestDate, listingId) => {
        const candidate = listingLastModifiedById.get(listingId);
        if (!candidate) return latestDate;
        return !latestDate || candidate > latestDate ? candidate : latestDate;
      }, undefined);
      filtered.push({
        url: `${siteUrl}${routePath}`,
        lastModified:
          comboLastModified ||
          typeCountyLastModifiedByKey.get(`${combo.typeSlug}|${combo.countySlug}`) ||
          countyLastModifiedBySlug.get(combo.countySlug) ||
          typeLastModifiedBySlug.get(combo.typeSlug) ||
          latestPublishedListingsDate ||
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
            lastModified: latestPublishedListingsDate || lastModified,
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
    {
      url: `${siteUrl}/contact`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/atractii`,
      lastModified: attractionsIndexLastModified || lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...attractionEntries,
    ...regionEntries,
    ...countyEntries,
    ...typeRegionEntries,
    ...typeCountyEntries,
    ...typeFacilityCountyEntries,
    ...listingEntries,
  ];
}
