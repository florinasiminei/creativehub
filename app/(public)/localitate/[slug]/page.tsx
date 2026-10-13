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
import { findRegionBySlug, metroRegions } from "@/lib/regions";
import { buildBreadcrumbJsonLd, buildListingPageJsonLd } from "@/lib/jsonLd";
import { distinctListingCollections, fetchPublishedRegionListingSummaries, mapListingsToJsonLdItems } from "@/lib/publicListingCollections";
import type { Cazare } from "@/lib/utils";
import { LISTING_TYPES } from "@/lib/listingTypes";
import { buildTypeRegionPath } from "@/lib/locationRoutes";
import { hasMinimumPublishedListings } from "@/lib/seoIndexing";
import { getCategoryPhoto } from "@/lib/exploreCards";

export const revalidate = 21600;

const siteUrl = getCanonicalSiteUrl();

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return metroRegions.map((region) => ({ slug: region.slug }));
}

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const region = findRegionBySlug(params.slug);
  if (!region) return {};
  if (region.type !== "metro") {
    const canonicalRegion = new URL(`/regiune/${region.slug}`, siteUrl).toString();
    const title = buildSeoCollectionTitle(`în ${region.name}`);
    const description = buildSeoCollectionDescription(`în ${region.name}`);
    return buildPageMetadata({
      title,
      description,
      canonicalUrl: canonicalRegion,
      robots: { index: false, follow: true },
    });
  }

  const title = buildSeoCollectionTitle(`în ${region.name}`);
  const canonicalPath = `/localitate/${region.slug}`;
  const canonical = new URL(canonicalPath, siteUrl).toString();
  const supabaseAdmin = getSupabaseAdmin();
  const publishedListingsCount = await countPublishedListingsByRegion(supabaseAdmin, region);
  const description = buildSeoCollectionDescription(
    `în ${region.name}`,
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

async function getRegionListings(region: { counties: string[]; type: string; coreCities?: string[] }): Promise<Cazare[]> {
  const countyNames = resolveRegionCountyNames(region.counties);
  return fetchPublishedRegionListingSummaries({
    countyNames,
    restrictToCoreCities: true,
    coreCities: region.coreCities,
  });
}

export default async function LocalityPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const region = findRegionBySlug(params.slug);
  if (!region) return notFound();
  if (region.type !== "metro") {
    permanentRedirect(`/regiune/${region.slug}`);
  }

  const listings = await getRegionListings(region);
  const countsByType = new Map<string, number>();
  listings.forEach((listing) => {
    countsByType.set(listing.tip, (countsByType.get(listing.tip) || 0) + 1);
  });
  const relatedLinks = distinctListingCollections(LISTING_TYPES.flatMap((type) => {
    const count = countsByType.get(type.value) || 0;
    if (!hasMinimumPublishedListings(count)) return [];
    return [
      {
        href: buildTypeRegionPath(type.slug, region),
        label: `${type.label} în ${region.name}`,
        description: `${count} ${count === 1 ? "proprietate publicată" : "proprietăți publicate"} în selecția locală.`,
        listingIds: listings.filter((listing) => listing.tip === type.value).map((listing) => listing.id),
        ...getCategoryPhoto(type.slug),
      },
    ];
  }), listings.map((listing) => listing.id));
  const pageUrl = `${siteUrl}/localitate/${region.slug}`;
  const description = `Descoperă cazările din ${region.name}. Compară proprietăți verificate și contactează direct gazda.`;

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
    { name: "Acasa", item: siteUrl },
    { name: `Localitate ${region.name}`, item: pageUrl },
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Localitate</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">Cazări în {region.name}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-600 dark:text-zinc-400">{description}</p>
        </header>

        <ListingCollectionResults
          listings={listings}
          emptyTitle={<>Momentan nu avem cazari publicate in {region.name}</>}
          emptyDescription={
            <>Publicam treptat locatii reale, atent verificate. Revino in curand sau inscrie o proprietate.</>
          }
        />
        <SeoRelatedLinks
          title={`Explorează cazările din ${region.name} după tip`}
          description="Folosește legăturile către colecțiile locale care au proprietăți publicate sau revino la toate categoriile."
          links={[
            ...relatedLinks,
            {
              href: "/cazari",
              label: "Toate categoriile de cazare",
              description: "Vezi catalogul național organizat după tipul proprietății.",
            },
          ]}
        />
      </main>
    </>
  );
}
