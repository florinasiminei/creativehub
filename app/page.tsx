import HomeClient from "./home-client";
import { Suspense } from "react";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import { sortFacilitiesByPriority } from "@/lib/facilitiesCatalog";
import type { FacilityOption, ListingRaw } from "@/lib/types";

export const revalidate = 60 * 60 * 12;

async function getHomeData() {
  const supabaseAdmin = getSupabaseAdmin();
  const baseSelect = `
    id, title, slug, type, location, address, capacity, price, phone, is_published, display_order,
    camere, paturi, bai,
    listing_images(image_url, display_order),
    listing_facilities(
      facilities(id, name)
    )
  `;

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

  if (error) throw error;

  const mapped = (data as unknown as ListingRaw[]).map((row) => mapListingSummary(row));
  const { data: facilities } = await supabaseAdmin.from("facilities").select("id, name");

  return {
    listings: mapped,
    facilities: sortFacilitiesByPriority((facilities || []) as FacilityOption[]),
  };
}

export default async function HomePage() {
  const { listings, facilities } = await getHomeData();
  return (
    <Suspense
      fallback={<div className="flex min-h-[60vh] items-center justify-center">Se incarca...</div>}
    >
      <HomeClient initialCazari={listings} initialFacilities={facilities} />
    </Suspense>
  );
}
