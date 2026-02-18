export const revalidate = 0;

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getRoleFromEncodedAuth } from "@/lib/draftsAuth";
import { getTypeBySlug, LISTING_TYPES } from "@/lib/listingTypes";
import { findCountyBySlug, getCounties } from "@/lib/counties";
import { fetchTypeFacilityCountyCombos, type TypeFacilityCountyCombo } from "@/lib/typeFacilityCountySeo";
import { hasMinimumPublishedListings } from "@/lib/seoIndexing";
import { slugify } from "@/lib/utils";
import {
  allRegions,
  findRegionBySlug,
  normalizeRegionText,
  type RegionDefinition,
  type RegionType,
} from "@/lib/regions";
import {
  getSeoIndexable,
  getSeoMenuVisibility,
  getSeoPageLastModifiedMs,
  getSeoPageSlug,
  getSeoPageStatus,
  getSeoPageTitle,
  getSeoPageUrl,
  getSeoToggleMeta,
  type SeoPageStatus,
} from "@/lib/seoPages";
import { buildTypeCountyPath } from "@/lib/typeCountyRoutes";
import {
  buildRegionPagePath,
  buildTypeFacilityCountyPath,
  buildTypeRegionPath,
  parseListingLocationSegment,
} from "@/lib/locationRoutes";
import SeoAdminClient from "./seo-admin-client";

type ListingMeta = {
  id: string;
  isPublished: boolean;
  slug: string;
  title: string;
  typeKey: string;
  judetKey: string;
  cityKey: string;
  lastModifiedMs: number | null;
};

type AttractionMeta = {
  id: string;
  isPublished: boolean;
  slug: string;
  title: string;
  lastModifiedMs: number | null;
};

const REGION_URL_ALIASES = new Map<string, string>([
  ["/regiune/transilvania", "/regiune/transilvania-rurala"],
]);

function canonicalizeRegionUrl(url: string | null): string | null {
  if (!url) return url;
  const normalized = String(url).trim().toLowerCase();
  return REGION_URL_ALIASES.get(normalized) || url;
}

function slugFromRegionUrl(url: string | null, fallback: string): string {
  if (!url) return fallback;
  const match = String(url).trim().toLowerCase().match(/^\/(?:regiune|localitate)\/([^/?#]+)/);
  return match?.[1] || fallback;
}

type SeoPageItem = {
  id: string;
  slug: string;
  url: string | null;
  openUrl?: string | null;
  pageKind:
    | "home"
    | "cazari_index"
    | "atractii_index"
    | "type"
    | "judet"
    | "type_judet"
    | "regiune"
    | "localitate"
    | "type_region"
    | "type_localitate"
    | "type_facility_judet"
    | "listing"
    | "atractie"
    | "static"
    | "geo_zone";
  title: string;
  status: SeoPageStatus;
  inMenu: boolean;
  indexable: boolean;
  totalListings: number;
  publishedListings: number;
  unpublishedListings: number;
  lastModifiedMs: number | null;
  canTogglePublish: boolean;
  canToggleIndex: boolean;
  pageviews1h: number;
  uniqueVisitors1h: number;
  pageviews6h: number;
  uniqueVisitors6h: number;
  pageviews1d: number;
  uniqueVisitors1d: number;
  pageviews30d: number;
  uniqueVisitors30d: number;
  pageviews7d: number;
  uniqueVisitors7d: number;
  lastSeenViewMs: number | null;
  isInconsistent: boolean;
};

async function fetchListingsMeta(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, ids: string[]) {
  const selectVariants = [
    "id, title, slug, is_published, type, judet, city, updated_at, created_at",
    "id, title, slug, is_published, type, judet, city, created_at",
  ];

  for (const select of selectVariants) {
    let query = supabaseAdmin.from("listings").select(select);
    if (ids.length > 0) query = query.in("id", ids);
    const { data, error } = await query;
    if (error) continue;

    const rows = ((data || []) as unknown) as Array<Record<string, unknown>>;
    return rows.map((row) => {
      const updatedAt = row["updated_at"] ? new Date(String(row["updated_at"])).getTime() : Number.NaN;
      const createdAt = row["created_at"] ? new Date(String(row["created_at"])).getTime() : Number.NaN;
      const lastModifiedMs = Number.isFinite(updatedAt)
        ? updatedAt
        : Number.isFinite(createdAt)
        ? createdAt
        : null;
      return {
        id: String(row["id"]),
        isPublished: Boolean(row["is_published"]),
        slug: String(row["slug"] || ""),
        title: String(row["title"] || ""),
        typeKey: String(row["type"] || "").trim().toLowerCase(),
        judetKey: normalizeRegionText(String(row["judet"] || "")),
        cityKey: normalizeRegionText(String(row["city"] || "")),
        lastModifiedMs,
      };
    });
  }

  return [] as ListingMeta[];
}

async function fetchAttractionsMeta(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
): Promise<AttractionMeta[]> {
  const selectVariants = [
    "id, title, slug, is_published, updated_at, created_at",
    "id, title, slug, is_published, created_at",
  ];

  for (const select of selectVariants) {
    const { data, error } = await supabaseAdmin.from("attractions").select(select);
    if (error) continue;

    const rows = ((data || []) as unknown) as Array<Record<string, unknown>>;
    return rows.map((row) => {
      const updatedAt = row["updated_at"] ? new Date(String(row["updated_at"])).getTime() : Number.NaN;
      const createdAt = row["created_at"] ? new Date(String(row["created_at"])).getTime() : Number.NaN;
      const lastModifiedMs = Number.isFinite(updatedAt)
        ? updatedAt
        : Number.isFinite(createdAt)
        ? createdAt
        : null;
      return {
        id: String(row["id"] || ""),
        isPublished: Boolean(row["is_published"]),
        slug: String(row["slug"] || "").trim(),
        title: String(row["title"] || "").trim(),
        lastModifiedMs,
      };
    });
  }

  return [];
}

type ListingStats = {
  total: number;
  published: number;
  unpublished: number;
  lastModifiedMs: number | null;
};

function buildStats(listings: ListingMeta[], predicate: (listing: ListingMeta) => boolean): ListingStats {
  const matched = listings.filter(predicate);
  let published = 0;
  let lastModifiedMs: number | null = null;

  for (const listing of matched) {
    if (listing.isPublished) published += 1;
    if (listing.lastModifiedMs !== null && (lastModifiedMs === null || listing.lastModifiedMs > lastModifiedMs)) {
      lastModifiedMs = listing.lastModifiedMs;
    }
  }

  return {
    total: matched.length,
    published,
    unpublished: Math.max(0, matched.length - published),
    lastModifiedMs,
  };
}

function buildRegionMatcher(region: RegionDefinition): (listing: ListingMeta) => boolean {
  const regionCountyKeys = new Set(
    region.counties.map((county) => {
      const normalized = normalizeRegionText(county);
      const direct = getCounties().find((item) => normalizeRegionText(item.name) === normalized);
      if (direct) return normalizeRegionText(direct.name);
      const fuzzy = findCountyBySlug(slugify(String(county || "")));
      return fuzzy ? normalizeRegionText(fuzzy.name) : normalized;
    })
  );
  const coreCities =
    region.type === "metro"
      ? new Set((region.coreCities || []).map((city) => normalizeRegionText(city)))
      : null;

  return (listing: ListingMeta): boolean => {
    if (!regionCountyKeys.has(listing.judetKey)) return false;
    if (region.type === "metro") return coreCities ? coreCities.has(listing.cityKey) : false;
    return true;
  };
}

const EMPTY_TRAFFIC = {
  pageviews1h: 0,
  uniqueVisitors1h: 0,
  pageviews6h: 0,
  uniqueVisitors6h: 0,
  pageviews1d: 0,
  uniqueVisitors1d: 0,
  pageviews30d: 0,
  uniqueVisitors30d: 0,
  pageviews7d: 0,
  uniqueVisitors7d: 0,
  lastSeenViewMs: null,
};

type RoutePageParams = {
  id: string;
  slug: string;
  url: string;
  openUrl?: string;
  pageKind: SeoPageItem["pageKind"];
  title: string;
  status?: SeoPageStatus;
  inMenu?: boolean;
  indexable: boolean;
  stats: ListingStats;
};

function createRoutePage(params: RoutePageParams): SeoPageItem {
  return {
    id: params.id,
    slug: params.slug,
    url: params.url,
    openUrl: params.openUrl ?? params.url,
    pageKind: params.pageKind,
    title: params.title,
    status: params.status ?? "publicata",
    inMenu: params.inMenu ?? false,
    indexable: params.indexable,
    totalListings: params.stats.total,
    publishedListings: params.stats.published,
    unpublishedListings: params.stats.unpublished,
    lastModifiedMs: params.stats.lastModifiedMs,
    canTogglePublish: false,
    canToggleIndex: false,
    ...EMPTY_TRAFFIC,
    isInconsistent: false,
  };
}

function buildRoutePages(
  listings: ListingMeta[],
  attractions: AttractionMeta[],
  typeFacilityCountyCombos: TypeFacilityCountyCombo[]
): SeoPageItem[] {
  const routePages: SeoPageItem[] = [];
  const allStats = buildStats(listings, () => true);
  const regionMatchers = new Map(allRegions.map((region) => [region.slug, buildRegionMatcher(region)]));
  const listingById = new Map(listings.map((listing) => [listing.id, listing]));
  const emptyListingStats: ListingStats = {
    total: 0,
    published: 0,
    unpublished: 0,
    lastModifiedMs: null,
  };

  routePages.push(
    createRoutePage({
      id: "route:home",
      slug: "home",
      url: "/",
      pageKind: "home",
      title: "Homepage",
      inMenu: true,
      indexable: true,
      stats: allStats,
    })
  );

  routePages.push(
    createRoutePage({
      id: "route:cazari",
      slug: "cazari",
      url: "/cazari",
      pageKind: "cazari_index",
      title: "Cazari verificate pe tipuri",
      indexable: hasMinimumPublishedListings(allStats.published),
      stats: allStats,
    })
  );

  const staticPages = [
    { slug: "about-us", url: "/about-us", title: "Despre noi", indexable: true, inMenu: false },
    { slug: "servicii", url: "/servicii", title: "Servicii", indexable: true, inMenu: false },
    { slug: "contact", url: "/contact", title: "Contact", indexable: true, inMenu: false },
    {
      slug: "politica-confidentialitate",
      url: "/politica-confidentialitate",
      title: "Politica de confidentialitate",
      indexable: false,
      inMenu: false,
    },
    {
      slug: "politica-cookie",
      url: "/politica-cookie",
      title: "Politica de cookie-uri",
      indexable: false,
      inMenu: false,
    },
  ] as const;

  for (const page of staticPages) {
    routePages.push(
      createRoutePage({
        id: `route:static:${page.slug}`,
        slug: page.slug,
        url: page.url,
        pageKind: "static",
        title: page.title,
        inMenu: page.inMenu,
        indexable: page.indexable,
        stats: emptyListingStats,
      })
    );
  }

  const publishedAttractions = attractions.filter((item) => item.isPublished && item.slug);
  let attractionsLastModifiedMs: number | null = null;
  for (const attraction of publishedAttractions) {
    if (
      attraction.lastModifiedMs !== null &&
      (attractionsLastModifiedMs === null || attraction.lastModifiedMs > attractionsLastModifiedMs)
    ) {
      attractionsLastModifiedMs = attraction.lastModifiedMs;
    }
  }

  routePages.push(
    createRoutePage({
      id: "route:atractii",
      slug: "atractii",
      url: "/atractii",
      pageKind: "atractii_index",
      title: "Atractii",
      indexable: true,
      stats: {
        ...emptyListingStats,
        lastModifiedMs: attractionsLastModifiedMs,
      },
    })
  );

  for (const attraction of publishedAttractions) {
    routePages.push(
      createRoutePage({
        id: `route:atractie:${attraction.id}`,
        slug: attraction.slug,
        url: `/atractie/${attraction.slug}`,
        pageKind: "atractie",
        title: attraction.title || `Atractie ${attraction.slug}`,
        indexable: true,
        stats: {
          ...emptyListingStats,
          lastModifiedMs: attraction.lastModifiedMs,
        },
      })
    );
  }

  for (const type of LISTING_TYPES) {
    const stats = buildStats(listings, (listing) => listing.typeKey === type.value);
    routePages.push(
      createRoutePage({
        id: `route:type:${type.slug}`,
        slug: type.slug,
        url: `/cazari/${type.slug}`,
        pageKind: "type",
        title: type.label,
        indexable: hasMinimumPublishedListings(stats.published),
        stats,
      })
    );
  }

  for (const county of getCounties()) {
    const countyKey = normalizeRegionText(county.name);
    const stats = buildStats(listings, (listing) => listing.judetKey === countyKey);
    routePages.push(
      createRoutePage({
        id: `route:judet:${county.slug}`,
        slug: county.slug,
        url: `/judet/${county.slug}`,
        pageKind: "judet",
        title: `Cazare in judetul ${county.name}`,
        indexable: hasMinimumPublishedListings(stats.published),
        stats,
      })
    );
  }

  for (const region of allRegions) {
    const matchesRegion = regionMatchers.get(region.slug)!;
    const stats = buildStats(listings, (listing) => matchesRegion(listing));
    routePages.push(
      createRoutePage({
        id: `route:regiune:${region.slug}`,
        slug: region.slug,
        url: buildRegionPagePath(region),
        pageKind: region.type === "touristic" ? "regiune" : "localitate",
        title: `Cazare in ${region.name}`,
        indexable: hasMinimumPublishedListings(stats.published),
        stats,
      })
    );
  }

  for (const type of LISTING_TYPES) {
    for (const county of getCounties()) {
      const countyKey = normalizeRegionText(county.name);
      const stats = buildStats(
        listings,
        (listing) => listing.typeKey === type.value && listing.judetKey === countyKey
      );
      routePages.push(
        createRoutePage({
          id: `route:type-judet:${type.slug}:${county.slug}`,
          slug: `${type.slug}-${county.slug}`,
          url: buildTypeCountyPath(type.slug, county.slug),
          pageKind: "type_judet",
          title: `${type.label} in judetul ${county.name}`,
          indexable: hasMinimumPublishedListings(stats.published),
          stats,
        })
      );
    }
  }

  for (const type of LISTING_TYPES) {
    for (const region of allRegions) {
      const matchesRegion = regionMatchers.get(region.slug)!;
      const stats = buildStats(
        listings,
        (listing) => listing.typeKey === type.value && matchesRegion(listing)
      );
      routePages.push(
        createRoutePage({
          id: `route:type-region:${type.slug}:${region.slug}`,
          slug: `${type.slug}/${region.type === "metro" ? "localitate" : "regiune"}-${region.slug}`,
          url: buildTypeRegionPath(type.slug, region),
          pageKind: region.type === "metro" ? "type_localitate" : "type_region",
          title: `${type.label} in ${region.name}`,
          indexable: hasMinimumPublishedListings(stats.published),
          stats,
        })
      );
    }
  }

  for (const combo of typeFacilityCountyCombos) {
    const relatedListings = combo.listingIds
      .map((id) => listingById.get(id))
      .filter((listing): listing is ListingMeta => Boolean(listing));
    if (relatedListings.length === 0) continue;

    let published = 0;
    let lastModifiedMs: number | null = null;
    for (const listing of relatedListings) {
      if (listing.isPublished) published += 1;
      if (listing.lastModifiedMs !== null && (lastModifiedMs === null || listing.lastModifiedMs > lastModifiedMs)) {
        lastModifiedMs = listing.lastModifiedMs;
      }
    }

    routePages.push(
      createRoutePage({
        id: `route:type-facility-judet:${combo.typeSlug}:${combo.facilitySlug}:${combo.countySlug}`,
        slug: `${combo.typeSlug}/judet-${combo.countySlug}/cu-${combo.facilitySlug}`,
        url: buildTypeFacilityCountyPath(combo.typeSlug, combo.countySlug, combo.facilitySlug),
        pageKind: "type_facility_judet",
        title: `${combo.typeLabel} cu ${combo.facilityName} in judetul ${combo.countyName}`,
        indexable: hasMinimumPublishedListings(published),
        stats: {
          total: relatedListings.length,
          published,
          unpublished: Math.max(0, relatedListings.length - published),
          lastModifiedMs,
        },
      })
    );
  }

  for (const listing of listings) {
    const listingSlug = String(listing.slug || "").trim();
    if (!listingSlug) continue;
    const listingPath = `/cazare/${listingSlug}`;
    const previewPath = `${listingPath}?preview=1&id=${listing.id}`;
    routePages.push(
      createRoutePage({
        id: `route:listing:${listing.id}`,
        slug: listingSlug,
        url: listingPath,
        openUrl: listing.isPublished ? listingPath : previewPath,
        pageKind: "listing",
        title: listing.title || `Cazare ${listingSlug}`,
        status: listing.isPublished ? "publicata" : "nepublicata",
        indexable: listing.isPublished,
        stats: {
          total: 1,
          published: listing.isPublished ? 1 : 0,
          unpublished: listing.isPublished ? 0 : 1,
          lastModifiedMs: listing.lastModifiedMs,
        },
      })
    );
  }

  return routePages;
}

function mergePages(routePages: SeoPageItem[], geoPages: SeoPageItem[]): SeoPageItem[] {
  const mergedByKey = new Map<string, SeoPageItem>();

  for (const page of routePages) {
    const key = page.url || page.id;
    mergedByKey.set(key, {
      ...page,
      openUrl: page.openUrl ?? page.url,
      ...EMPTY_TRAFFIC,
    });
  }

  for (const page of geoPages) {
    const key = page.url || page.id;
    const existing = mergedByKey.get(key);

    if (!existing) {
      mergedByKey.set(key, {
        ...page,
        openUrl: page.openUrl ?? page.url,
        ...EMPTY_TRAFFIC,
      });
      continue;
    }

    const mergedLastModified =
      existing.lastModifiedMs === null
        ? page.lastModifiedMs
        : page.lastModifiedMs === null
        ? existing.lastModifiedMs
        : Math.max(existing.lastModifiedMs, page.lastModifiedMs);

    mergedByKey.set(key, {
      ...existing,
      openUrl: existing.openUrl ?? existing.url,
      slug:
        existing.id.startsWith("route:")
          ? existing.slug
          : page.slug && page.slug !== "-"
          ? page.slug
          : existing.slug,
      title:
        existing.id.startsWith("route:")
          ? existing.title
          : page.title && page.title !== "Pagina fara titlu"
          ? page.title
          : existing.title,
      status: page.status,
      inMenu: page.inMenu,
      indexable: page.indexable,
      lastModifiedMs: mergedLastModified,
      canTogglePublish: page.canTogglePublish,
      canToggleIndex: page.canToggleIndex,
      isInconsistent: false,
    });
  }

  return Array.from(mergedByKey.values());
}

function requiresListingsThreshold(pageKind: SeoPageItem["pageKind"]): boolean {
  return (
    pageKind === "cazari_index" ||
    pageKind === "type" ||
    pageKind === "judet" ||
    pageKind === "type_judet" ||
    pageKind === "regiune" ||
    pageKind === "localitate" ||
    pageKind === "type_region" ||
    pageKind === "type_localitate" ||
    pageKind === "type_facility_judet" ||
    pageKind === "geo_zone"
  );
}

async function applyPageviewMetrics(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  pages: SeoPageItem[]
): Promise<void> {
  const urls = Array.from(
    new Set(pages.map((page) => page.url).filter((url): url is string => Boolean(url)))
  );

  if (urls.length === 0) return;

  const nowMs = Date.now();
  const since30Ms = nowMs - 30 * 24 * 60 * 60 * 1000;
  const since7Ms = nowMs - 7 * 24 * 60 * 60 * 1000;
  const since1hMs = nowMs - 60 * 60 * 1000;
  const since1dMs = nowMs - 24 * 60 * 60 * 1000;
  const since6hMs = nowMs - 6 * 60 * 60 * 1000;
  const since30Iso = new Date(since30Ms).toISOString();
  const pageviewsData: Array<{ path?: string | null; anon_id?: string | null; created_at?: string | null }> = [];
  const batchSize = 100;

  for (let index = 0; index < urls.length; index += batchSize) {
    const batch = urls.slice(index, index + batchSize);
    const { data, error } = await supabaseAdmin
      .from("seo_pageviews")
      .select("path, anon_id, created_at")
      .in("path", batch)
      .gte("created_at", since30Iso);

    if (error) {
      throw new Error(`seo_pageviews fetch failed at batch ${index / batchSize + 1}: ${error.message}`);
    }

    if (data?.length) {
      pageviewsData.push(
        ...(data as Array<{ path?: string | null; anon_id?: string | null; created_at?: string | null }>)
      );
    }
  }

  const viewsMap30 = new Map<string, number>();
  const uniquesMap30 = new Map<string, Set<string>>();
  const viewsMap7 = new Map<string, number>();
  const uniquesMap7 = new Map<string, Set<string>>();
  const viewsMap1h = new Map<string, number>();
  const uniquesMap1h = new Map<string, Set<string>>();
  const viewsMap1d = new Map<string, number>();
  const uniquesMap1d = new Map<string, Set<string>>();
  const viewsMap6h = new Map<string, number>();
  const uniquesMap6h = new Map<string, Set<string>>();
  const lastSeenMap = new Map<string, number>();

  for (const row of pageviewsData) {
    const path = typeof row.path === "string" ? row.path : null;
    if (!path) continue;

    viewsMap30.set(path, (viewsMap30.get(path) || 0) + 1);
    if (row.anon_id) {
      const uniques = uniquesMap30.get(path) || new Set<string>();
      uniques.add(String(row.anon_id));
      uniquesMap30.set(path, uniques);
    }

    const createdMs = row.created_at ? new Date(String(row.created_at)).getTime() : Number.NaN;
    if (Number.isFinite(createdMs)) {
      const prev = lastSeenMap.get(path);
      if (prev === undefined || createdMs > prev) {
        lastSeenMap.set(path, createdMs);
      }
    }
    if (Number.isFinite(createdMs) && createdMs >= since7Ms) {
      viewsMap7.set(path, (viewsMap7.get(path) || 0) + 1);
      if (row.anon_id) {
        const uniques = uniquesMap7.get(path) || new Set<string>();
        uniques.add(String(row.anon_id));
        uniquesMap7.set(path, uniques);
      }

      if (createdMs >= since1dMs) {
        viewsMap1d.set(path, (viewsMap1d.get(path) || 0) + 1);
        if (row.anon_id) {
          const uniques = uniquesMap1d.get(path) || new Set<string>();
          uniques.add(String(row.anon_id));
          uniquesMap1d.set(path, uniques);
        }
      }

      if (createdMs >= since6hMs) {
        viewsMap6h.set(path, (viewsMap6h.get(path) || 0) + 1);
        if (row.anon_id) {
          const uniques = uniquesMap6h.get(path) || new Set<string>();
          uniques.add(String(row.anon_id));
          uniquesMap6h.set(path, uniques);
        }
      }

      if (createdMs >= since1hMs) {
        viewsMap1h.set(path, (viewsMap1h.get(path) || 0) + 1);
        if (row.anon_id) {
          const uniques = uniquesMap1h.get(path) || new Set<string>();
          uniques.add(String(row.anon_id));
          uniquesMap1h.set(path, uniques);
        }
      }
    }
  }

  for (const page of pages) {
    const path = page.url || "";
    page.pageviews1h = viewsMap1h.get(path) || 0;
    page.uniqueVisitors1h = uniquesMap1h.get(path)?.size || 0;
    page.pageviews6h = viewsMap6h.get(path) || 0;
    page.uniqueVisitors6h = uniquesMap6h.get(path)?.size || 0;
    page.pageviews1d = viewsMap1d.get(path) || 0;
    page.uniqueVisitors1d = uniquesMap1d.get(path)?.size || 0;
    page.pageviews30d = viewsMap30.get(path) || 0;
    page.uniqueVisitors30d = uniquesMap30.get(path)?.size || 0;
    page.pageviews7d = viewsMap7.get(path) || 0;
    page.uniqueVisitors7d = uniquesMap7.get(path)?.size || 0;
    page.lastSeenViewMs = lastSeenMap.get(path) ?? null;
  }
}

function inferGeoPageKind(
  row: Record<string, unknown>,
  url: string | null,
  slug: string,
  regionKindBySlug: Map<string, RegionType>
): SeoPageItem["pageKind"] {
  const zoneType = String(row.type || "")
    .trim()
    .toLowerCase();
  const normalizedUrl = String(url || "")
    .trim()
    .toLowerCase();
  const normalizedSlug = String(slug || "")
    .trim()
    .toLowerCase();
  const isLocalType =
    zoneType === "localitate" ||
    zoneType.includes("local") ||
    zoneType === "oras" ||
    zoneType === "municipiu" ||
    zoneType === "comuna" ||
    zoneType === "city";
  const isLocalPath =
    normalizedUrl.startsWith("/localitate/") ||
    normalizedUrl.startsWith("/localitati/") ||
    normalizedUrl.startsWith("/oras/");

  if (normalizedUrl === "/") return "home";
  if (normalizedUrl === "/cazari") return "cazari_index";

  const listingMatch = normalizedUrl.match(/^\/cazare\/([^/]+)$/);
  if (listingMatch?.[1]) return "listing";

  // Locality signal has priority over region pattern to avoid misclassification.
  if (isLocalType || isLocalPath) return "localitate";

  const countyMatch = normalizedUrl.match(/^\/judet\/([^/]+)$/);
  if (countyMatch?.[1]) {
    const county = findCountyBySlug(countyMatch[1]);
    return county ? "judet" : "geo_zone";
  }

  const localityMatch = normalizedUrl.match(/^\/localitate\/([^/]+)$/);
  if (localityMatch?.[1]) {
    const region = findRegionBySlug(localityMatch[1]);
    return region?.type === "metro" ? "localitate" : "geo_zone";
  }

  const regionMatch = normalizedUrl.match(/^\/regiune\/([^/]+)$/);
  if (regionMatch?.[1]) {
    const regionKind = regionKindBySlug.get(regionMatch[1]);
    if (regionKind === "metro") return "localitate";
    // Any non-metro /regiune/* URL is treated as region to keep one SEO category.
    return "regiune";
  }

  const typeFacilityCountyMatch = normalizedUrl.match(/^\/cazari\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (typeFacilityCountyMatch?.[1] && typeFacilityCountyMatch?.[2] && typeFacilityCountyMatch?.[3]) {
    const typeSlug = typeFacilityCountyMatch[1];
    const locationSegment = typeFacilityCountyMatch[2];
    const facilitySegment = typeFacilityCountyMatch[3];
    const listingType = getTypeBySlug(typeSlug);
    const location = parseListingLocationSegment(locationSegment);
    if (!listingType || !location || location.kind !== "judet") return "geo_zone";
    if (!facilitySegment.startsWith("cu-")) return "geo_zone";
    return "type_facility_judet";
  }

  const typeLocationMatch = normalizedUrl.match(/^\/cazari\/([^/]+)\/([^/]+)$/);
  if (typeLocationMatch?.[1] && typeLocationMatch?.[2]) {
    const typeSlug = typeLocationMatch[1];
    const locationSegment = typeLocationMatch[2];
    const listingType = getTypeBySlug(typeSlug);
    const location = parseListingLocationSegment(locationSegment);
    if (!listingType || !location) return "geo_zone";
    if (location.kind === "judet") return "type_judet";
    return location.kind === "localitate" ? "type_localitate" : "type_region";
  }

  const typeMatch = normalizedUrl.match(/^\/cazari\/([^/]+)$/);
  if (typeMatch?.[1]) {
    return getTypeBySlug(typeMatch[1]) ? "type" : "geo_zone";
  }

  if (zoneType === "judet") {
    const county = findCountyBySlug(normalizedSlug);
    return county ? "judet" : "geo_zone";
  }

  if (zoneType === "regiune") {
    const regionSlugFromUrl = normalizedUrl.startsWith("/regiune/") ? normalizedUrl.slice("/regiune/".length) : "";
    const regionSlugCandidate = regionSlugFromUrl || normalizedSlug;
    const regionKind = regionKindBySlug.get(regionSlugCandidate);
    if (regionKind === "metro") return "localitate";
    return "regiune";
  }

  return "geo_zone";
}

export default async function AdminSeoPage() {
  const authCookie = cookies().get("drafts_auth")?.value || null;
  const role = getRoleFromEncodedAuth(authCookie);
  if (role !== "admin") redirect("/drafts-login?error=1");

  const supabaseAdmin = getSupabaseAdmin();

  let geoRows: Record<string, unknown>[] | null = null;
  let geoError: { message: string } | null = null;
  {
    const primary = await supabaseAdmin
      .from("geo_zones")
      .select("*")
      .order("display_order", { ascending: true })
      .order("updated_at", { ascending: false, nullsFirst: false });

    if (!primary.error) {
      geoRows = (primary.data || []) as Record<string, unknown>[];
    } else {
      const fallback = await supabaseAdmin
        .from("geo_zones")
        .select("*")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (!fallback.error) {
        geoRows = (fallback.data || []) as Record<string, unknown>[];
      } else {
        geoError = { message: fallback.error.message };
      }
    }
  }

  if (geoError) {
    console.error("[admin-seo] geo_zones fetch failed", geoError.message);
  }

  const zones = (geoRows || []) as Record<string, unknown>[];
  const zoneIds = zones.map((row) => String(row.id)).filter(Boolean);

  let relationRows: Array<{ geo_zone_id: string; listing_id: string }> = [];
  if (zoneIds.length > 0) {
    const { data: relData, error: relError } = await supabaseAdmin
      .from("listing_geo_zone")
      .select("geo_zone_id, listing_id")
      .in("geo_zone_id", zoneIds);

    if (relError) {
      console.error("[admin-seo] listing_geo_zone fetch failed", relError.message);
    } else {
      relationRows = (relData || []) as Array<{ geo_zone_id: string; listing_id: string }>;
    }
  }

  const listings = await fetchListingsMeta(supabaseAdmin, []);
  const attractions = await fetchAttractionsMeta(supabaseAdmin);
  const typeFacilityCountyCombos = await fetchTypeFacilityCountyCombos(supabaseAdmin);
  const listingById = new Map(listings.map((row) => [row.id, row]));

  const relationMap = new Map<string, string[]>();
  for (const relation of relationRows) {
    const zoneId = String(relation.geo_zone_id || "");
    const listingId = String(relation.listing_id || "");
    if (!zoneId || !listingId) continue;
    const current = relationMap.get(zoneId);
    if (current) current.push(listingId);
    else relationMap.set(zoneId, [listingId]);
  }

  const regionKindBySlug = new Map(
    allRegions.map((region) => [region.slug.toLowerCase(), region.type] as const)
  );

  const geoPages: SeoPageItem[] = zones.map((row) => {
    const zoneId = String(row.id);
    const zoneSlugRaw = getSeoPageSlug(row);
    const zoneUrlRaw = getSeoPageUrl(row);
    const zoneUrl = canonicalizeRegionUrl(zoneUrlRaw);
    const zoneSlug =
      zoneUrl !== zoneUrlRaw ? slugFromRegionUrl(zoneUrl, zoneSlugRaw) : zoneSlugRaw;
    const pageKind = inferGeoPageKind(row, zoneUrl, zoneSlug, regionKindBySlug);
    const relatedIds = relationMap.get(zoneId) || [];
    const uniqueRelatedIds = Array.from(new Set(relatedIds));

    let publishedListings = 0;
    let lastModifiedMs = getSeoPageLastModifiedMs(row);

    for (const listingId of uniqueRelatedIds) {
      const listing = listingById.get(listingId);
      if (!listing) continue;
      if (listing.isPublished) publishedListings += 1;
      if (listing.lastModifiedMs !== null && (lastModifiedMs === null || listing.lastModifiedMs > lastModifiedMs)) {
        lastModifiedMs = listing.lastModifiedMs;
      }
    }

    const totalListings = uniqueRelatedIds.length;
    const unpublishedListings = Math.max(0, totalListings - publishedListings);
    const toggleMeta = getSeoToggleMeta(row);

    return {
      id: zoneId,
      slug: zoneSlug,
      url: zoneUrl,
      openUrl: zoneUrl,
      pageKind,
      title: getSeoPageTitle(row),
      status: getSeoPageStatus(row),
      inMenu: getSeoMenuVisibility(row),
      indexable: getSeoIndexable(row),
      totalListings,
      publishedListings,
      unpublishedListings,
      lastModifiedMs,
      canTogglePublish: Boolean(toggleMeta.publishField),
      canToggleIndex: Boolean(toggleMeta.indexField && toggleMeta.indexMode),
      ...EMPTY_TRAFFIC,
      isInconsistent: !zoneUrl || pageKind === "geo_zone",
    };
  });

  const routePages = buildRoutePages(listings, attractions, typeFacilityCountyCombos);
  const mergedPages = mergePages(routePages, geoPages).map((page) => {
    if (!requiresListingsThreshold(page.pageKind)) return page;
    if (hasMinimumPublishedListings(page.publishedListings)) return page;
    return {
      ...page,
      indexable: false,
      canToggleIndex: false,
    };
  });

  try {
    await applyPageviewMetrics(supabaseAdmin, mergedPages);
  } catch (error) {
    console.error(
      "[admin-seo] pageviews metrics failed",
      error instanceof Error ? error.message : error
    );
  }

  return <SeoAdminClient pages={mergedPages} />;
}
