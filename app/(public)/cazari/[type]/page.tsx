import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLdScripts from '@/components/seo/JsonLdScripts';
import ListingCollectionResults from '@/components/seo/ListingCollectionResults';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getTypeBySlug, LISTING_TYPES } from '@/lib/listingTypes';
import { getCounties } from '@/lib/counties';
import { normalizeRegionText } from '@/lib/regions';
import { getCanonicalSiteUrl } from '@/lib/siteUrl';
import { resolveListingsRouteIndexability } from '@/lib/seoRouteIndexing';
import { countPublishedListingsByType } from '@/lib/seoListingsCounts';
import { buildSeoTypeDescription, buildSeoTypeTitle, getSeoTypeLabel } from '@/lib/seoCopy';
import { buildPageMetadata } from '@/lib/seoMetadata';
import { buildBreadcrumbJsonLd, buildListingPageJsonLd } from '@/lib/jsonLd';
import { buildTypeCountyPath } from '@/lib/typeCountyRoutes';
import {
  fetchPublishedListingSummaries,
  mapListingsToJsonLdItems,
} from '@/lib/publicListingCollections';
import { hasMinimumPublishedListings } from '@/lib/seoIndexing';
import type { Cazare } from '@/lib/utils';
import ExploreCard from '@/components/explore/ExploreCard';
import { getDestinationPhoto } from '@/lib/exploreCards';
import FacilityCollectionPage from '@/components/explore/FacilityCollectionPage';
import { FACILITY_COLLECTIONS, getFacilityCollectionBySlug } from '@/lib/facilityCollections';
import { getPublishedFacilityCollections } from '@/lib/server/facilityCollections';

export const revalidate = 21600;

const siteUrl = getCanonicalSiteUrl();

type PageProps = {
  params: Promise<{ type: string }>;
};

export async function generateStaticParams() {
  return [...LISTING_TYPES, ...FACILITY_COLLECTIONS].map((type) => ({ type: type.slug }));
}

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const facilityCollection = getFacilityCollectionBySlug(params.type);
  if (facilityCollection) {
    const collections = await getPublishedFacilityCollections();
    const count = collections.find((collection) => collection.slug === facilityCollection.slug)?.count || 0;
    const pathname = `/cazari/${facilityCollection.slug}`;
    const shouldIndex = await resolveListingsRouteIndexability(pathname, count);
    return buildPageMetadata({
      title: facilityCollection.title,
      description: facilityCollection.description,
      pathname,
      robots: shouldIndex ? undefined : { index: false, follow: true },
    });
  }
  const listingType = getTypeBySlug(params.type);
  if (!listingType) return {};
  const seoTypeLabel = getSeoTypeLabel(listingType.slug, listingType.label);
  const title = buildSeoTypeTitle(seoTypeLabel, "în România");
  const canonical = new URL(`/cazari/${listingType.slug}`, siteUrl).toString();
  const supabaseAdmin = getSupabaseAdmin();
  const publishedListingsCount = await countPublishedListingsByType(supabaseAdmin, listingType.value);
  const description = buildSeoTypeDescription(
    seoTypeLabel,
    "în România",
    0,
    publishedListingsCount
  );
  const shouldIndex = await resolveListingsRouteIndexability(
    `/cazari/${listingType.slug}`,
    publishedListingsCount
  );
  return buildPageMetadata({
    title,
    description,
    canonicalUrl: canonical,
    robots: shouldIndex ? undefined : { index: false, follow: true },
  });
}


async function getTypeListings(typeValue: string): Promise<Cazare[]> {
  return fetchPublishedListingSummaries({ typeValue });
}

type CountyLinkItem = {
  countyName: string;
  countySlug: string;
  href: string;
  count: number;
};

async function getTypeCountyLinks(typeSlug: string, typeValue: string): Promise<CountyLinkItem[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("judet")
    .eq("is_published", true)
    .in("publication_status", ["active", "expiring"])
    .or(`publication_expires_at.is.null,publication_expires_at.gt.${new Date().toISOString()}`)
    .eq("type", typeValue);

  if (error || !data) return [];

  const counties = getCounties();
  const countyByKey = new Map(
    counties.map((county) => [normalizeRegionText(county.name), county] as const)
  );
  const countsBySlug = new Map<string, number>();

  for (const row of data as Array<Record<string, unknown>>) {
    const key = normalizeRegionText(String(row["judet"] || ""));
    const county = countyByKey.get(key);
    if (!county) continue;
    countsBySlug.set(county.slug, (countsBySlug.get(county.slug) || 0) + 1);
  }

  return counties
    .map((county) => ({
      countyName: county.name,
      countySlug: county.slug,
      href: buildTypeCountyPath(typeSlug, county.slug),
      count: countsBySlug.get(county.slug) || 0,
    }))
    .filter((item) => hasMinimumPublishedListings(item.count))
    .sort((a, b) => (b.count - a.count) || a.countyName.localeCompare(b.countyName, "ro"))
    .slice(0, 12);
}

export default async function TypePage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  if (getFacilityCollectionBySlug(params.type)) {
    return <FacilityCollectionPage slug={params.type} />;
  }
  const listingType = getTypeBySlug(params.type);
  if (!listingType) return notFound();

  const [listings, countyLinks] = await Promise.all([
    getTypeListings(listingType.value),
    getTypeCountyLinks(listingType.slug, listingType.value),
  ]);
  const pageUrl = `${siteUrl}/cazari/${listingType.slug}`;
  const resultLabel =
    listings.length === 1
      ? `1 proprietate publicată din categoria ${listingType.singular.toLowerCase()}`
      : `${listings.length} ${listingType.label.toLowerCase()} publicate`;
  const description = `Descoperă ${resultLabel} în România, cu informații verificate și contact direct la gazdă.`;

  const listingJsonLd = buildListingPageJsonLd({
    siteUrl,
    pageUrl,
    typeLabel: listingType.label,
    typeSlug: listingType.slug,
    description,
    includeBreadcrumb: false,
    items: mapListingsToJsonLdItems(listings, siteUrl, 'România'),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasă", item: siteUrl },
    { name: listingType.label, item: `${siteUrl}/cazari/${listingType.slug}` },
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
            <Link href="/" className="hover:underline">Acasă</Link>
            <span className="mx-2">/</span>
            <Link href="/cazari" className="hover:underline">Cazări</Link>
            <span className="mx-2">/</span>
            <span>{listingType.label}</span>
          </nav>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            Colecția CABN
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            {listingType.label} în România
          </h1>
          <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-400">{description}</p>
        </header>

        {countyLinks.length > 0 && (
          <section className="mt-10" aria-labelledby="destinatii-categorie">
            <h2 id="destinatii-categorie" className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {listingType.label} după destinație
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Alege un județ și descoperă selecția de {listingType.label.toLowerCase()} din zonă.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {countyLinks.map((item) => (
                <ExploreCard
                  key={item.countySlug}
                  href={item.href}
                  title={item.countyName}
                  eyebrow={listingType.label}
                  subtitle={`${listingType.label} în județul ${item.countyName}`}
                  count={item.count}
                  {...getDestinationPhoto(item.countySlug)}
                />
              ))}
            </div>
          </section>
        )}

        <h2 className="mt-14 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Toate proprietățile din această categorie
        </h2>
        <ListingCollectionResults
          listings={listings}
          className="mt-6"
          emptyTitle={<>Momentan nu avem {listingType.label.toLowerCase()} publicate</>}
          emptyDescription={
            <>Publicăm treptat locații reale, atent verificate. Revino în curând sau înscrie o proprietate.</>
          }
        />
      </main>
    </>
  );
}
