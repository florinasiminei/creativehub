import type { Metadata } from "next";
import Link from "next/link";
import { LISTING_TYPES } from "@/lib/listingTypes";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveListingsRouteIndexability } from "@/lib/seoRouteIndexing";
import { countPublishedListings } from "@/lib/seoListingsCounts";
import { buildSeoCollectionDescription, buildSeoCollectionTitle } from "@/lib/seoCopy";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd, serializeJsonLd } from "@/lib/jsonLd";
import { getCounties } from "@/lib/counties";
import { normalizeRegionText } from "@/lib/regions";
import { hasMinimumPublishedListings } from "@/lib/seoIndexing";
import ExploreCard from "@/components/explore/ExploreCard";
import { getCategoryPhoto, getDestinationPhoto } from "@/lib/exploreCards";
import type { ListingRaw } from "@/lib/types";
import { COLLECTION_IMAGE_SIZES } from "@/lib/imageConfig";

export const revalidate = 21600;

const siteUrl = getCanonicalSiteUrl();
const pagePath = "/cazari";
const pageUrl = `${siteUrl}${pagePath}`;
const pageHeading = "Categorii de cazări";
const pageIntro =
  "Alege tipul de proprietate care te interesează și vezi listări verificate, cu contact direct la gazdă.";

async function getPublishedCollectionCounts() {
  const { data, error } = await getSupabaseAdmin()
    .from("listings")
    .select("type, judet")
    .eq("is_published", true)
    .in("publication_status", ["active", "expiring"])
    .or(`publication_expires_at.is.null,publication_expires_at.gt.${new Date().toISOString()}`);

  if (error || !data) {
    return { typeCounts: new Map<string, number>(), countyLinks: [] };
  }

  const typeCounts = new Map<string, number>();
  const countyCounts = new Map<string, number>();
  const countyByName = new Map(
    getCounties().map((county) => [normalizeRegionText(county.name), county] as const)
  );

  (data as Array<Pick<ListingRaw, "type" | "judet">>).forEach((listing) => {
    const type = String(listing.type || "").trim();
    if (type) typeCounts.set(type, (typeCounts.get(type) || 0) + 1);

    const county = countyByName.get(normalizeRegionText(String(listing.judet || "")));
    if (county) countyCounts.set(county.slug, (countyCounts.get(county.slug) || 0) + 1);
  });

  const countyLinks = getCounties()
    .map((county) => ({
      ...county,
      count: countyCounts.get(county.slug) || 0,
    }))
    .filter((county) => hasMinimumPublishedListings(county.count))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ro"))
    .slice(0, 12);

  return { typeCounts, countyLinks };
}

export async function generateMetadata(): Promise<Metadata> {
  const supabaseAdmin = getSupabaseAdmin();
  const publishedListingsCount = await countPublishedListings(supabaseAdmin);
  const title = buildSeoCollectionTitle("pe tipuri în România");
  const description = buildSeoCollectionDescription(
    "pe tipuri în România",
    0,
    publishedListingsCount
  );

  const shouldIndex = await resolveListingsRouteIndexability(pagePath, publishedListingsCount);

  return buildPageMetadata({
    title,
    description,
    pathname: pagePath,
    canonicalUrl: pageUrl,
    robots: shouldIndex ? undefined : { index: false, follow: true },
  });
}

export default async function CazariIndexPage() {
  const { typeCounts, countyLinks } = await getPublishedCollectionCounts();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasă", item: siteUrl },
    { name: "Cazări", item: pageUrl },
  ]);
  const collectionJsonLd = buildCollectionPageJsonLd({
    siteUrl,
    pageUrl,
    name: pageHeading,
    description: pageIntro,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionJsonLd) }}
      />
      <main className="min-h-screen py-6 sm:py-10">
        <header className="max-w-3xl">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/" className="hover:underline">Acasă</Link>
            <span className="mx-2">/</span>
            <span>Cazări</span>
          </nav>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            Găsește locul potrivit
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">{pageHeading}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-600 dark:text-zinc-400">{pageIntro}</p>
        </header>

        <section aria-labelledby="tipuri-cazare" className="mt-10">
          <h2 id="tipuri-cazare" className="sr-only">Tipuri de cazare</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {LISTING_TYPES.filter((type) => (typeCounts.get(type.value) || 0) > 0).map((type) => {
              const count = typeCounts.get(type.value) || 0;
              return (
                <ExploreCard
                  key={type.slug}
                  href={`/cazari/${type.slug}`}
                  title={type.label}
                  subtitle={`Descoperă ${type.label.toLowerCase()} în România`}
                  count={count}
                  {...getCategoryPhoto(type.slug)}
                />
              );
            })}
          </div>
        </section>

        {countyLinks.length > 0 && (
          <section className="mt-14" aria-labelledby="cazari-dupa-judet">
            <h2 id="cazari-dupa-judet" className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Descoperă România, destinație cu destinație
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Alege un județ și compară toate tipurile de cazare disponibile în zonă.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {countyLinks.map((county) => (
                <ExploreCard
                  key={county.slug}
                  href={`/judet/${county.slug}`}
                  title={county.name}
                  subtitle={`Cazări în județul ${county.name}`}
                  imageSizes={COLLECTION_IMAGE_SIZES}
                  count={county.count}
                  {...getDestinationPhoto(county.slug)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
