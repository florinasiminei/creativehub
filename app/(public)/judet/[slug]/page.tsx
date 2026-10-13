import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import JsonLdScripts from "@/components/seo/JsonLdScripts";
import ListingCollectionResults from "@/components/seo/ListingCollectionResults";
import SeoRelatedLinks from "@/components/seo/SeoRelatedLinks";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { LISTING_TYPES, type ListingTypeValue } from "@/lib/listingTypes";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { resolveListingsRouteIndexability } from "@/lib/seoRouteIndexing";
import { countPublishedListingsByCounty } from "@/lib/seoListingsCounts";
import { buildSeoCollectionDescription, buildSeoCollectionTitle } from "@/lib/seoCopy";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { buildBreadcrumbJsonLd, buildListingPageJsonLd } from "@/lib/jsonLd";
import { findCountyBySlug, getCounties, type CountyDefinition } from "@/lib/counties";
import { buildTypeCountyPath } from "@/lib/typeCountyRoutes";
import { normalizeRegionText, touristRegions } from "@/lib/regions";
import {
  fetchPublishedListingSummaries,
  mapListingsToJsonLdItems,
} from "@/lib/publicListingCollections";
import type { Cazare } from "@/lib/utils";
import Image from "next/image";
import ExploreCard from "@/components/explore/ExploreCard";
import { getCategoryPhoto, getDestinationPhoto } from "@/lib/exploreCards";
import { hasMinimumPublishedListings } from "@/lib/seoIndexing";

export const revalidate = 21600;

const siteUrl = getCanonicalSiteUrl();

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getCounties().map((county) => ({ slug: county.slug }));
}

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const county = findCountyBySlug(params.slug);
  if (!county) return {};
  const title = buildSeoCollectionTitle(`în județul ${county.name}`);
  const canonical = new URL(`/judet/${county.slug}`, siteUrl).toString();
  const supabaseAdmin = getSupabaseAdmin();
  const publishedListingsCount = await countPublishedListingsByCounty(supabaseAdmin, county.name);
  const description = buildSeoCollectionDescription(
    `în județul ${county.name}`,
    0,
    publishedListingsCount
  );
  const shouldIndex = await resolveListingsRouteIndexability(
    `/judet/${county.slug}`,
    publishedListingsCount
  );

  return buildPageMetadata({
    title,
    description,
    canonicalUrl: canonical,
    robots: shouldIndex ? undefined : { index: false, follow: true },
  });
}

async function getCountyListings(countyName: string): Promise<Cazare[]> {
  return fetchPublishedListingSummaries({ countyName });
}

async function getOtherDestinationLinks(county: CountyDefinition) {
  const countyKey = normalizeRegionText(county.name);
  const regionalCountyKeys = new Set(
    touristRegions
      .filter((region) => region.counties.some((name) => normalizeRegionText(name) === countyKey))
      .flatMap((region) => region.counties.map(normalizeRegionText))
  );
  const candidates = getCounties().filter(
    (item) => item.slug !== county.slug && regionalCountyKeys.has(normalizeRegionText(item.name))
  );
  if (candidates.length === 0) return [];

  const { data, error } = await getSupabaseAdmin()
    .from("listings")
    .select("judet")
    .eq("is_published", true)
    .in("publication_status", ["active", "expiring"])
    .or(`publication_expires_at.is.null,publication_expires_at.gt.${new Date().toISOString()}`)
    .in("judet", candidates.map((item) => item.name));
  if (error || !data) return [];

  const counts = new Map<string, number>();
  data.forEach((row) => {
    const key = normalizeRegionText(String(row.judet || ""));
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return candidates
    .map((item) => ({ ...item, count: counts.get(normalizeRegionText(item.name)) || 0 }))
    .filter((item) => hasMinimumPublishedListings(item.count))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ro"))
    .slice(0, 4)
    .map((item) => ({
      href: `/judet/${item.slug}`,
      label: `Cazări în județul ${item.name}`,
      description: `${item.count} proprietăți de descoperit într-o altă destinație.`,
      ...getDestinationPhoto(item.slug),
    }));
}

type TypeLinkItem = {
  typeValue: ListingTypeValue;
  typeSlug: string;
  typeLabel: string;
  href: string;
  count: number;
};

async function getCountyTypeLinks(countySlug: string, countyName: string): Promise<TypeLinkItem[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("type")
    .eq("is_published", true)
    .in("publication_status", ["active", "expiring"])
    .or(`publication_expires_at.is.null,publication_expires_at.gt.${new Date().toISOString()}`)
    .eq("judet", countyName);

  if (error || !data) return [];

  const countsByType = new Map<string, number>();
  for (const row of data as Array<Record<string, unknown>>) {
    const typeKey = String(row["type"] || "").trim().toLowerCase();
    if (!typeKey) continue;
    countsByType.set(typeKey, (countsByType.get(typeKey) || 0) + 1);
  }

  return LISTING_TYPES
    .map((type) => ({
      typeValue: type.value,
      typeSlug: type.slug,
      typeLabel: type.label,
      href: buildTypeCountyPath(type.slug, countySlug),
      count: countsByType.get(type.value) || 0,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => (b.count - a.count) || a.typeLabel.localeCompare(b.typeLabel, "ro"));
}

export default async function CountyPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const county = findCountyBySlug(params.slug);
  if (!county) return notFound();
  if (params.slug !== county.slug) {
    permanentRedirect(`/judet/${county.slug}`);
  }

  const [listings, typeLinks, destinationLinks] = await Promise.all([
    getCountyListings(county.name),
    getCountyTypeLinks(county.slug, county.name),
    getOtherDestinationLinks(county),
  ]);
  const pageUrl = `${siteUrl}/judet/${county.slug}`;
  const destinationPhoto = getDestinationPhoto(county.slug);
  const description = `Descoperă ${listings.length} cazări publicate în județul ${county.name}. Compară tipul proprietății, capacitatea și facilitățile, cu rezervare directă la gazdă.`;

  const listingJsonLd = buildListingPageJsonLd({
    siteUrl,
    pageUrl,
    typeLabel: "Cazare",
    typeSlug: "cazare",
    locationLabel: `Judetul ${county.name}`,
    locationSlug: county.slug,
    description,
    includeBreadcrumb: false,
    items: mapListingsToJsonLdItems(listings, siteUrl, county.name),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasă", item: siteUrl },
    { name: `Județ ${county.name}`, item: `${siteUrl}/judet/${county.slug}` },
  ]);
  const jsonLdScripts: Record<string, unknown>[] = [
    breadcrumbJsonLd,
    ...listingJsonLd,
  ];

  return (
    <>
      <JsonLdScripts scripts={jsonLdScripts} />
      <main className="min-h-screen py-6 sm:py-10">
        <header className={destinationPhoto.image ? "grid items-center gap-8 lg:grid-cols-2" : "max-w-3xl"}>
          <div>
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
              <Link href="/" className="hover:underline">
                Acasă
              </Link>
              <span className="mx-2">/</span>
              <Link href="/cazari" className="hover:underline">Cazări</Link>
              <span className="mx-2">/</span>
              <span>{county.name}</span>
            </nav>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Descoperă destinația</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">Cazări în județul {county.name}</h1>
            <p className="mt-4 max-w-2xl leading-7 text-zinc-600 dark:text-zinc-400">{description}</p>
          </div>
          {destinationPhoto.image && (
            <figure>
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-zinc-100 dark:bg-zinc-800">
                <Image src={destinationPhoto.image} alt={destinationPhoto.imageAlt || county.name} fill sizes="(max-width: 1023px) 90vw, 45vw" className="object-cover" style={{ objectPosition: destinationPhoto.imagePosition }} />
              </div>
            </figure>
          )}
        </header>

        {typeLinks.length > 0 && (
          <section className="mt-12" aria-labelledby="categorii-judet">
            <h2 id="categorii-judet" className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Ce fel de cazare cauți în {county.name}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Alege un tip de proprietate. Vei vedea doar cazările din județul {county.name}.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {typeLinks.map((item) => (
                <ExploreCard
                  key={item.typeSlug}
                  href={item.href}
                  title={item.typeLabel}
                  eyebrow={county.name}
                  subtitle={`${item.typeLabel} în județul ${county.name}`}
                  count={item.count}
                  {...getCategoryPhoto(item.typeSlug)}
                />
              ))}
            </div>
          </section>
        )}
        <h2 className="mt-14 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Toate cazările din {county.name}
        </h2>
        <ListingCollectionResults
          listings={listings}
          className="mt-6"
          emptyTitle={<>Momentan nu avem cazări publicate în județul {county.name}</>}
          emptyDescription={
            <>Publicăm treptat locații reale, atent verificate. Revino în curând sau înscrie o proprietate.</>
          }
        />
        <SeoRelatedLinks
          title="Alte destinații de explorat"
          description={`Descoperă alte județe din regiunile turistice de care aparține ${county.name}, fiecare cu o selecție diferită de cazări.`}
          links={destinationLinks}
        />
      </main>
    </>
  );
}
