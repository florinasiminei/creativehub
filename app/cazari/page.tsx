import type { Metadata } from "next";
import Link from "next/link";
import { LISTING_TYPES } from "@/lib/listingTypes";
import { getCanonicalSiteUrl, toCanonicalUrl } from "@/lib/siteUrl";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveListingsRouteIndexability } from "@/lib/seoRouteIndexing";
import { countPublishedListings } from "@/lib/seoListingsCounts";

export const revalidate = 60 * 60 * 6;

const siteUrl = getCanonicalSiteUrl();

export async function generateMetadata(): Promise<Metadata> {
  const supabaseAdmin = getSupabaseAdmin();
  const publishedListingsCount = await countPublishedListings(supabaseAdmin);

  const shouldIndex = await resolveListingsRouteIndexability("/cazari", publishedListingsCount);

  return {
    title: "Cazari verificate pe tipuri",
    description:
      "Alege tipul de cazare potrivit pentru planul tau si intra direct in liste curate, cu detalii utile si contact la gazda.",
    alternates: {
      canonical: toCanonicalUrl("/cazari"),
    },
    openGraph: {
      title: "Cazari verificate pe tipuri",
      description:
        "Selecteaza rapid categoria dorita si compara proprietati reale, publicate cu informatii clare.",
      url: `${siteUrl}/cazari`,
    },
    robots: shouldIndex ? undefined : { index: false, follow: true },
  };
}

export default function CazariIndexPage() {
  return (
    <main className="min-h-screen px-4 py-10 lg:px-6">
      <header className="mx-auto max-w-4xl text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">cabn.ro</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Categorii de cazari</h1>
        <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
          Alege tipul de proprietate care te intereseaza si vezi listari verificate, cu contact
          direct la gazda.
        </p>
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
  );
}
