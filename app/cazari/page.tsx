import type { Metadata } from "next";
import Link from "next/link";
import { LISTING_TYPES } from "@/lib/listingTypes";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveListingsRouteIndexability } from "@/lib/seoRouteIndexing";
import { countPublishedListings } from "@/lib/seoListingsCounts";
import { buildSeoCollectionDescription, buildSeoCollectionTitle } from "@/lib/seoCopy";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "@/lib/jsonLd";

export const revalidate = 60 * 60 * 6;

const siteUrl = getCanonicalSiteUrl();
const pagePath = "/cazari";
const pageUrl = `${siteUrl}${pagePath}`;
const pageHeading = "Categorii de cazari";
const pageIntro =
  "Alege tipul de proprietate care te intereseaza si vezi listari verificate, cu contact direct la gazda.";

export async function generateMetadata(): Promise<Metadata> {
  const supabaseAdmin = getSupabaseAdmin();
  const publishedListingsCount = await countPublishedListings(supabaseAdmin);
  const title = buildSeoCollectionTitle("pe tipuri în România");
  const description = buildSeoCollectionDescription("pe tipuri în România");

  const shouldIndex = await resolveListingsRouteIndexability(pagePath, publishedListingsCount);

  return buildPageMetadata({
    title,
    description,
    pathname: pagePath,
    canonicalUrl: pageUrl,
    robots: shouldIndex ? undefined : { index: false, follow: true },
  });
}

export default function CazariIndexPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", item: siteUrl },
    { name: "Cazari", item: pageUrl },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <main className="min-h-screen px-4 py-10 lg:px-6">
        <header className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            cabn.ro
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{pageHeading}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-600">{pageIntro}</p>
        </header>

        <section className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LISTING_TYPES.map((type) => (
            <Link
              key={type.slug}
              href={`/cazari/${type.slug}`}
              className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <h2 className="text-lg font-semibold text-emerald-900">{type.label}</h2>
              <p className="mt-1 text-sm text-emerald-800/80">
                Vezi toate proprietatile din categoria {type.singular.toLowerCase()}.
              </p>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}
