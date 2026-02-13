import Link from "next/link";
import { notFound } from "next/navigation";
import ListingsGrid from "@/components/listing/ListingGrid";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import { getTypeBySlug } from "@/lib/listingTypes";
import { findCountyBySlug } from "@/lib/counties";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { resolveListingsRouteIndexability } from "@/lib/seoRouteIndexing";
import { normalizeRegionText } from "@/lib/regions";
import { buildListingPageJsonLd } from "@/lib/jsonLd";
import { fetchTypeFacilityCountyCombos, findSeoFacilityBySlug, toSeoFacilities } from "@/lib/typeFacilityCountySeo";
import type { ListingRaw } from "@/lib/types";
import type { Cazare } from "@/lib/utils";

export const revalidate = 60 * 60 * 6; // 6 hours

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

async function getSeoFacilityBySlug(slug: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.from("facilities").select("id, name");
  if (error || !data) return null;

  const facilities = toSeoFacilities((data as FacilityRow[]).map((item) => ({ id: String(item.id), name: String(item.name) })));
  return findSeoFacilityBySlug(facilities, slug);
}

export async function generateStaticParams() {
  const supabaseAdmin = getSupabaseAdmin();
  const combos = await fetchTypeFacilityCountyCombos(supabaseAdmin, { publishedOnly: true });
  return combos.map((combo) => ({
    type: combo.typeSlug,
    location: combo.facilitySlug,
    slug: combo.countySlug,
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
      ? (row["listings"][0] as Record<string, unknown> | undefined)
      : ((row["listings"] as Record<string, unknown> | null) || undefined);
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
  const listingType = getTypeBySlug(params.type);
  const county = findCountyBySlug(params.slug);
  const facility = await getSeoFacilityBySlug(params.location);
  if (!listingType || !county || !facility) return {};

  const title = `${listingType.label} cu ${facility.name} in judetul ${county.name}`;
  const description = `Descopera ${listingType.label.toLowerCase()} cu ${facility.name} in judetul ${county.name}, cu contact direct la gazda.`;
  const canonical = new URL(`/cazari/${listingType.slug}/${facility.slug}/${county.slug}`, siteUrl).toString();
  const publishedListingsCount = await getPublishedListingsCountForCombination(
    listingType.value,
    county.name,
    facility.id
  );
  const shouldIndex = await resolveListingsRouteIndexability(
    `/cazari/${listingType.slug}/${facility.slug}/${county.slug}`,
    publishedListingsCount
  );

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
    },
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
  const listingType = getTypeBySlug(params.type);
  const county = findCountyBySlug(params.slug);
  const facility = await getSeoFacilityBySlug(params.location);

  if (!listingType || !county || !facility) return notFound();

  const listings = await getFacilityCountyTypeListings(listingType.value, county.name, facility.id);
  const pageUrl = `${siteUrl}/cazari/${listingType.slug}/${facility.slug}/${county.slug}`;
  const description = `Descopera ${listingType.label.toLowerCase()} cu ${facility.name} in judetul ${county.name}, listari verificate si rezervare direct la proprietar.`;

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
      <main className="min-h-screen px-4 lg:px-6 py-10">
        <header className="max-w-4xl mx-auto text-center">
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
          <h1 className="text-3xl sm:text-4xl font-semibold mt-3">
            {listingType.label} cu {facility.name} in judetul {county.name}
          </h1>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">{description}</p>
        </header>

        <section className="mt-12">
          {listings.length === 0 ? (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 px-6 py-10 text-center">
              <h2 className="text-2xl font-semibold text-emerald-900 mb-2">
                Momentan nu avem {listingType.label.toLowerCase()} cu {facility.name} in {county.name}
              </h2>
              <p className="text-emerald-800/80 max-w-2xl mx-auto">
                Publicam treptat proprietati reale, atent verificate. Revino in curand.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-2 gap-y-8">
              <ListingsGrid cazari={listings} />
            </div>
          )}
        </section>
      </main>
    </>
  );
}
