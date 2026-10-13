import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import JsonLdScripts from "@/components/seo/JsonLdScripts";
import ListingCollectionResults from "@/components/seo/ListingCollectionResults";
import SeoRelatedLinks from "@/components/seo/SeoRelatedLinks";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { resolveListingsRouteIndexability } from "@/lib/seoRouteIndexing";
import {
  countPublishedListingsByRegion,
  resolveRegionCountyNames,
} from "@/lib/seoListingsCounts";
import { buildSeoCollectionDescription, buildSeoCollectionTitle } from "@/lib/seoCopy";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { findRegionBySlug, normalizeRegionText, parseLocationLabel, touristRegions } from "@/lib/regions";
import { buildBreadcrumbJsonLd, buildListingPageJsonLd } from "@/lib/jsonLd";
import { buildRegionPagePath, buildTypeRegionPath } from "@/lib/locationRoutes";
import { LISTING_TYPES } from "@/lib/listingTypes";
import { getCounties } from "@/lib/counties";
import { distinctListingCollections, fetchPublishedRegionListingSummaries, mapListingsToJsonLdItems } from "@/lib/publicListingCollections";
import type { Cazare } from "@/lib/utils";
import { getCategoryPhoto, getDestinationPhoto } from "@/lib/exploreCards";

export const revalidate = 21600;

const siteUrl = getCanonicalSiteUrl();

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return touristRegions.map((region) => ({ slug: region.slug }));
}

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const region = findRegionBySlug(params.slug);
  if (!region) return {};
  if (region.type === "metro") {
    const canonicalLocality = new URL(`/localitate/${region.slug}`, siteUrl).toString();
    const title = buildSeoCollectionTitle(`în ${region.name}`);
    const description = buildSeoCollectionDescription(`în ${region.name}`);
    return buildPageMetadata({
      title,
      description,
      canonicalUrl: canonicalLocality,
      robots: { index: false, follow: true },
    });
  }
  const title = buildSeoCollectionTitle(`în ${region.name}`);
  const canonicalPath = buildRegionPagePath(region);
  const canonical = new URL(canonicalPath, siteUrl).toString();
  const supabaseAdmin = getSupabaseAdmin();
  const publishedListingsCount = await countPublishedListingsByRegion(supabaseAdmin, region);
  const description = buildSeoCollectionDescription(
    `în ${region.name}`,
    0,
    publishedListingsCount
  );
  const shouldIndex = await resolveListingsRouteIndexability(
    canonicalPath,
    publishedListingsCount
  );

  return buildPageMetadata({
    title,
    description,
    canonicalUrl: canonical,
    robots: shouldIndex ? undefined : { index: false, follow: true },
  });
}

async function getRegionListings(region: { counties: string[]; type: string; coreCities?: string[] }): Promise<Cazare[]> {
  const countyNames = resolveRegionCountyNames(region.counties);
  return fetchPublishedRegionListingSummaries({
    countyNames,
    restrictToCoreCities: region.type === "metro",
    coreCities: region.coreCities,
  });
}

export default async function RegionPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const region = findRegionBySlug(params.slug);
  if (!region) return notFound();
  if (region.type === "metro") {
    permanentRedirect(`/localitate/${region.slug}`);
  }

  const listings = await getRegionListings(region);
  const pagePath = buildRegionPagePath(region);
  const pageUrl = `${siteUrl}${pagePath}`;
  const countyNames = resolveRegionCountyNames(region.counties);
  const countyKeys = new Set(countyNames.map((county) => normalizeRegionText(county)));
  const relatedCounties = getCounties().filter((county) => {
    const countyKey = normalizeRegionText(county.name);
    if (!countyKeys.has(countyKey)) return false;
    return listings.filter((listing) => normalizeRegionText(parseLocationLabel(listing.locatie).county) === countyKey).length >= 3;
  });
  const description = `Descoperă cazări verificate în ${region.name}, din județele ${countyNames.join(", ")}. Compară locația, capacitatea și facilitățile, apoi contactează direct proprietarul.`;
  const relatedLinks = distinctListingCollections([
    ...LISTING_TYPES
      .filter((type) => listings.filter((listing) => listing.tip === type.value).length >= 3)
      .map((type) => ({
        href: buildTypeRegionPath(type.slug, region),
        label: `${type.label} în ${region.name}`,
        description: `Vezi selecția de ${type.label.toLowerCase()} disponibilă în regiune.`,
        listingIds: listings.filter((listing) => listing.tip === type.value).map((listing) => listing.id),
        ...getCategoryPhoto(type.slug),
      })),
    ...relatedCounties.map((county) => ({
      href: `/judet/${county.slug}`,
      label: `Cazări în județul ${county.name}`,
      description: `Explorează toate proprietățile publicate în județul ${county.name}.`,
      listingIds: listings.filter((listing) => normalizeRegionText(parseLocationLabel(listing.locatie).county) === normalizeRegionText(county.name)).map((listing) => listing.id),
      ...getDestinationPhoto(county.slug),
    })),
  ], listings.map((listing) => listing.id));

  const listingJsonLd = buildListingPageJsonLd({
    siteUrl,
    pageUrl,
    typeLabel: "Cazare",
    typeSlug: "cazare",
    locationLabel: region.name,
    locationSlug: region.slug,
    description,
    includeBreadcrumb: false,
    items: mapListingsToJsonLdItems(listings, siteUrl, region.name),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasă", item: siteUrl },
    { name: `Regiune ${region.name}`, item: pageUrl },
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
            <span>{region.name}</span>
          </nav>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            Regiune
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">Cazări în {region.name}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-600 dark:text-zinc-400">{description}</p>
        </header>

        <ListingCollectionResults
          listings={listings}
          emptyTitle={<>Momentan nu avem cazări publicate în {region.name}</>}
          emptyDescription={
            <>Publicăm treptat locații reale, atent verificate. Revino în curând sau înscrie o proprietate.</>
          }
        />
        <SeoRelatedLinks
          title={`Explorează mai multe cazări în ${region.name}`}
          description="Continuă căutarea după tipul proprietății sau restrânge rezultatele la un județ din această regiune."
          links={relatedLinks}
        />
      </main>
    </>
  );
}
