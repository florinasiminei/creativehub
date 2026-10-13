import HomeClient from "./home-client";
import Link from "next/link";
import { getImageProps } from "next/image";
import { Suspense, type CSSProperties } from "react";
import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import { sortFacilitiesByPriority } from "@/lib/facilitiesCatalog";
import { getCanonicalSiteUrl, toCanonicalUrl } from "@/lib/siteUrl";
import { buildCollectionPageJsonLd, serializeJsonLd } from "@/lib/jsonLd";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { LISTING_TYPES } from "@/lib/listingTypes";
import { getCounties } from "@/lib/counties";
import { normalizeRegionText } from "@/lib/regions";
import { hasMinimumPublishedListings } from "@/lib/seoIndexing";
import {
  SEO_COLLECTION_DESCRIPTION,
  SEO_COLLECTION_HEADLINE,
  SEO_COLLECTION_META_TITLE,
} from "@/lib/seoCopy";
import type { FacilityOption, ListingRaw } from "@/lib/types";
import ExploreCard from "@/components/explore/ExploreCard";
import { getCategoryPhoto, getDestinationPhoto } from "@/lib/exploreCards";
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
  const activeTypes = LISTING_TYPES.filter((type) => listings.some((listing) => listing.tip === type.value));
  const exploreGridClassName = "mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(var(--explore-columns),minmax(0,1fr))]";
  const exploreColumns = Math.max(1, activeTypes.length);
  const exploreGaps = 20 * (exploreColumns - 1);
  const exploreImageSizes = `(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(50vw - 34px), (max-width: 1279px) calc(33.333vw - 34.667px), (max-width: 1471px) calc((100vw - ${64 + exploreGaps}px) / ${exploreColumns}), ${(1472 - 64 - exploreGaps) / exploreColumns}px`;
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
        // React 18 requires the lowercase DOM attribute on a native link element.
        return (
          <link
            key={listing.id}
            rel="preload"
            as="image"
            imageSrcSet={props.srcSet}
            imageSizes={props.sizes}
            media={`(min-width: ${index === 0 ? 640 : index === 1 ? 768 : 1024}px)`}
            {...{ fetchpriority: "high" }}
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
      <Suspense
        fallback={<div className="flex min-h-[60vh] items-center justify-center">Se incarca...</div>}
      >
        <HomeClient
          initialCazari={listings}
          initialFacilities={facilities}
        />
      </Suspense>
      <Suspense fallback={null}>
        <SubmissionNotice />
      </Suspense>
      <section
        aria-labelledby="exploreaza-tipuri-cazare"
        className="mt-12 border-t border-zinc-200 dark:border-white/10"
        style={{ "--explore-columns": exploreColumns } as CSSProperties}
      >
        <div className="py-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            Descoperă România
          </p>
          <h2 id="exploreaza-tipuri-cazare" className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Explorează cazările după tip
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Compară cabane, A-Frame-uri, tiny houses, pensiuni și case de vacanță selectate,
            cu informații clare și contact direct la proprietar.
          </p>
          <div className={exploreGridClassName}>
            {activeTypes.map((type) => (
              <ExploreCard
                key={type.slug}
                href={`/cazari/${type.slug}`}
                title={type.label}
                imageSizes={exploreImageSizes}
                {...getCategoryPhoto(type.slug)}
                count={listings.filter((listing) => listing.tip === type.value).length}
              />
            ))}
          </div>
          <Link
            href="/cazari"
            className="mt-6 inline-flex text-sm font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
          >
            Explorează toate categoriile
          </Link>
          {destinationLinks.length > 0 && (
            <div className="mt-14">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Unde vrei să mergi?</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Descoperă cazările din destinațiile preferate.</p>
              <div className={exploreGridClassName}>
                {destinationLinks.map((county) => (
                  <ExploreCard
                    key={county.slug}
                    href={`/judet/${county.slug}`}
                    title={county.name}
                    imageSizes={exploreImageSizes}
                    count={county.count}
                    {...getDestinationPhoto(county.slug)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
