export const revalidate = 0;

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getRoleFromEncodedAuth } from "@/lib/draftsAuth";
import { LISTING_TYPES } from "@/lib/listingTypes";
import { getCounties } from "@/lib/counties";
import { allRegions, metroCoreCitySet, normalizeRegionText, type RegionDefinition } from "@/lib/regions";
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
import SeoAdminClient from "./seo-admin-client";

type ListingMeta = {
  id: string;
  isPublished: boolean;
  type: string;
  judet: string;
  city: string;
  lastModifiedMs: number | null;
};

type SeoPageItem = {
  id: string;
  slug: string;
  url: string | null;
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
  pageviews30d: number;
  uniqueVisitors30d: number;
  pageviews7d: number;
  uniqueVisitors7d: number;
};

async function fetchListingsMeta(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, ids: string[]) {
  const selectVariants = [
    "id, is_published, type, judet, city, updated_at, created_at",
    "id, is_published, type, judet, city, created_at",
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
        type: String(row["type"] || ""),
        judet: String(row["judet"] || ""),
        city: String(row["city"] || ""),
        lastModifiedMs,
      };
    });
  }

  return [] as ListingMeta[];
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

function isListingInRegion(listing: ListingMeta, region: RegionDefinition): boolean {
  if (!region.counties.includes(listing.judet)) return false;
  const cityNorm = normalizeRegionText(String(listing.city || ""));
  if (region.type === "metro") {
    const coreCities = new Set((region.coreCities || []).map((city) => normalizeRegionText(city)));
    return coreCities.has(cityNorm);
  }
  if (!cityNorm) return true;
  return !metroCoreCitySet.has(cityNorm);
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

  const geoPages: SeoPageItem[] = zones.map((row) => {
    const zoneId = String(row.id);
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
      slug: getSeoPageSlug(row),
      url: getSeoPageUrl(row),
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
      pageviews30d: 0,
      uniqueVisitors30d: 0,
      pageviews7d: 0,
      uniqueVisitors7d: 0,
    };
  });

  const routePages: SeoPageItem[] = [];

  const allStats = buildStats(listings, () => true);
  routePages.push({
    id: "route:cazari",
    slug: "cazari",
    url: "/cazari",
    title: "Cazari verificate pe tipuri",
    status: "publicata",
    inMenu: false,
    indexable: true,
    totalListings: allStats.total,
    publishedListings: allStats.published,
    unpublishedListings: allStats.unpublished,
    lastModifiedMs: allStats.lastModifiedMs,
    canTogglePublish: false,
    canToggleIndex: false,
    pageviews30d: 0,
    uniqueVisitors30d: 0,
    pageviews7d: 0,
    uniqueVisitors7d: 0,
  });

  for (const type of LISTING_TYPES) {
    const stats = buildStats(listings, (listing) => listing.type === type.value);
    routePages.push({
      id: `route:type:${type.slug}`,
      slug: type.slug,
      url: `/cazari/${type.slug}`,
      title: type.label,
      status: "publicata",
      inMenu: false,
      indexable: stats.published > 0,
      totalListings: stats.total,
      publishedListings: stats.published,
      unpublishedListings: stats.unpublished,
      lastModifiedMs: stats.lastModifiedMs,
      canTogglePublish: false,
      canToggleIndex: false,
      pageviews30d: 0,
      uniqueVisitors30d: 0,
      pageviews7d: 0,
      uniqueVisitors7d: 0,
    });
  }

  for (const county of getCounties()) {
    const stats = buildStats(listings, (listing) => listing.judet === county.name);
    routePages.push({
      id: `route:judet:${county.slug}`,
      slug: county.slug,
      url: `/judet/${county.slug}`,
      title: `Cazare in judetul ${county.name}`,
      status: "publicata",
      inMenu: false,
      indexable: stats.published > 0,
      totalListings: stats.total,
      publishedListings: stats.published,
      unpublishedListings: stats.unpublished,
      lastModifiedMs: stats.lastModifiedMs,
      canTogglePublish: false,
      canToggleIndex: false,
      pageviews30d: 0,
      uniqueVisitors30d: 0,
      pageviews7d: 0,
      uniqueVisitors7d: 0,
    });
  }

  for (const region of allRegions) {
    const stats = buildStats(listings, (listing) => isListingInRegion(listing, region));
    routePages.push({
      id: `route:regiune:${region.slug}`,
      slug: region.slug,
      url: `/regiune/${region.slug}`,
      title: `Cazare in ${region.name}`,
      status: "publicata",
      inMenu: false,
      indexable: stats.published > 0,
      totalListings: stats.total,
      publishedListings: stats.published,
      unpublishedListings: stats.unpublished,
      lastModifiedMs: stats.lastModifiedMs,
      canTogglePublish: false,
      canToggleIndex: false,
      pageviews30d: 0,
      uniqueVisitors30d: 0,
      pageviews7d: 0,
      uniqueVisitors7d: 0,
    });
  }

  for (const type of LISTING_TYPES) {
    for (const region of allRegions) {
      const stats = buildStats(
        listings,
        (listing) => listing.type === type.value && isListingInRegion(listing, region)
      );
      routePages.push({
        id: `route:type-region:${type.slug}:${region.slug}`,
        slug: `${type.slug}/${region.slug}`,
        url: `/cazari/${type.slug}/${region.slug}`,
        title: `${type.label} in ${region.name}`,
        status: "publicata",
        inMenu: false,
        indexable: stats.published > 0,
        totalListings: stats.total,
        publishedListings: stats.published,
        unpublishedListings: stats.unpublished,
        lastModifiedMs: stats.lastModifiedMs,
        canTogglePublish: false,
        canToggleIndex: false,
        pageviews30d: 0,
        uniqueVisitors30d: 0,
        pageviews7d: 0,
        uniqueVisitors7d: 0,
      });
    }
  }

  const mergedByKey = new Map<string, SeoPageItem>();
  for (const page of routePages) {
    const key = page.url || page.id;
    mergedByKey.set(key, {
      ...page,
      pageviews30d: 0,
      uniqueVisitors30d: 0,
      pageviews7d: 0,
      uniqueVisitors7d: 0,
    });
  }
  for (const page of geoPages) {
    const key = page.url || page.id;
    if (mergedByKey.has(key)) {
      const existing = mergedByKey.get(key)!;
      mergedByKey.set(key, {
        ...existing,
        status: page.status,
        inMenu: page.inMenu,
        indexable: page.indexable,
        canTogglePublish: page.canTogglePublish,
        canToggleIndex: page.canToggleIndex,
      });
    } else {
      mergedByKey.set(key, {
        ...page,
        pageviews30d: 0,
        uniqueVisitors30d: 0,
        pageviews7d: 0,
        uniqueVisitors7d: 0,
      });
    }
  }

  const mergedPages = Array.from(mergedByKey.values());
  const urls = Array.from(new Set(mergedPages.map((page) => page.url).filter((url): url is string => Boolean(url))));

  if (urls.length > 0) {
    try {
      const nowMs = Date.now();
      const since30Ms = nowMs - 30 * 24 * 60 * 60 * 1000;
      const since7Ms = nowMs - 7 * 24 * 60 * 60 * 1000;
      const since = new Date(since30Ms).toISOString();
      const { data: pageviewsData, error: pageviewsError } = await supabaseAdmin
        .from("seo_pageviews")
        .select("path, anon_id, created_at")
        .in("path", urls)
        .gte("created_at", since);

      if (!pageviewsError && pageviewsData) {
        const viewsMap30 = new Map<string, number>();
        const uniquesMap30 = new Map<string, Set<string>>();
        const viewsMap7 = new Map<string, number>();
        const uniquesMap7 = new Map<string, Set<string>>();

        for (const row of pageviewsData as Array<{ path?: string | null; anon_id?: string | null; created_at?: string | null }>) {
          const path = typeof row.path === "string" ? row.path : null;
          if (!path) continue;
          viewsMap30.set(path, (viewsMap30.get(path) || 0) + 1);
          if (row.anon_id) {
            const set = uniquesMap30.get(path) || new Set<string>();
            set.add(String(row.anon_id));
            uniquesMap30.set(path, set);
          }

          const createdMs = row.created_at ? new Date(String(row.created_at)).getTime() : Number.NaN;
          if (Number.isFinite(createdMs) && createdMs >= since7Ms) {
            viewsMap7.set(path, (viewsMap7.get(path) || 0) + 1);
            if (row.anon_id) {
              const set = uniquesMap7.get(path) || new Set<string>();
              set.add(String(row.anon_id));
              uniquesMap7.set(path, set);
            }
          }
        }

        for (const page of mergedPages) {
          const path = page.url || "";
          page.pageviews30d = viewsMap30.get(path) || 0;
          page.uniqueVisitors30d = uniquesMap30.get(path)?.size || 0;
          page.pageviews7d = viewsMap7.get(path) || 0;
          page.uniqueVisitors7d = uniquesMap7.get(path)?.size || 0;
        }
      }
    } catch {
      // keep dashboard available even if pageviews data cannot be fetched
    }
  }

  return <SeoAdminClient pages={mergedPages} />;
}
