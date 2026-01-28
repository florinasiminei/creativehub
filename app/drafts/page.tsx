export const revalidate = 0;

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import type { ListingRaw } from "@/lib/types";
import DraftsClient from "./drafts-client";

export default async function DraftsPage() {
  const supabaseAdmin = getSupabaseAdmin();

  const baseSelect =
    "id, title, slug, type, location, capacity, price, phone, is_published, display_order, listing_images(image_url, display_order)";

  const { data, error } = await supabaseAdmin
    .from("listings")
    .select(baseSelect)
    .order("display_order", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (error) console.error(error);

  const listings = (data || []) as ListingRaw[];
  const mapped = listings.map((row) => {
    const summary = mapListingSummary(row);
    const statusField = (row as any).status?.toString().toLowerCase();
    const isPublished = !!(row as any).is_published;
    const status: "publicat" | "inactiv" | "draft" =
      statusField === "inactiv" || statusField === "inactive"
        ? "inactiv"
        : statusField === "publicat" || statusField === "published" || isPublished
        ? "publicat"
        : "draft";
    return { ...summary, status, isPublished };
  });

  return <DraftsClient listings={mapped} />;
}
