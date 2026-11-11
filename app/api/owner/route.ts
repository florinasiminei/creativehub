import { NextResponse } from "next/server";
import { getVerifiedOwner, OwnerAuthUnavailableError } from "@/lib/server/ownerAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimit } from "@/lib/rateLimit";
import { instagramPromotionEnabled } from '@/lib/server/instagramPromotionConfig';
import type { InstagramPromotionSummary } from '@/lib/social/instagram';

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const OVERVIEW_TIMEOUT_MS = 15_000;

class OwnerOverviewTimeoutError extends Error {
  constructor() {
    super("Încărcarea contului durează prea mult. Încearcă din nou.");
  }
}

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
  const controller = new AbortController();
  const startedAt = performance.now();
  const timings: string[] = [];
  const pendingReads = new Set<string>();
  const trackRead = async <T,>(name: string, query: PromiseLike<T>) => {
    const readStartedAt = performance.now();
    pendingReads.add(name);
    try { return await query; }
    finally {
      pendingReads.delete(name);
      timings.push(`${name};dur=${(performance.now() - readStartedAt).toFixed(1)}`);
    }
  };
  const withTimings = (response: Response) => {
    response.headers.set("Server-Timing", [...timings, `total;dur=${(performance.now() - startedAt).toFixed(1)}`].join(", "));
    return response;
  };
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new OwnerOverviewTimeoutError();
      controller.abort(error);
      reject(error);
    }, OVERVIEW_TIMEOUT_MS);
  });
  try {
    return withTimings(await Promise.race([loadOwnerOverview(request, controller.signal, trackRead), timeout]));
  } catch (error) {
    if (!(error instanceof OwnerOverviewTimeoutError)) throw error;
    console.warn("[owner-dashboard] Request timed out", { pendingReads: [...pendingReads], durationMs: Math.round(performance.now() - startedAt) });
    return withTimings(NextResponse.json(
      { code: "OWNER_PORTAL_TIMEOUT", error: error.message },
      { status: 504, headers: { "Cache-Control": "private, no-store" } }
    ));
  } finally {
    clearTimeout(timeoutId);
  }
}

async function loadOwnerOverview(
  request: Request,
  signal: AbortSignal,
  trackRead: <T>(name: string, query: PromiseLike<T>) => Promise<T>,
) {
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
    const user = await trackRead("auth", getVerifiedOwner(request, supabase));
    signal.throwIfAborted();
    if (!user?.id || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      { data: listings, error: listingsError },
      { data: claims, error: claimsError },
      { data: plan, error: planError },
    ] = await Promise.all([
      trackRead("listings", supabase
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
        .limit(1, { foreignTable: "listing_images" })
        .abortSignal(signal)),
      trackRead("claims", supabase
        .from("listing_owner_claims")
        .select(
          "id, status, created_at, reviewed_at, listings(title, slug)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .abortSignal(signal)),
      trackRead("plan", supabase
        .from("publication_plans")
        .select(
          "code, name, amount_minor, currency, duration_months, renewal_window_days, grace_days"
        )
        .eq("code", "annual_standard")
        .eq("active", true)
        .abortSignal(signal)
        .maybeSingle()),
    ]);

    if (listingsError) throw listingsError;
    if (claimsError) throw claimsError;
    if (planError) throw planError;
    const listingRows = listings || [];
    const listingIds = listingRows.map((listing: any) =>
      String(listing.id)
    );
    const promotionEnabled = instagramPromotionEnabled();
    const [promotionsResult, pendingPeriodsResult] = await Promise.all([
      promotionEnabled && listingIds.length > 0
        ? trackRead("promotions", supabase.from('social_promotions')
          .select('listing_reference, status, approved_at, needs_reapproval, scheduled_for, published_at, external_url, last_error')
          .eq('platform', 'instagram').eq('owner_id', user.id).in('listing_reference', listingIds).abortSignal(signal))
          .catch((error: unknown) => ({ data: null, error }))
        : { data: [], error: null },
      listingIds.length > 0
        ? trackRead("payments", supabase
          .from("listing_publication_periods")
          .select(
            "id, listing_id, status, listing_publication_payments(status, checkout_url, checkout_expires_at)"
          )
          .in("listing_id", listingIds)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .abortSignal(signal))
        : { data: [], error: null },
    ]);
    signal.throwIfAborted();
    if (pendingPeriodsResult.error) throw pendingPeriodsResult.error;

    const instagramPromotionStatusAvailable = promotionEnabled && !promotionsResult.error;
    if (promotionsResult.error) {
      const error = promotionsResult.error;
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown';
      console.warn('[owner-dashboard] Instagram promotion status is unavailable', { code });
    }
    const promotions = (promotionsResult.data || []) as Array<InstagramPromotionSummary & { listing_reference: string }>;
    const promotionsByListingId = new Map(promotions.map(({ listing_reference, ...promotion }) => [listing_reference, promotion]));
    const pendingPeriods = (pendingPeriodsResult.data || []) as PendingPeriodRow[];

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
        instagramPromotion: promotionsByListingId.get(String(listing.id)) || null,
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
      instagramPromotionEnabled: promotionEnabled,
      instagramPromotionStatusAvailable,
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
    if (signal.aborted) throw signal.reason;
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
