import HomeClient from "./home-client";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import { sortFacilitiesByPriority } from "@/lib/facilitiesCatalog";
import { getCanonicalSiteUrl, toCanonicalUrl } from "@/lib/siteUrl";
import { buildCollectionPageJsonLd } from "@/lib/jsonLd";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { LISTING_TYPES } from "@/lib/listingTypes";
import {
  SEO_COLLECTION_DESCRIPTION,
  SEO_COLLECTION_HEADLINE,
  SEO_COLLECTION_META_TITLE,
} from "@/lib/seoCopy";
import type { FacilityOption, ListingRaw } from "@/lib/types";

export const revalidate = 60 * 60 * 12;
const siteUrl = getCanonicalSiteUrl();
const defaultSocialImage = "/images/og-default.png";
const homePageUrl = toCanonicalUrl("/");
const homeHeadline = SEO_COLLECTION_HEADLINE;
const homeMetaTitle = SEO_COLLECTION_META_TITLE;
const homeDescription = SEO_COLLECTION_DESCRIPTION;
const homeCollectionJsonLd = buildCollectionPageJsonLd({
  siteUrl,
  pageUrl: homePageUrl,
  name: homeHeadline,
  description: homeDescription,
});

export const metadata: Metadata = buildPageMetadata({
  title: homeMetaTitle,
  description: homeDescription,
  pathname: "/",
  socialTitle: homeHeadline,
  imageUrl: defaultSocialImage,
  imageAlt: "CABN",
});

async function getHomeData() {
  const baseSelect = `
    id, title, slug, type, judet, city, sat, capacity, price, is_published, display_order,
    camere, paturi, bai,
    listing_images(image_url, display_order),
    listing_facilities(
      facilities(id, name)
    )
  `;

  let mapped: ReturnType<typeof mapListingSummary>[] = [];
  let facilities: FacilityOption[] = [];

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const withOrder = await supabaseAdmin
      .from("listings")
      .select(baseSelect)
      .eq("is_published", true)
      .order("display_order", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("display_order", { foreignTable: "listing_images", ascending: true })
      .limit(1, { foreignTable: "listing_images" });

    let data = withOrder.data;
    let error = withOrder.error;

    if (error && String(error.message || "").includes("display_order")) {
      const fallback = await supabaseAdmin
        .from("listings")
        .select(baseSelect)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .order("display_order", { foreignTable: "listing_images", ascending: true })
        .limit(1, { foreignTable: "listing_images" });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error("Home listings fetch failed:", error.message);
    } else {
      mapped = (data as unknown as ListingRaw[]).map((row) => mapListingSummary(row));
    }

    const { data: facilitiesData, error: facilitiesError } = await supabaseAdmin.from("facilities").select("id, name");
    if (facilitiesError) {
      console.error("Home facilities fetch failed:", facilitiesError.message);
    } else {
      facilities = (facilitiesData || []) as FacilityOption[];
    }
  } catch (error) {
    console.error("Home data fetch failed:", error);
  }

  return {
    listings: mapped,
    facilities: sortFacilitiesByPriority(facilities),
  };
}

type HomePageProps = {
  searchParams?: { submitted?: string; updated?: string };
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { listings, facilities } = await getHomeData();
  const submittedMessage =
    searchParams?.submitted === "1"
      ? "Proprietatea a fost adăugată cu succes."
      : searchParams?.updated === "1"
      ? "Proprietatea a fost modificată cu succes."
      : "";
  return (
    <>
      <script
        id="schema-org-home-collection-page"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeCollectionJsonLd) }}
      />
      <section className="sr-only">
        <h1>{homeHeadline}</h1>
        <p>
          Descopera cazari selectate din Romania si filtreaza rapid dupa locatie, tip, pret si
          facilitati.
        </p>
      </section>
      <Suspense
        fallback={<div className="flex min-h-[60vh] items-center justify-center">Se incarca...</div>}
      >
        <HomeClient
          initialCazari={listings}
          initialFacilities={facilities}
          initialSubmittedMessage={submittedMessage}
        />
      </Suspense>
      <section
        aria-labelledby="exploreaza-tipuri-cazare"
        className="border-t border-emerald-100/80 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/10"
      >
        <div className="mx-auto max-w-[var(--page-max-w)] px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            Descoperă România
          </p>
          <h2 id="exploreaza-tipuri-cazare" className="mt-2 text-2xl font-semibold sm:text-3xl">
            Explorează cazările după tip
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Compară cabane, A-Frame-uri, tiny houses, pensiuni și case de vacanță selectate,
            cu informații clare și contact direct la proprietar.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/cazari"
              className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Vezi toate categoriile
            </Link>
            {LISTING_TYPES.map((type) => (
              <Link
                key={type.slug}
                href={`/cazari/${type.slug}`}
                className="rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800/60 dark:bg-zinc-900 dark:text-emerald-100 dark:hover:bg-emerald-950/40"
              >
                {type.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
