import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLdScripts from "@/components/seo/JsonLdScripts";
import ListingCollectionResults from "@/components/seo/ListingCollectionResults";
import { getCounties } from "@/lib/counties";
import { buildBreadcrumbJsonLd, buildListingPageJsonLd } from "@/lib/jsonLd";
import { mapListingsToJsonLdItems } from "@/lib/publicListingCollections";
import { normalizeRegionText } from "@/lib/regions";
import { getPublishedFacilityCollections } from "@/lib/server/facilityCollections";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import type { Cazare } from "@/lib/utils";

function groupByCounty(listings: Cazare[]) {
  const counties = new Map(getCounties().map((county) => [normalizeRegionText(county.name), county]));
  const groups = new Map<string, { name: string; listings: Cazare[] }>();

  for (const listing of listings) {
    const countyName = listing.locatie.slice(listing.locatie.lastIndexOf(",") + 1).trim();
    const county = counties.get(normalizeRegionText(countyName));
    const key = county?.slug ?? "alte-destinatii";
    const group = groups.get(key);
    if (group) {
      group.listings.push(listing);
    } else {
      groups.set(key, { name: county?.name ?? "Alte destinații", listings: [listing] });
    }
  }

  return Array.from(groups, ([slug, group]) => ({ slug, ...group }))
    .sort((a, b) => b.listings.length - a.listings.length || a.name.localeCompare(b.name, "ro"));
}

export default async function FacilityCollectionPage({ slug }: { slug: string }) {
  const collection = (await getPublishedFacilityCollections()).find((item) => item.slug === slug);
  if (!collection) return notFound();

  const siteUrl = getCanonicalSiteUrl();
  const pageUrl = `${siteUrl}/cazari/${collection.slug}`;
  const countyGroups = slug === "cu-ciubar" ? groupByCounty(collection.listings) : [];
  const scripts = [
    buildBreadcrumbJsonLd([
      { name: "Acasă", item: siteUrl },
      { name: "Cazări", item: `${siteUrl}/cazari` },
      { name: collection.label, item: pageUrl },
    ]),
    ...buildListingPageJsonLd({
      siteUrl,
      pageUrl,
      typeLabel: collection.label,
      typeSlug: collection.slug,
      description: collection.description,
      includeBreadcrumb: false,
      items: mapListingsToJsonLdItems(collection.listings, siteUrl, "România"),
    }),
  ];

  return (
    <>
      <JsonLdScripts scripts={scripts} />
      <main className="min-h-screen py-6 sm:py-10">
        <header className="max-w-3xl">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/" className="hover:underline">Acasă</Link>
            <span className="mx-2">/</span>
            <Link href="/cazari" className="hover:underline">Cazări</Link>
            <span className="mx-2">/</span>
            <span>{collection.label}</span>
          </nav>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Colecția CABN</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">{collection.title}</h1>
          <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-400">{collection.description}</p>
          <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{collection.advice}</p>
        </header>
        <h2 className="mt-14 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Proprietăți din această selecție
        </h2>
        {countyGroups.length > 1 ? (
          <>
            <nav aria-label="Alege județul" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {countyGroups.map(({ slug: countySlug, name, listings }) => (
                <a key={countySlug} href={`#cazari-${countySlug}`} className="underline underline-offset-2">
                  {name} ({listings.length})
                </a>
              ))}
            </nav>
            {countyGroups.map(({ slug: countySlug, name, listings }) => (
              <section key={countySlug} aria-labelledby={`cazari-${countySlug}`} className="mt-10">
                <h3 id={`cazari-${countySlug}`} className="scroll-mt-28 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {name}
                </h3>
                <ListingCollectionResults listings={listings} className="mt-4" emptyTitle={null} emptyDescription={null} />
              </section>
            ))}
          </>
        ) : (
          <ListingCollectionResults
            listings={collection.listings}
            className="mt-6"
            emptyTitle="Momentan nu avem proprietăți publicate în această selecție"
            emptyDescription="Revino în curând sau explorează celelalte categorii de cazare."
          />
        )}
      </main>
    </>
  );
}
