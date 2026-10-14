import HomeClient from "./home-client";
import { getImageProps } from "next/image";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import { sortFacilitiesByPriority } from "@/lib/facilitiesCatalog";
import { getCanonicalSiteUrl, toCanonicalUrl } from "@/lib/siteUrl";
import { buildCollectionPageJsonLd, serializeJsonLd } from "@/lib/jsonLd";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { getCounties } from "@/lib/counties";
import { normalizeRegionText } from "@/lib/regions";
import { hasMinimumPublishedListings } from "@/lib/seoIndexing";
import {
  SEO_COLLECTION_DESCRIPTION,
  SEO_COLLECTION_HEADLINE,
  SEO_COLLECTION_META_TITLE,
} from "@/lib/seoCopy";
import type { FacilityOption, ListingRaw } from "@/lib/types";
import AccommodationCategories from "@/components/explore/AccommodationCategories";
import SubmissionNotice from "@/components/SubmissionNotice";
import { CARD_IMAGE_QUALITY, HOME_LISTING_IMAGE_SIZES } from "@/lib/imageConfig";

export const revalidate = 300;
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
  let destinationLinks: Array<{ name: string; slug: string; count: number }> = [];

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const [withOrder, { data: facilitiesData, error: facilitiesError }] = await Promise.all([
      supabaseAdmin
        .from("listings")
        .select(baseSelect)
        .eq("is_published", true)
    .in("publication_status", ["active", "expiring"])
    .or(`publication_expires_at.is.null,publication_expires_at.gt.${new Date().toISOString()}`)
        .order("display_order", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .order("display_order", { foreignTable: "listing_images", ascending: true })
        .limit(1, { foreignTable: "listing_images" }),
      supabaseAdmin.from("facilities").select("id, name"),
    ]);

    let data = withOrder.data;
    let error = withOrder.error;

    if (error && String(error.message || "").includes("display_order")) {
      const fallback = await supabaseAdmin
        .from("listings")
        .select(baseSelect)
        .eq("is_published", true)
    .in("publication_status", ["active", "expiring"])
    .or(`publication_expires_at.is.null,publication_expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .order("display_order", { foreignTable: "listing_images", ascending: true })
        .limit(1, { foreignTable: "listing_images" });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw error;
    } else {
      const rows = (data as unknown as ListingRaw[]) || [];
      mapped = rows.map((row) => mapListingSummary(row));

      const countyCounts = new Map<string, number>();
      const countyByName = new Map(
        getCounties().map((county) => [normalizeRegionText(county.name), county] as const)
      );
      rows.forEach((row) => {
        const county = countyByName.get(normalizeRegionText(String(row.judet || "")));
        if (!county) return;
        countyCounts.set(county.slug, (countyCounts.get(county.slug) || 0) + 1);
      });
      destinationLinks = getCounties()
        .map((county) => ({
          name: county.name,
          slug: county.slug,
          count: countyCounts.get(county.slug) || 0,
        }))
        .filter((county) => hasMinimumPublishedListings(county.count))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ro"))
        .slice(0, 8);
    }

    if (facilitiesError) {
      throw facilitiesError;
    } else {
      facilities = (facilitiesData || []) as FacilityOption[];
    }
  } catch (error) {
    console.error("Home data fetch failed:", error);
    // Failed ISR refreshes must keep the last successful page, not cache an empty catalog.
    throw error;
  }

  return {
    listings: mapped,
    facilities: sortFacilitiesByPriority(facilities),
    destinationLinks,
  };
}

export default async function HomePage() {
  const { listings, facilities, destinationLinks } = await getHomeData();
  return (
    <>
      {listings.slice(1, 6).map((listing, index) => {
        const { props } = getImageProps({
          src: listing.image || "/fallback.svg",
          alt: "",
          fill: true,
          sizes: HOME_LISTING_IMAGE_SIZES,
          quality: CARD_IMAGE_QUALITY,
        });
        if (!props.srcSet) return null;
        return (
          <link
            key={listing.id}
            rel="preload"
            as="image"
            imageSrcSet={props.srcSet}
            imageSizes={props.sizes}
            media={`(min-width: ${index === 0 ? 640 : index === 1 ? 768 : 1024}px)`}
            fetchPriority="high"
          />
        );
      })}
      <script
        id="schema-org-home-collection-page"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeCollectionJsonLd) }}
      />
      <section className="sr-only">
        <h1>{homeHeadline}</h1>
        <p>
          Descopera cazari selectate din Romania si filtreaza rapid dupa locatie, tip, pret si
          facilitati.
        </p>
      </section>
      <HomeClient
        initialCazari={listings}
        initialFacilities={facilities}
      />
      <Suspense fallback={null}>
        <SubmissionNotice />
      </Suspense>
      <section
        aria-labelledby="exploreaza-tipuri-cazare"
        className="mt-12 border-t border-zinc-200 dark:border-white/10"
      >
        <div className="py-10 sm:py-14">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            Descoperă România
          </p>
          <AccommodationCategories listings={listings} destinations={destinationLinks} showAllCategoriesLink />
        </div>
      </section>
    </>
  );
}
