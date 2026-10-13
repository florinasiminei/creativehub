import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import JsonLdScripts from "@/components/seo/JsonLdScripts";
import ListingCollectionResults from "@/components/seo/ListingCollectionResults";
import SeoRelatedLinks from "@/components/seo/SeoRelatedLinks";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getTypeBySlug, LISTING_TYPES } from "@/lib/listingTypes";
import { getCounties } from "@/lib/counties";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { resolveListingsRouteIndexability } from "@/lib/seoRouteIndexing";
import {
  countPublishedListingsByTypeAndCounty,
  countPublishedListingsByTypeAndRegion,
  resolveRegionCountyNames,
} from "@/lib/seoListingsCounts";
import { buildSeoTypeDescription, buildSeoTypeTitle, getSeoTypeLabel } from "@/lib/seoCopy";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { allRegions } from "@/lib/regions";
import { buildBreadcrumbJsonLd, buildListingPageJsonLd } from "@/lib/jsonLd";
import { fetchSeoFacilities } from "@/lib/typeFacilityCountySeo";
import {
  buildCountySegment,
  buildRegionSegment,
  buildTypeFacilityCountyPath,
  buildTypeLocationPath,
  parseListingLocationSegment,
} from "@/lib/locationRoutes";
import {
  distinctListingCollections,
  fetchPublishedRegionListingSummaries,
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
  }>;
};

type RegionInput = {
  counties: string[];
  type: string;
  coreCities?: string[];
};

function getLocationLabel(location: NonNullable<ReturnType<typeof parseListingLocationSegment>>): string {
  if (location.kind === "judet" && location.county) return `județul ${location.county.name}`;
  if (location.region) return location.region.name;
  return "";
}

function getLocationTitle(
  typeSlug: string,
  typeLabel: string,
  location: NonNullable<ReturnType<typeof parseListingLocationSegment>>
): string {
  const seoTypeLabel = getSeoTypeLabel(typeSlug, typeLabel);
  return buildSeoTypeTitle(seoTypeLabel, `în ${getLocationLabel(location)}`);
}

function getLocationDescription(
  typeSlug: string,
  typeLabel: string,
  location: NonNullable<ReturnType<typeof parseListingLocationSegment>>,
  publishedCount?: number
): string {
  const seoTypeLabel = getSeoTypeLabel(typeSlug, typeLabel);
  if (location.kind === "judet" && location.county) {
    return buildSeoTypeDescription(
      seoTypeLabel,
      `în județul ${location.county.name}`,
      0,
      publishedCount
    );
  }
  if (location.kind === "localitate" && location.region) {
    return buildSeoTypeDescription(seoTypeLabel, `în ${location.region.name}`, 0, publishedCount);
  }
  if (location.region) {
    return buildSeoTypeDescription(seoTypeLabel, `în ${location.region.name}`, 0, publishedCount);
  }
  return buildSeoTypeDescription(seoTypeLabel, "în România", 0, publishedCount);
}

function getLocationBadge(location: NonNullable<ReturnType<typeof parseListingLocationSegment>>): string {
  if (location.kind === "judet") return "Județ";
  if (location.kind === "localitate") return "Localitate";
  return "Regiune";
}

function getLocationMetaLabel(location: NonNullable<ReturnType<typeof parseListingLocationSegment>>): string {
  if (location.kind === "judet" && location.county) return `Județul ${location.county.name}`;
  if (location.region) return location.region.name;
  return "România";
}

export async function generateStaticParams() {
  const params: Array<{ type: string; location: string }> = [];
  for (const type of LISTING_TYPES) {
    for (const county of getCounties()) {
      params.push({ type: type.slug, location: buildCountySegment(county.slug) });
    }
    for (const region of allRegions) {
      params.push({ type: type.slug, location: buildRegionSegment(region) });
    }
  }
  return params;
}

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const listingType = getTypeBySlug(params.type);
  const location = parseListingLocationSegment(params.location);
  if (!listingType || !location) return {};

  const canonicalPath = buildTypeLocationPath(listingType.slug, location.canonicalSegment);
  const canonical = new URL(canonicalPath, siteUrl).toString();
  const title = getLocationTitle(listingType.slug, listingType.label, location);

  const supabaseAdmin = getSupabaseAdmin();
  const publishedListingsCount =
    location.kind === "judet" && location.county
      ? await countPublishedListingsByTypeAndCounty(supabaseAdmin, listingType.value, location.county.name)
      : location.region
      ? await countPublishedListingsByTypeAndRegion(supabaseAdmin, listingType.value, location.region)
      : 0;
  const description = getLocationDescription(
    listingType.slug,
    listingType.label,
    location,
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

async function getTypeCountyListings(typeValue: string, countyName: string): Promise<Cazare[]> {
  return fetchPublishedListingSummaries({ typeValue, countyName });
}

async function getTypeRegionListings(typeValue: string, region: RegionInput): Promise<Cazare[]> {
  const countyNames = resolveRegionCountyNames(region.counties);
  return fetchPublishedRegionListingSummaries({
    countyNames,
    typeValue,
    restrictToCoreCities: region.type === "metro",
    coreCities: region.coreCities,
  });
}

export default async function CazariLocationPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const listingType = getTypeBySlug(params.type);
  const location = parseListingLocationSegment(params.location);

  if (!listingType || !location) return notFound();

  const canonicalPath = buildTypeLocationPath(listingType.slug, location.canonicalSegment);
  if (params.location !== location.canonicalSegment) {
    permanentRedirect(canonicalPath);
  }

  const listings =
    location.kind === "judet" && location.county
      ? await getTypeCountyListings(listingType.value, location.county.name)
      : location.region
      ? await getTypeRegionListings(listingType.value, location.region)
      : [];

  const pageUrl = `${siteUrl}${canonicalPath}`;
  const locationName = getLocationMetaLabel(location);
  const title = `${listingType.label} în ${getLocationLabel(location)}`;
  const description = getLocationDescription(listingType.slug, listingType.label, location, listings.length);
  const locationParentHref =
    location.kind === "judet" && location.county
      ? `/judet/${location.county.slug}`
      : location.kind === "localitate" && location.region
      ? `/localitate/${location.region.slug}`
      : location.region
      ? `/regiune/${location.region.slug}`
      : "/cazari";
  const facilityCounts = new Map<string, number>();
  for (const listing of listings) {
    for (const facilityId of listing.facilities) {
      facilityCounts.set(facilityId, (facilityCounts.get(facilityId) || 0) + 1);
    }
  }
  const seoFacilities =
    location.kind === "judet" && location.county
      ? await fetchSeoFacilities(getSupabaseAdmin())
      : [];
  const facilityLinks =
    location.kind === "judet" && location.county
      ? distinctListingCollections(seoFacilities
          .filter((facility) => (facilityCounts.get(facility.id) || 0) >= 3)
          .map((facility) => ({
            href: buildTypeFacilityCountyPath(
              listingType.slug,
              location.county!.slug,
              facility.slug
            ),
            label: `${listingType.label} cu ${facility.name}`,
            description: `${facilityCounts.get(facility.id)} proprietăți publicate în județul ${location.county!.name}.`,
            listingIds: listings.filter((listing) => listing.facilities.includes(facility.id)).map((listing) => listing.id),
          })), listings.map((listing) => listing.id))
      : [];
  const relatedLinks = [
    {
      href: `/cazari/${listingType.slug}`,
      label: `${listingType.label} în România`,
      description: "Revino la categoria națională și compară proprietăți din toate zonele.",
      ...getCategoryPhoto(listingType.slug),
    },
    {
      href: locationParentHref,
      label: `Toate cazările din ${locationName}`,
      description: "Explorează și celelalte tipuri de proprietăți disponibile în această zonă.",
      ...(location.county
        ? getDestinationPhoto(location.county.slug)
        : {}),
    },
    {
      href: "/cazari",
      label: "Toate tipurile de cazare",
      description: "Descoperă întregul catalog organizat pe categorii de proprietăți.",
    },
    ...facilityLinks,
  ];

  const listingJsonLd = buildListingPageJsonLd({
    siteUrl,
    pageUrl,
    typeLabel: listingType.label,
    typeSlug: listingType.slug,
    locationLabel: locationName,
    locationSlug:
      location.kind === "judet" && location.county
        ? location.county.slug
        : location.region
        ? location.region.slug
        : "",
    description,
    includeBreadcrumb: false,
    items: mapListingsToJsonLdItems(listings, siteUrl, locationName),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasă", item: siteUrl },
    { name: "Cazări", item: `${siteUrl}/cazari` },
    { name: listingType.label, item: `${siteUrl}/cazari/${listingType.slug}` },
    { name: locationName, item: pageUrl },
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
            <Link href="/cazari" className="hover:underline">Cazări</Link>
            <span className="mx-2">/</span>
            <Link href={`/cazari/${listingType.slug}`} className="hover:underline">
              {listingType.label}
            </Link>
            <span className="mx-2">/</span>
            <span>{locationName}</span>
          </nav>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            {getLocationBadge(location)}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-600 dark:text-zinc-400">{description}</p>
        </header>

        <ListingCollectionResults
          listings={listings}
          emptyTitle={
            <>Momentan nu avem {listingType.label.toLowerCase()} în {locationName}</>
          }
          emptyDescription={
            <>Publicăm treptat locații reale, atent verificate. Revino în curând sau înscrie o proprietate dacă știi una.</>
          }
        />
        <SeoRelatedLinks
          title={`Continuă explorarea din ${locationName}`}
          description="Navighează către categoria principală sau descoperă toate tipurile de cazare din aceeași zonă."
          links={relatedLinks}
        />
      </main>
    </>
  );
}
