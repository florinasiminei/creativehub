export const revalidate = 0;

import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getRoleFromEncodedAuth } from "@/lib/draftsAuth";
import { mapListingSummary } from "@/lib/transformers";
import { ensureListingToken } from "@/lib/listingTokens";
import type { ListingRaw } from "@/lib/types";
import DraftsClient from "./drafts-client";

export default async function DraftsPage() {
  const supabaseAdmin = getSupabaseAdmin();
  const authCookie = cookies().get("drafts_auth")?.value || null;
  const role = getRoleFromEncodedAuth(authCookie) || "admin";
  const inviteToken = process.env.INVITE_TOKEN || null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || null;

  const baseSelect =
    "id, title, slug, type, judet, city, sat, capacity, price, phone, is_published, terms_accepted, display_order, edit_token, listing_images(image_url, display_order)";

  const { data, error } = await supabaseAdmin
    .from("listings")
    .select(baseSelect)
    .order("display_order", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("display_order", { foreignTable: "listing_images", ascending: true })
    .limit(1, { foreignTable: "listing_images" });

  if (error) console.error(error);

  const attractionSelect =
    "id, title, slug, location_name, price, is_published, created_at, updated_at, attraction_images(image_url, display_order)";
  const { data: attractionData, error: attractionError } = await supabaseAdmin
    .from("attractions")
    .select(attractionSelect)
    .order("created_at", { ascending: false })
    .order("display_order", { foreignTable: "attraction_images", ascending: true })
    .limit(1, { foreignTable: "attraction_images" });

  if (attractionError) console.error(attractionError);

  const listings = (data || []) as ListingRaw[];
  const mapped = await Promise.all(
    listings.map(async (row) => {
      const summary = mapListingSummary(row);
      const statusField = (row as any).status?.toString().toLowerCase();
      const isPublished = !!(row as any).is_published;
      const status: "publicat" | "inactiv" | "draft" =
        statusField === "inactiv" || statusField === "inactive"
          ? "inactiv"
          : statusField === "publicat" || statusField === "published" || isPublished
          ? "publicat"
          : "draft";
      const editToken = await ensureListingToken(summary.id, (row as any).edit_token);
      const termsAccepted = Boolean((row as any).terms_accepted);
      return { ...summary, status, isPublished, termsAccepted, editToken };
    })
  );

  const mappedAttractions = (attractionData || []).map((row: any) => {
    const image =
      Array.isArray(row?.attraction_images) && row.attraction_images.length > 0
        ? String(row.attraction_images[0]?.image_url || "").trim()
        : "";
    const status: "publicat" | "draft" = row?.is_published ? "publicat" : "draft";
    const numericPrice =
      row?.price === null || row?.price === undefined || row?.price === ""
        ? null
        : Number(row.price);
    return {
      id: String(row.id),
      title: String(row.title || ""),
      slug: row?.slug ? String(row.slug) : "",
      locationName: String(row.location_name || ""),
      price: Number.isFinite(numericPrice) ? numericPrice : null,
      image: image || "/images/logo.svg",
      isPublished: Boolean(row?.is_published),
      status,
      createdAt: row?.created_at ? String(row.created_at) : null,
      updatedAt: row?.updated_at ? String(row.updated_at) : null,
    };
  });

  return (
    <DraftsClient
      listings={mapped}
      attractions={mappedAttractions}
      role={role}
      inviteToken={inviteToken}
      siteUrl={siteUrl}
    />
  );
}
