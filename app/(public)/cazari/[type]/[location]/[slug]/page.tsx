import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import JsonLdScripts from "@/components/seo/JsonLdScripts";
import ListingCollectionResults from "@/components/seo/ListingCollectionResults";
import SeoRelatedLinks from "@/components/seo/SeoRelatedLinks";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getTypeBySlug } from "@/lib/listingTypes";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { resolveListingsRouteIndexability } from "@/lib/seoRouteIndexing";
import { buildSeoTypeDescription, buildSeoTypeTitle, getSeoTypeLabel } from "@/lib/seoCopy";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { normalizeRegionText } from "@/lib/regions";
import { buildBreadcrumbJsonLd, buildListingPageJsonLd } from "@/lib/jsonLd";
import type { CountyDefinition } from "@/lib/counties";
import {
  fetchSeoFacilities,
  fetchTypeFacilityCountyCombos,
  findSeoFacilityBySlug,
  type SeoFacility,
} from "@/lib/typeFacilityCountySeo";
import {
  buildCountySegment,
  buildFacilitySegment,
  buildTypeLocationPath,
  buildTypeFacilityCountyPath,
  normalizeFacilitySlug,
  parseListingLocationSegment,
} from "@/lib/locationRoutes";
import {
  fetchPublishedListingSummaries,
  mapListingsToJsonLdItems,
} from "@/lib/publicListingCollections";
import type { Cazare } from "@/lib/utils";
import { getCategoryPhoto, getDestinationPhoto } from "@/lib/exploreCards";

export const revalidate = 21600;

const siteUrl = getCanonicalSiteUrl();

type PageProps = {
  params: Promise<{
    type: string;
    location: string;
    slug: string;
  }>;
};

type ResolvedTypeFacilityCountyRoute = {
  listingType: NonNullable<ReturnType<typeof getTypeBySlug>>;
  county: CountyDefinition;
  facility: SeoFacility;
  canonicalPath: string;
  isCanonical: boolean;
};

function resolveFacilityFromSegment(facilities: SeoFacility[], segment: string): SeoFacility | null {
  const lookupSlug = normalizeFacilitySlug(segment);
  if (!lookupSlug) return null;
  return findSeoFacilityBySlug(facilities, lookupSlug);
}

async function resolveTypeFacilityCountyRoute(
  params: Awaited<PageProps["params"]>
): Promise<ResolvedTypeFacilityCountyRoute | null> {
  const listingType = getTypeBySlug(params.type);
  if (!listingType) return null;

  const facilities = await fetchSeoFacilities(getSupabaseAdmin());
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

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const resolved = await resolveTypeFacilityCountyRoute(params);
  if (!resolved) return {};

  const { listingType, county, facility, canonicalPath } = resolved;
  const seoTypeLabel = getSeoTypeLabel(listingType.slug, listingType.label);
  const title = buildSeoTypeTitle(seoTypeLabel, `cu ${facility.name} în județul ${county.name}`);
  const canonical = new URL(canonicalPath, siteUrl).toString();
  const publishedListingsCount = await getPublishedListingsCountForCombination(
    listingType.value,
    county.name,
    facility.id
  );
  const description = buildSeoTypeDescription(
    seoTypeLabel,
    `cu ${facility.name} în județul ${county.name}`,
    0,
    publishedListingsCount
  );
  const shouldIndex = await resolveListingsRouteIndexability(canonicalPath, publishedListingsCount);

  return buildPageMetadata({
    title,
    description,
    canonicalUrl: canonical,
    robots: shouldIndex ? undefined : { index: false, follow: true },
  });
}

async function getFacilityCountyTypeListings(
  typeValue: string,
  countyName: string,
  facilityId: string
): Promise<Cazare[]> {
  const listingIds = await getMatchingListingIds(typeValue, countyName, facilityId);
  return fetchPublishedListingSummaries({ typeValue, listingIds });
}

export default async function TypeFacilityCountyPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const resolved = await resolveTypeFacilityCountyRoute(params);
  if (!resolved || !resolved.county) return notFound();

  const { listingType, county, facility, canonicalPath, isCanonical } = resolved;
  if (!isCanonical) {
    permanentRedirect(canonicalPath);
  }

  const listings = await getFacilityCountyTypeListings(listingType.value, county.name, facility.id);
  const pageUrl = `${siteUrl}${canonicalPath}`;
  const resultLabel =
    listings.length === 1
      ? `1 proprietate publicată din categoria ${listingType.singular.toLowerCase()}`
      : `${listings.length} ${listingType.label.toLowerCase()}`;
  const description = `Descoperă ${resultLabel} cu ${facility.name} în județul ${county.name}. Compară proprietăți verificate și contactează direct proprietarul.`;
  const typeCountyHref = buildTypeLocationPath(
    listingType.slug,
    buildCountySegment(county.slug)
  );
  const relatedLinks = [
    {
      href: typeCountyHref,
      label: `${listingType.label} în județul ${county.name}`,
      description: `Vezi toate proprietățile de acest tip, indiferent de facilitățile selectate.`,
      ...getCategoryPhoto(listingType.slug),
    },
    {
      href: `/judet/${county.slug}`,
      label: `Toate cazările din județul ${county.name}`,
      description: "Compară și alte categorii de proprietăți disponibile în același județ.",
      ...getDestinationPhoto(county.slug),
    },
    {
      href: `/cazari/${listingType.slug}`,
      label: `${listingType.label} în România`,
      description: "Explorează categoria completă și descoperă proprietăți din alte zone.",
    },
  ];

  const listingJsonLd = buildListingPageJsonLd({
    siteUrl,
    pageUrl,
    typeLabel: listingType.label,
    typeSlug: listingType.slug,
    locationLabel: `${county.name} - ${facility.name}`,
    locationSlug: `${county.slug}-${facility.slug}`,
    description,
    includeBreadcrumb: false,
    items: mapListingsToJsonLdItems(listings, siteUrl, county.name),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasă", item: siteUrl },
    { name: "Cazări", item: `${siteUrl}/cazari` },
    { name: listingType.label, item: `${siteUrl}/cazari/${listingType.slug}` },
    {
      name: county.name,
      item: `${siteUrl}/cazari/${listingType.slug}/${buildCountySegment(county.slug)}`,
    },
    { name: facility.name, item: pageUrl },
  ]);
  const jsonLdScripts: Record<string, unknown>[] = [
    breadcrumbJsonLd,
    ...listingJsonLd,
  ];

  return (
    <>
      <JsonLdScripts scripts={jsonLdScripts} />
      <main className="min-h-screen py-6 sm:py-10">
        <header className="max-w-3xl">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/" className="hover:underline">
              Acasă
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/cazari/${listingType.slug}`} className="hover:underline">
              {listingType.label}
            </Link>
            <span className="mx-2">/</span>
            <Link href={typeCountyHref} className="hover:underline">
              {county.name}
            </Link>
            <span className="mx-2">/</span>
            <span>{facility.name}</span>
          </nav>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            {listingType.label} cu {facility.name} în județul {county.name}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-600 dark:text-zinc-400">{description}</p>
        </header>

        <ListingCollectionResults
          listings={listings}
          emptyTitle={
            <>Momentan nu avem {listingType.label.toLowerCase()} cu {facility.name} în {county.name}</>
          }
          emptyDescription={
            <>Publicăm treptat proprietăți reale, atent verificate. Revino în curând.</>
          }
        />
        <SeoRelatedLinks
          title={`Alternative pentru ${facility.name} în județul ${county.name}`}
          description="Extinde căutarea către toate proprietățile de același tip sau către întregul catalog al județului."
          links={relatedLinks}
        />
      </main>
    </>
  );
}
