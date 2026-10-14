import type { Metadata } from "next";
import Link from "next/link";
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
import AccommodationCategories from "@/components/explore/AccommodationCategories";
import { fetchPublishedListingRows } from "@/lib/publicListingCollections";
import { mapListingSummary } from "@/lib/transformers";

export const revalidate = 21600;

const siteUrl = getCanonicalSiteUrl();
const pagePath = "/cazari";
const pageUrl = `${siteUrl}${pagePath}`;
const pageHeading = "Categorii de cazări";
const pageIntro =
  "Alege cazarea după tip, facilități sau destinație și contactează direct gazda.";

async function getPublishedCollections() {
  const rows = await fetchPublishedListingRows();
  const countyCounts = new Map<string, number>();
  const countyByName = new Map(
    getCounties().map((county) => [normalizeRegionText(county.name), county] as const)
  );

  rows.forEach((listing) => {
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

  return { listings: rows.map((row) => mapListingSummary(row)), countyLinks };
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
  const { listings, countyLinks } = await getPublishedCollections();
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

        <div className="mt-10">
          <AccommodationCategories listings={listings} destinations={countyLinks} />
        </div>
      </main>
    </>
  );
}
