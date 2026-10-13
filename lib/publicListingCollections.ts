import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeRegionText } from "@/lib/regions";
import { mapListingSummary } from "@/lib/transformers";
import type { ListingRaw } from "@/lib/types";
import type { Cazare } from "@/lib/utils";

const PUBLIC_LISTING_SELECT = `
  id, title, slug, type, judet, city, sat, capacity, price, phone, is_published, display_order,
  camere, paturi, bai,
  listing_images(image_url, display_order),
  listing_facilities(
    facilities(id, name)
  )
`;

type PublicListingFilters = {
  typeValue?: string;
  countyName?: string;
  countyNames?: string[];
  listingIds?: string[];
};

type PublicRegionListingFilters = {
  countyNames: string[];
  typeValue?: string;
  restrictToCoreCities: boolean;
  coreCities?: string[];
};

type ListingFacilityRaw = {
  facilities?: { id?: unknown; name?: unknown } | Array<{ id?: unknown; name?: unknown }> | null;
};

type ListingRawFlexible = Omit<ListingRaw, "listing_facilities"> & {
  listing_facilities?: ListingFacilityRaw[] | null;
};

function normalizeListingRows(rows: ListingRawFlexible[]): ListingRaw[] {
  return rows.map((row) => {
    const listingFacilities = (row.listing_facilities || []).flatMap((entry) => {
      const facilities = Array.isArray(entry?.facilities)
        ? entry.facilities
        : entry?.facilities
        ? [entry.facilities]
        : [];

      return facilities
        .map((facility) => ({
          facilities: {
            id: String(facility?.id || "").trim(),
            name: String(facility?.name || "").trim(),
          },
        }))
        .filter((facility) => facility.facilities.id && facility.facilities.name);
    });

    return {
      ...row,
      listing_facilities: listingFacilities,
    } as ListingRaw;
  });
}

function buildPublishedListingsQuery(filters: PublicListingFilters) {
  let query = getSupabaseAdmin()
    .from("listings")
    .select(PUBLIC_LISTING_SELECT)
    .eq("is_published", true)
    .in("publication_status", ["active", "expiring"])
    .or(`publication_expires_at.is.null,publication_expires_at.gt.${new Date().toISOString()}`);

  if (filters.typeValue) {
    query = query.eq("type", filters.typeValue);
  }
  if (filters.countyName) {
    query = query.eq("judet", filters.countyName);
  }
  if (filters.countyNames) {
    query = query.in("judet", filters.countyNames);
  }
  if (filters.listingIds) {
    query = query.in("id", filters.listingIds);
  }

  return query;
}

async function executePublishedListingsQuery(
  filters: PublicListingFilters,
  includeDisplayOrder: boolean
) {
  let query = buildPublishedListingsQuery(filters);

  if (includeDisplayOrder) {
    query = query.order("display_order", { ascending: false, nullsFirst: false });
  }

  return query
    .order("created_at", { ascending: false })
    .order("display_order", { foreignTable: "listing_images", ascending: true })
    .limit(1, { foreignTable: "listing_images" });
}

export async function fetchPublishedListingRows(
  filters: PublicListingFilters = {}
): Promise<ListingRaw[]> {
  if (filters.countyNames?.length === 0 || filters.listingIds?.length === 0) return [];

  let { data, error } = await executePublishedListingsQuery(filters, true);

  if (error && String(error.message || "").includes("display_order")) {
    const fallback = await executePublishedListingsQuery(filters, false);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return normalizeListingRows((data || []) as unknown as ListingRawFlexible[]);
}

export async function fetchPublishedListingSummaries(
  filters: PublicListingFilters = {}
): Promise<Cazare[]> {
  const rows = await fetchPublishedListingRows(filters);
  return rows.map((row) => mapListingSummary(row));
}

export async function fetchPublishedRegionListingSummaries({
  countyNames,
  typeValue,
  restrictToCoreCities,
  coreCities,
}: PublicRegionListingFilters): Promise<Cazare[]> {
  const rows = await fetchPublishedListingRows({ countyNames, typeValue });
  if (!restrictToCoreCities) {
    return rows.map((row) => mapListingSummary(row));
  }

  const normalizedCoreCities = coreCities
    ? new Set(coreCities.map((city) => normalizeRegionText(city)))
    : null;
  const filteredRows = rows.filter((row) => {
    const city = normalizeRegionText(String(row.city || ""));
    return normalizedCoreCities ? normalizedCoreCities.has(city) : false;
  });

  return filteredRows.map((row) => mapListingSummary(row));
}

export function distinctListingCollections<T extends { listingIds: string[] }>(
  collections: T[],
  currentListingIds: string[] = []
): T[] {
  const signature = (ids: string[]) => JSON.stringify(Array.from(new Set(ids)).sort());
  const seen = new Set([signature(currentListingIds)]);
  return collections.filter((collection) => {
    if (collection.listingIds.length === 0) return false;
    const key = signature(collection.listingIds);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mapListingsToJsonLdItems(
  listings: Cazare[],
  siteUrl: string,
  addressRegion: string
) {
  return listings.map((listing) => ({
    name: listing.title,
    url: `${siteUrl}/cazare/${listing.slug}`,
    image: listing.image,
    addressLocality: listing.locatie,
    addressRegion,
    priceRange: String(listing.price || ""),
  }));
}
