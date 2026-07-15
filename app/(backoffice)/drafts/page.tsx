export const revalidate = 0;

import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getRoleFromEncodedAuth } from "@/lib/draftsAuth";
import { mapListingSummary } from "@/lib/transformers";
import { ensureListingToken } from "@/lib/listingTokens";
import type { ListingRaw } from "@/lib/types";
import DraftsClient from "./drafts-client";
import { markExpiringListings, type LeadItem, type LeadStatus, type PublicationPeriodItem } from "@/lib/admin/draftsDashboard";

export default async function DraftsPage() {
  const supabaseAdmin = getSupabaseAdmin();
  const authCookie = cookies().get("drafts_auth")?.value || null;
  const role = getRoleFromEncodedAuth(authCookie) || "admin";
  const inviteToken = process.env.INVITE_TOKEN || null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || null;

  const baseSelect =
    "id, title, slug, type, judet, city, sat, capacity, price, phone, is_published, terms_accepted, display_order, edit_token, listing_images(image_url, display_order)";
  const extendedSelect =
    "id, title, slug, type, judet, city, sat, capacity, price, phone, is_published, terms_accepted, display_order, edit_token, published_at, publication_expires_at, renewal_due_at, publication_status, listing_images(image_url, display_order)";

  let { data, error }: { data: any[] | null; error: any } = await supabaseAdmin
    .from("listings")
    .select(extendedSelect)
    .order("display_order", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("display_order", { foreignTable: "listing_images", ascending: true })
    .limit(1, { foreignTable: "listing_images" });

  if (error && /published_at|publication_expires_at|renewal_due_at|publication_status/i.test(error.message || "")) {
    const fallback = await supabaseAdmin
      .from("listings")
      .select(baseSelect)
      .order("display_order", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("display_order", { foreignTable: "listing_images", ascending: true })
      .limit(1, { foreignTable: "listing_images" });
    data = fallback.data;
    error = fallback.error;
  }

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

  const { data: leadsData, error: leadsError } = await supabaseAdmin
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (leadsError && !/schema cache|relation .*leads/i.test(leadsError.message || "")) console.error(leadsError);

  const { data: publicationPeriodsData, error: publicationPeriodsError } = await supabaseAdmin
    .from("listing_publication_periods")
    .select("*")
    .order("created_at", { ascending: false });
  if (
    publicationPeriodsError &&
    !/schema cache|relation .*listing_publication_periods/i.test(publicationPeriodsError.message || "")
  ) {
    console.error(publicationPeriodsError);
  }

  const listings = (data || []) as ListingRaw[];
  const leads = mapLeads(leadsData || []);
  const firstLeadByListingId = new Map<string, LeadItem>();
  leads.forEach((lead) => {
    if (lead.listingId && !firstLeadByListingId.has(lead.listingId)) {
      firstLeadByListingId.set(lead.listingId, lead);
    }
  });
  const rawMapped = await Promise.all(
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
      const normalizedTitle = String((row as any).title || "").trim().toLowerCase();
      const hasUploadedImage = Array.isArray((row as any).listing_images)
        ? (row as any).listing_images.some((image: any) => String(image?.image_url || "").trim())
        : false;
      const isDraftSeed =
        !isPublished && (row as any).display_order == null && normalizedTitle === "draft proprietate";
      const isEmptyDraftSeed = isDraftSeed && !hasUploadedImage;
      const linkedLead = firstLeadByListingId.get(summary.id) || null;

      return {
        ...summary,
        status,
        isPublished,
        termsAccepted,
        editToken,
        isDraftSeed,
        isEmptyDraftSeed,
        publishedAt: (row as any).published_at || null,
        publicationExpiresAt: (row as any).publication_expires_at || null,
        renewalDueAt: (row as any).renewal_due_at || null,
        publicationStatus: (row as any).publication_status || null,
        leadId: linkedLead?.id || null,
        leadStatus: linkedLead?.status || null,
      };
    })
  );
  const mapped = markExpiringListings(rawMapped);

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
      leads={leads}
      publicationPeriods={mapPublicationPeriods(publicationPeriodsData || [])}
      role={role}
      inviteToken={inviteToken}
      siteUrl={siteUrl}
    />
  );
}

function mapLeads(rows: any[]): LeadItem[] {
  return rows.map((row) => ({
    id: String(row.id),
    listingId: row.listing_id ? String(row.listing_id) : null,
    propertyName: String(row.property_name || ""),
    contactName: row.contact_name ? String(row.contact_name) : null,
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    judet: row.judet ? String(row.judet) : null,
    city: row.city ? String(row.city) : null,
    sat: row.sat ? String(row.sat) : null,
    source: row.source ? String(row.source) : null,
    status: (row.status || "nou") as LeadStatus,
    followUpAt: row.follow_up_at ? String(row.follow_up_at) : null,
    notes: row.notes ? String(row.notes) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  }));
}

function mapPublicationPeriods(rows: any[]): PublicationPeriodItem[] {
  return rows.map((row) => ({
    id: String(row.id),
    listingId: String(row.listing_id),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
    currency: row.currency ? String(row.currency) : null,
    status: row.status || "active",
    notes: row.notes ? String(row.notes) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
  }));
}
