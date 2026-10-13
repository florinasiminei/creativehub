import { NextResponse } from "next/server";
import { getVerifiedOwner, OwnerAuthUnavailableError } from "@/lib/server/ownerAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

type PendingPeriodRow = {
  id: string;
  listing_id: string;
  status: string;
  listing_publication_payments?: Array<{
    status?: string | null;
    checkout_url?: string | null;
    checkout_expires_at?: string | null;
  }> | null;
};

function getFirstImage(row: any) {
  const images = Array.isArray(row?.listing_images)
    ? row.listing_images
    : [];
  const image = images.find((item: any) =>
    String(item?.image_url || "").trim()
  );
  return image?.image_url ? String(image.image_url) : null;
}

export async function GET(request: Request) {
  try {
    const limit = rateLimit(request, {
      windowMs: 60_000,
      max: 120,
      keyPrefix: "owner-dashboard",
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Prea multe cereri. Incearca din nou in cateva momente." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfter) },
        }
      );
    }

    const supabase = getSupabaseAdmin();
    const user = await getVerifiedOwner(request, supabase);
    if (!user?.id || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      { data: listings, error: listingsError },
      { data: claims, error: claimsError },
      { data: plan, error: planError },
    ] = await Promise.all([
      supabase
        .from("listings")
        .select(
          "id, title, slug, is_published, created_at, published_at, publication_expires_at, renewal_due_at, publication_status, listing_images(image_url, display_order)"
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .order("display_order", {
          foreignTable: "listing_images",
          ascending: true,
        })
        .limit(1, { foreignTable: "listing_images" }),
      supabase
        .from("listing_owner_claims")
        .select(
          "id, status, created_at, reviewed_at, listings(title, slug)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("publication_plans")
        .select(
          "code, name, amount_minor, currency, duration_months, renewal_window_days, grace_days"
        )
        .eq("code", "annual_standard")
        .eq("active", true)
        .maybeSingle(),
    ]);

    if (listingsError) throw listingsError;
    if (claimsError) throw claimsError;
    if (planError) throw planError;

    const listingRows = listings || [];
    const listingIds = listingRows.map((listing: any) =>
      String(listing.id)
    );
    let pendingPeriods: PendingPeriodRow[] = [];

    if (listingIds.length > 0) {
      const { data, error } = await supabase
        .from("listing_publication_periods")
        .select(
          "id, listing_id, status, listing_publication_payments(status, checkout_url, checkout_expires_at)"
        )
        .in("listing_id", listingIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      pendingPeriods = (data || []) as PendingPeriodRow[];
    }

    const pendingByListingId = new Map<string, PendingPeriodRow>();
    pendingPeriods.forEach((period) => {
      if (!pendingByListingId.has(String(period.listing_id))) {
        pendingByListingId.set(String(period.listing_id), period);
      }
    });

    const now = Date.now();
    const renewalWindowDays = Math.max(
      1,
      Number((plan as any)?.renewal_window_days || 60)
    );
    const graceDays = Math.max(
      0,
      Number((plan as any)?.grace_days || 0)
    );
    const mappedListings = listingRows.map((listing: any) => {
      const expiresAt = listing.publication_expires_at
        ? String(listing.publication_expires_at)
        : null;
      const expiryMs = expiresAt ? new Date(expiresAt).getTime() : NaN;
      const publicationStatus = String(
        listing.publication_status || "draft"
      );
      const canRenew =
        Boolean(plan) &&
        Number.isFinite(expiryMs) &&
        expiryMs <= now + renewalWindowDays * DAY_MS &&
        expiryMs >= now - graceDays * DAY_MS &&
        ["active", "expiring", "expired"].includes(publicationStatus);
      const pendingPeriod = pendingByListingId.get(String(listing.id));
      const pendingPayment = pendingPeriod?.listing_publication_payments?.[0];
      const checkoutExpiresAt = pendingPayment?.checkout_expires_at
        ? String(pendingPayment.checkout_expires_at)
        : null;
      const hasUsableCheckout =
        pendingPayment?.status === "pending" &&
        Boolean(pendingPayment.checkout_url) &&
        Boolean(
          checkoutExpiresAt &&
            new Date(checkoutExpiresAt).getTime() > now
        );

      return {
        id: String(listing.id),
        title: String(listing.title || ""),
        slug: listing.slug ? String(listing.slug) : null,
        status: publicationStatus,
        isPublished: Boolean(listing.is_published),
        createdAt: listing.created_at
          ? String(listing.created_at)
          : null,
        publishedAt: listing.published_at
          ? String(listing.published_at)
          : null,
        expiresAt,
        renewalDueAt: listing.renewal_due_at
          ? String(listing.renewal_due_at)
          : null,
        daysUntilExpiry: Number.isFinite(expiryMs)
          ? Math.ceil((expiryMs - now) / DAY_MS)
          : null,
        canRenew,
        image: getFirstImage(listing),
        pendingPayment: pendingPayment
          ? {
              status: String(pendingPayment.status || "pending"),
              checkoutUrl: hasUsableCheckout
                ? String(pendingPayment.checkout_url)
                : null,
            }
          : null,
      };
    });

    const mappedClaims = (claims || []).map((claim: any) => {
      const relatedListing = Array.isArray(claim.listings)
        ? claim.listings[0]
        : claim.listings;
      return {
        id: String(claim.id),
        listingTitle: String(
          relatedListing?.title || "Proprietate CABN"
        ),
        listingSlug: relatedListing?.slug
          ? String(relatedListing.slug)
          : null,
        status: String(claim.status || "pending"),
        createdAt: claim.created_at ? String(claim.created_at) : null,
        reviewedAt: claim.reviewed_at
          ? String(claim.reviewed_at)
          : null,
      };
    });

    const response = NextResponse.json({
      user: { email: user.email },
      listings: mappedListings,
      claims: mappedClaims,
      plan: plan
        ? {
            name: String((plan as any).name || "Publicare anuala"),
            amount: Number((plan as any).amount_minor || 0) / 100,
            currency: String((plan as any).currency || "RON"),
            durationMonths: Number(
              (plan as any).duration_months || 12
            ),
          }
        : null,
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    if (error instanceof OwnerAuthUnavailableError) {
      return NextResponse.json(
        { error: error.message },
        { status: 503, headers: { "Cache-Control": "private, no-store" } }
      );
    }
    const databaseCode =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (["42703", "42P01", "PGRST200", "PGRST202", "PGRST204", "PGRST205"].includes(databaseCode)) {
      console.warn("[owner-dashboard] Schema portalului proprietarilor este incompletă.", {
        code: databaseCode,
        migration: "db/2026-07-27_owner_portal_annual_renewals.sql",
      });
      return NextResponse.json(
        {
          code: "OWNER_PORTAL_SCHEMA_UNAVAILABLE",
          error: "Contul este conectat, dar administrarea proprietăților este temporar indisponibilă. Încearcă din nou mai târziu sau contactează echipa CABN.",
        },
        { status: 503, headers: { "Cache-Control": "private, no-store" } }
      );
    }
    console.error("[owner-dashboard]", error);
    return NextResponse.json(
      { error: "Nu am putut incarca spatiul proprietarului." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
