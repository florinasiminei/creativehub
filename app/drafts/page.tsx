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
    "id, title, slug, type, judet, city, sat, capacity, price, phone, is_published, display_order, edit_token, listing_images(image_url, display_order)";

  const { data, error } = await supabaseAdmin
    .from("listings")
    .select(baseSelect)
    .order("display_order", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) console.error(error);

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
      return { ...summary, status, isPublished, editToken };
    })
  );

  return <DraftsClient listings={mapped} role={role} inviteToken={inviteToken} siteUrl={siteUrl} />;
}
