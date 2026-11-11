import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLdScripts from '@/components/seo/JsonLdScripts';
import ListingCollectionResults from '@/components/seo/ListingCollectionResults';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getTypeBySlug, LISTING_TYPES } from '@/lib/listingTypes';
import { getCounties } from '@/lib/counties';
import { findRegionBySlug, normalizeRegionText } from '@/lib/regions';
import { getCanonicalSiteUrl } from '@/lib/siteUrl';
import { resolveListingsRouteIndexability } from '@/lib/seoRouteIndexing';
import { countPublishedListingsByType, resolveRegionCountyNames } from '@/lib/seoListingsCounts';
import { buildSeoTypeDescription, buildSeoTypeTitle, getSeoTypeLabel } from '@/lib/seoCopy';
import { buildPageMetadata } from '@/lib/seoMetadata';
import { buildBreadcrumbJsonLd, buildListingPageJsonLd } from '@/lib/jsonLd';
import { buildTypeCountyPath } from '@/lib/typeCountyRoutes';
import { buildTypeRegionPath } from '@/lib/locationRoutes';
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
const hotTubFacilityName = normalizeRegionText("Ciubăr / Jacuzzi");

const nationalCopy: Partial<Record<string, { title: string; heading?: string; intro?: string }>> = {
  cabane: {
    title: "Cabane de închiriat în România",
    heading: "Cabane autentice în România",
    intro: "Alege o zonă și compară capacitatea și facilitățile cabanelor. Pentru disponibilitate și tariful sejurului, discută direct cu gazda.",
  },
  "a-frame": { title: "Cabane A-frame de închiriat în România" },
};

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
  const title = nationalCopy[listingType.slug]?.title ?? buildSeoTypeTitle(seoTypeLabel, "în România");
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

async function getTypeDestinationLinks(
  typeSlug: string,
  typeValue: string,
): Promise<{ countyLinks: CountyLinkItem[]; apuseniHref?: string }> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("judet")
    .eq("is_published", true)
    .in("publication_status", ["active", "expiring"])
    .or(`publication_expires_at.is.null,publication_expires_at.gt.${new Date().toISOString()}`)
    .eq("type", typeValue);

  if (error || !data) return { countyLinks: [] };

  const rows = data as Array<{ judet?: unknown }>;
  const counties = getCounties();
  const countyByKey = new Map(
    counties.map((county) => [normalizeRegionText(county.name), county] as const)
  );
  const countsBySlug = new Map<string, number>();

  for (const row of rows) {
    const key = normalizeRegionText(String(row.judet || ""));
    const county = countyByKey.get(key);
    if (!county) continue;
    countsBySlug.set(county.slug, (countsBySlug.get(county.slug) || 0) + 1);
  }

  const countyLinks = counties
    .map((county) => ({
      countyName: county.name,
      countySlug: county.slug,
      href: buildTypeCountyPath(typeSlug, county.slug),
      count: countsBySlug.get(county.slug) || 0,
    }))
    .filter((item) => hasMinimumPublishedListings(item.count))
    .sort((a, b) => (b.count - a.count) || a.countyName.localeCompare(b.countyName, "ro"))
    .slice(0, 12);

  const apuseni = typeSlug === "a-frame" ? findRegionBySlug("apuseni") : undefined;
  if (!apuseni) return { countyLinks };

  const apuseniCounties = new Set(resolveRegionCountyNames(apuseni.counties));
  const apuseniCount = rows.filter((row) => apuseniCounties.has(String(row.judet ?? ""))).length;
  const apuseniHref = hasMinimumPublishedListings(apuseniCount)
    ? buildTypeRegionPath(typeSlug, apuseni)
    : undefined;
  return { countyLinks, apuseniHref };
}

export default async function TypePage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  if (getFacilityCollectionBySlug(params.type)) {
    return <FacilityCollectionPage slug={params.type} />;
  }
  const listingType = getTypeBySlug(params.type);
  if (!listingType) return notFound();

  const [listings, { countyLinks, apuseniHref }] = await Promise.all([
    getTypeListings(listingType.value),
    getTypeDestinationLinks(listingType.slug, listingType.value),
  ]);
  const pageUrl = `${siteUrl}/cazari/${listingType.slug}`;
  const resultLabel =
    listings.length === 1
      ? `1 proprietate publicată din categoria ${listingType.singular.toLowerCase()}`
      : `${listings.length} ${listingType.label.toLowerCase()} publicate`;
  const description = `Descoperă ${resultLabel} în România, cu informații verificate și contact direct la gazdă.`;
  const copy = nationalCopy[listingType.slug];
  const isCabinCollection = listingType.slug === "cabane";
  const isAFrame = listingType.slug === "a-frame";
  const hasCountyLinks = countyLinks.length > 0;

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
            {copy?.heading ?? copy?.title ?? `${listingType.label} în România`}
          </h1>
          <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-400">{copy?.intro ?? description}</p>
          {(isCabinCollection || isAFrame) && (
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {isCabinCollection ? (
                <>
                  Mai poți explora <Link href="/cazari/a-frame" className="underline underline-offset-2">cabanele A‑Frame</Link> sau{" "}
                </>
              ) : "Vezi și "}
              <Link href="/cazari/cu-ciubar" className="underline underline-offset-2">cazările cu ciubăr sau jacuzzi</Link>.
            </p>
          )}
        </header>

        {(hasCountyLinks || apuseniHref) && (
          <section className="mt-10" aria-labelledby="destinatii-categorie">
            <h2 id="destinatii-categorie" className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {listingType.label} după destinație
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {hasCountyLinks && (
                <>Alege un județ și descoperă selecția de {isAFrame ? "cabane A‑Frame" : listingType.label.toLowerCase()} din zonă.</>
              )}
              {apuseniHref && (
                <>
                  {hasCountyLinks ? " Sau explorează " : "Explorează "}
                  <Link href={apuseniHref} className="underline underline-offset-2">cabanele A‑Frame din Apuseni</Link>.
                </>
              )}
            </p>
            {hasCountyLinks && (
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
            )}
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
        {isAFrame && listings.length > 0 && (
          <section className="mt-12" aria-labelledby="compara-cabanele">
            <h2 id="compara-cabanele" className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Compară cabanele A-frame
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Confirmă cu gazda tariful pentru datele alese și dacă accesul la ciubăr sau jacuzzi se plătește separat.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/10">
                    <th scope="col" className="px-3 py-2">Cabană</th>
                    <th scope="col" className="px-3 py-2">Localitate</th>
                    <th scope="col" className="px-3 py-2">Persoane</th>
                    <th scope="col" className="px-3 py-2">Tarif afișat</th>
                    <th scope="col" className="px-3 py-2">Ciubăr / jacuzzi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-white/10">
                  {listings.map((listing) => (
                    <tr key={listing.id}>
                      <th scope="row" className="px-3 py-2 font-medium">
                        <Link href={`/cazare/${listing.slug}`} prefetch={false} className="underline underline-offset-2">
                          {listing.title}
                        </Link>
                      </th>
                      <td className="px-3 py-2">{listing.locatie || "—"}</td>
                      <td className="px-3 py-2">{/\d/.test(String(listing.numarPersoane)) ? listing.numarPersoane : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2">{listing.price > 0 ? `${listing.price.toLocaleString("ro-RO")} lei` : "La gazdă"}</td>
                      <td className="px-3 py-2">
                        {listing.facilitiesNames.some((name) => normalizeRegionText(name) === hotTubFacilityName)
                          ? "Menționat"
                          : "Întreabă gazda"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
