import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import ListingsGrid from "@/components/listing/ListingGrid";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import { getTypeBySlug } from "@/lib/listingTypes";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { resolveListingsRouteIndexability } from "@/lib/seoRouteIndexing";
import { buildSeoTypeDescription, buildSeoTypeTitle, getSeoTypeLabel } from "@/lib/seoCopy";
import { buildSocialMetadata } from "@/lib/seoMetadata";
import { normalizeRegionText } from "@/lib/regions";
import { buildListingPageJsonLd } from "@/lib/jsonLd";
import type { CountyDefinition } from "@/lib/counties";
import {
  fetchTypeFacilityCountyCombos,
  findSeoFacilityBySlug,
  toSeoFacilities,
  type SeoFacility,
} from "@/lib/typeFacilityCountySeo";
import {
  buildCountySegment,
  buildFacilitySegment,
  buildTypeFacilityCountyPath,
  normalizeFacilitySlug,
  parseListingLocationSegment,
} from "@/lib/locationRoutes";
import type { ListingRaw } from "@/lib/types";
import type { Cazare } from "@/lib/utils";

export const revalidate = 60 * 60 * 6;

const siteUrl = getCanonicalSiteUrl();

type PageProps = {
  params: {
    type: string;
    location: string;
    slug: string;
  };
};

type FacilityRow = {
  id: string;
  name: string;
};

type ListingFacilityRaw = {
  facilities?: { id?: unknown; name?: unknown } | Array<{ id?: unknown; name?: unknown }> | null;
};

type ListingRawFlexible = Omit<ListingRaw, "listing_facilities"> & {
  listing_facilities?: ListingFacilityRaw[] | null;
};

type ResolvedTypeFacilityCountyRoute = {
  listingType: NonNullable<ReturnType<typeof getTypeBySlug>>;
  county: CountyDefinition;
  facility: SeoFacility;
  canonicalPath: string;
  isCanonical: boolean;
};

function normalizeListingRows(rows: ListingRawFlexible[]): ListingRaw[] {
  return rows.map((row) => {
    const normalizedFacilities = (row.listing_facilities || []).flatMap((entry) => {
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
      listing_facilities: normalizedFacilities,
    } as ListingRaw;
  });
}

async function getSeoFacilities(): Promise<SeoFacility[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.from("facilities").select("id, name");
  if (error || !data) return [];
  return toSeoFacilities(
    (data as FacilityRow[]).map((item) => ({ id: String(item.id), name: String(item.name) }))
  );
}

function resolveFacilityFromSegment(facilities: SeoFacility[], segment: string): SeoFacility | null {
  const lookupSlug = normalizeFacilitySlug(segment);
  if (!lookupSlug) return null;
  return findSeoFacilityBySlug(facilities, lookupSlug);
}

async function resolveTypeFacilityCountyRoute(
  params: PageProps["params"]
): Promise<ResolvedTypeFacilityCountyRoute | null> {
  const listingType = getTypeBySlug(params.type);
  if (!listingType) return null;

  const facilities = await getSeoFacilities();
  if (facilities.length === 0) return null;

  const countyFromLocation = parseListingLocationSegment(params.location);
  if (countyFromLocation?.kind === "judet" && countyFromLocation.county) {
    const facility = resolveFacilityFromSegment(facilities, params.slug);
    if (facility) {
      const canonicalLocation = buildCountySegment(countyFromLocation.county.slug);
      const canonicalFacility = buildFacilitySegment(facility.slug);
      return {
        listingType,
        county: countyFromLocation.county,
        facility,
        canonicalPath: buildTypeFacilityCountyPath(
          listingType.slug,
          countyFromLocation.county.slug,
          facility.slug
        ),
        isCanonical: params.location === canonicalLocation && params.slug === canonicalFacility,
      };
    }
  }

  const countyFromSlug = parseListingLocationSegment(params.slug);
  if (countyFromSlug?.kind !== "judet" || !countyFromSlug.county) return null;

  const legacyFacility = resolveFacilityFromSegment(facilities, params.location);
  if (!legacyFacility) return null;

  return {
    listingType,
    county: countyFromSlug.county,
    facility: legacyFacility,
    canonicalPath: buildTypeFacilityCountyPath(
      listingType.slug,
      countyFromSlug.county.slug,
      legacyFacility.slug
    ),
    isCanonical: false,
  };
}

export async function generateStaticParams() {
  const supabaseAdmin = getSupabaseAdmin();
  const combos = await fetchTypeFacilityCountyCombos(supabaseAdmin, { publishedOnly: true });
  return combos.map((combo) => ({
    type: combo.typeSlug,
    location: buildCountySegment(combo.countySlug),
    slug: buildFacilitySegment(combo.facilitySlug),
  }));
}

async function getMatchingListingIds(typeValue: string, countyName: string, facilityId: string): Promise<string[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("listing_facilities")
    .select("listing_id, listings(id, type, judet, is_published)")
    .eq("facility_id", facilityId);

  if (error || !data) return [];

  const ids = new Set<string>();
  const countyKey = normalizeRegionText(countyName);

  for (const row of data as Array<Record<string, unknown>>) {
    const listing = Array.isArray(row["listings"])
      ? ((row["listings"][0] as Record<string, unknown> | undefined) || null)
      : ((row["listings"] as Record<string, unknown> | null) || null);
    if (!listing) continue;

    const isPublished = Boolean(listing["is_published"]);
    if (!isPublished) continue;

    const listingType = String(listing["type"] || "").trim().toLowerCase();
    if (listingType !== typeValue) continue;

    const judetKey = normalizeRegionText(String(listing["judet"] || ""));
    if (judetKey !== countyKey) continue;

    const listingId = String(listing["id"] || row["listing_id"] || "").trim();
    if (!listingId) continue;
    ids.add(listingId);
  }

  return Array.from(ids);
}

async function getPublishedListingsCountForCombination(
  typeValue: string,
  countyName: string,
  facilityId: string
): Promise<number> {
  const listingIds = await getMatchingListingIds(typeValue, countyName, facilityId);
  return listingIds.length;
}

export async function generateMetadata({ params }: PageProps) {
  const resolved = await resolveTypeFacilityCountyRoute(params);
  if (!resolved) return {};

  const { listingType, county, facility, canonicalPath } = resolved;
  const seoTypeLabel = getSeoTypeLabel(listingType.slug, listingType.label);
  const title = buildSeoTypeTitle(seoTypeLabel, `cu ${facility.name} în județul ${county.name}`);
  const description = buildSeoTypeDescription(
    seoTypeLabel,
    `cu ${facility.name} în județul ${county.name}`
  );
  const canonical = new URL(canonicalPath, siteUrl).toString();
  const publishedListingsCount = await getPublishedListingsCountForCombination(
    listingType.value,
    county.name,
    facility.id
  );
  const shouldIndex = await resolveListingsRouteIndexability(canonicalPath, publishedListingsCount);

  return {
    title,
    description,
    alternates: { canonical },
    ...buildSocialMetadata({
      title,
      description,
      canonicalUrl: canonical,
    }),
    robots: shouldIndex ? undefined : { index: false, follow: true },
  };
}

async function getFacilityCountyTypeListings(
  typeValue: string,
  countyName: string,
  facilityId: string
): Promise<Cazare[]> {
  const listingIds = await getMatchingListingIds(typeValue, countyName, facilityId);
  if (listingIds.length === 0) return [];

  const supabaseAdmin = getSupabaseAdmin();
  const baseSelect = `
    id, title, slug, type, judet, city, sat, capacity, price, phone, is_published, display_order,
    camere, paturi, bai,
    listing_images(image_url, display_order),
    listing_facilities(
      facilities(id, name)
    )
  `;

  const withOrder = await supabaseAdmin
    .from("listings")
    .select(baseSelect)
    .eq("is_published", true)
    .eq("type", typeValue)
    .in("id", listingIds)
    .order("display_order", { ascending: false, nullsFirst: false })
    .order("display_order", { foreignTable: "listing_images", ascending: true })
    .limit(1, { foreignTable: "listing_images" });

  let data = withOrder.data;
  let error = withOrder.error;

  if (error && String(error.message || "").includes("display_order")) {
    const fallback = await supabaseAdmin
      .from("listings")
      .select(baseSelect)
      .eq("is_published", true)
      .eq("type", typeValue)
      .in("id", listingIds)
      .order("display_order", { foreignTable: "listing_images", ascending: true })
      .limit(1, { foreignTable: "listing_images" });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  const normalizedRows = normalizeListingRows((data || []) as ListingRawFlexible[]);
  return normalizedRows.map((row) => mapListingSummary(row));
}

export default async function TypeFacilityCountyPage({ params }: PageProps) {
  const resolved = await resolveTypeFacilityCountyRoute(params);
  if (!resolved || !resolved.county) return notFound();

  const { listingType, county, facility, canonicalPath, isCanonical } = resolved;
  if (!isCanonical) {
    permanentRedirect(canonicalPath);
  }

  const listings = await getFacilityCountyTypeListings(listingType.value, county.name, facility.id);
  const pageUrl = `${siteUrl}${canonicalPath}`;
  const description = `Pagina filtrata pentru ${listingType.label.toLowerCase()} cu ${facility.name} in judetul ${county.name}, cu listari verificate si rezervare direct la proprietar.`;

  const listingJsonLd = buildListingPageJsonLd({
    siteUrl,
    pageUrl,
    typeLabel: listingType.label,
    typeSlug: listingType.slug,
    locationLabel: `${county.name} - ${facility.name}`,
    locationSlug: `${county.slug}-${facility.slug}`,
    description,
    items: listings.map((listing) => ({
      name: listing.title,
      url: `${siteUrl}/cazare/${listing.slug}`,
      image: listing.image,
      addressLocality: listing.locatie,
      addressRegion: county.name,
      priceRange: String(listing.price || ""),
    })),
  });

  return (
    <>
      {listingJsonLd.map((obj, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
        />
      ))}
      <main className="min-h-screen px-4 py-10 lg:px-6">
        <header className="mx-auto max-w-4xl text-center">
          <nav aria-label="Breadcrumb" className="text-sm text-emerald-800/80">
            <Link href="/" className="hover:underline">
              Acasa
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/cazari/${listingType.slug}`} className="hover:underline">
              {listingType.label}
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/judet/${county.slug}`} className="hover:underline">
              {county.name}
            </Link>
            <span className="mx-2">/</span>
            <span>{facility.name}</span>
          </nav>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            {listingType.label} cu {facility.name} in judetul {county.name}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-600">{description}</p>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-emerald-900/80">
            Ruta este standardizata pe formatul tip - judet - facilitate pentru indexare clara si filtrare scalabila.
          </p>
        </header>

        <section className="mt-12">
          {listings.length === 0 ? (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 px-6 py-10 text-center">
              <h2 className="mb-2 text-2xl font-semibold text-emerald-900">
                Momentan nu avem {listingType.label.toLowerCase()} cu {facility.name} in {county.name}
              </h2>
              <p className="mx-auto max-w-2xl text-emerald-800/80">
                Publicam treptat proprietati reale, atent verificate. Revino in curand.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-2 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <ListingsGrid cazari={listings} />
            </div>
          )}
        </section>
      </main>
    </>
  );
}
