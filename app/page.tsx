import HomeClient from "./home-client";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import { sortFacilitiesByPriority } from "@/lib/facilitiesCatalog";
import { getCanonicalSiteUrl, toCanonicalUrl } from "@/lib/siteUrl";
import { buildCollectionPageJsonLd } from "@/lib/jsonLd";
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

export const metadata: Metadata = {
  title: homeMetaTitle,
  description: homeDescription,
  alternates: {
    canonical: homePageUrl,
  },
  openGraph: {
    type: "website",
    siteName: "cabn",
    locale: "ro_RO",
    title: homeHeadline,
    description: homeDescription,
    url: siteUrl,
    images: [
      {
        url: defaultSocialImage,
        width: 1200,
        height: 630,
        alt: "CABN",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: homeHeadline,
    description: homeDescription,
    images: [defaultSocialImage],
  },
};

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
      .order("display_order", { foreignTable: "listing_images", ascending: true })
      .limit(1, { foreignTable: "listing_images" });

    let data = withOrder.data;
    let error = withOrder.error;

    if (error && String(error.message || "").includes("display_order")) {
      const fallback = await supabaseAdmin
        .from("listings")
        .select(baseSelect)
        .eq("is_published", true)
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

export default async function HomePage() {
  const { listings, facilities } = await getHomeData();
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
        <HomeClient initialCazari={listings} initialFacilities={facilities} />
      </Suspense>
    </>
  );
}
