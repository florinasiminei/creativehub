import HomeClient from "./home-client";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import { sortFacilitiesByPriority } from "@/lib/facilitiesCatalog";
import { getCanonicalSiteUrl, toCanonicalUrl } from "@/lib/siteUrl";
import type { FacilityOption, ListingRaw } from "@/lib/types";

export const revalidate = 60 * 60 * 12;
const siteUrl = getCanonicalSiteUrl();

export const metadata: Metadata = {
  title: "Cazari in natura, direct la gazda",
  description:
    "Gasesti rapid cabane, A-Frame-uri si pensiuni verificate in Romania, cu filtre clare si contact direct cu proprietarul.",
  alternates: {
    canonical: toCanonicalUrl("/"),
  },
  openGraph: {
    title: "Cazari in natura, direct la gazda",
    description:
      "Gasesti rapid cabane, A-Frame-uri si pensiuni verificate in Romania, cu filtre clare si contact direct cu proprietarul.",
    url: siteUrl,
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
      <section className="sr-only">
        <h1>Cabane si cazari in natura, direct de la proprietari</h1>
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
