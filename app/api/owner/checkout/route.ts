export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { getVerifiedOwner, OwnerAuthUnavailableError } from "@/lib/server/ownerAuth";
import { createStripeCheckoutSession } from "@/lib/server/stripeCheckout";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimit } from "@/lib/rateLimit";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";

type RenewalPreparation = {
  payment_id: string;
  period_id: string;
  listing_title: string;
  amount_minor: number;
  currency: string;
  checkout_id?: string | null;
  checkout_url?: string | null;
  checkout_expires_at?: string | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getRpcRow(data: unknown): RenewalPreparation | null {
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<RenewalPreparation>;
  if (!row.payment_id || !row.period_id || !row.listing_title) return null;
  return row as RenewalPreparation;
}

export async function POST(request: Request) {
  let pendingPaymentId: string | null = null;

  try {
    const limit = rateLimit(request, {
      windowMs: 60 * 60_000,
      max: 8,
      keyPrefix: "owner-renewal-checkout",
    });
    if (!limit.ok) {
      return NextResponse.json(
        {
          error:
            "Ai initiat prea multe plati. Incearca din nou mai tarziu.",
        },
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

    const body = await request.json().catch(() => null);
    const listingId =
      body && typeof body === "object" && !Array.isArray(body)
        ? String(body.listingId || "").trim()
        : "";
    if (!isUuid(listingId)) {
      return NextResponse.json(
        { error: "Proprietatea selectata este invalida." },
        { status: 400 }
      );
    }

    const idempotencyKey = crypto.randomUUID();
    const { data, error } = await supabase.rpc(
      "prepare_listing_renewal_checkout",
      {
        p_listing_id: listingId,
        p_user_id: user.id,
        p_idempotency_key: idempotencyKey,
      }
    );
    if (error) {
      const message = String(error.message || "");
      const clientError =
        /nu poate fi reinnoita|nu este eligibila|prea devreme|fereastra de reinnoire|perioada de gratie|statusul listarii|proprietar|owner/i.test(
          message
        );
      return NextResponse.json(
        {
          error: clientError
            ? message
            : "Nu am putut pregati reinnoirea.",
        },
        { status: clientError ? 409 : 500 }
      );
    }

    const preparation = getRpcRow(data);
    if (!preparation) {
      throw new Error("Baza de date nu a returnat plata pregatita.");
    }

    pendingPaymentId = String(preparation.payment_id);

    const existingCheckoutExpiresAt = preparation.checkout_expires_at
      ? new Date(preparation.checkout_expires_at).getTime()
      : NaN;
    if (
      preparation.checkout_url &&
      Number.isFinite(existingCheckoutExpiresAt) &&
      existingCheckoutExpiresAt > Date.now()
    ) {
      return NextResponse.json({
        ok: true,
        url: preparation.checkout_url,
        reused: true,
      });
    }

    const amountMinor = Number(preparation.amount_minor);
    const currency = String(preparation.currency || "")
      .trim()
      .toUpperCase();
    if (!Number.isInteger(amountMinor) || amountMinor <= 0 || !currency) {
      throw new Error("Planul anual nu are un pret valid.");
    }

    const requestOrigin = new URL(request.url).origin;
    const siteOrigin =
      process.env.NODE_ENV === "production"
        ? getCanonicalSiteUrl()
        : requestOrigin;
    const checkout = await createStripeCheckoutSession({
      paymentId: pendingPaymentId,
      listingId,
      userId: user.id,
      amountMinor,
      currency,
      idempotencyKey: `cabn-renewal-${pendingPaymentId}`,
      successUrl: `${siteOrigin}/proprietari?plata=succes&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteOrigin}/proprietari?plata=anulata`,
    });

    const checkoutExpiresAt = checkout.expires_at
      ? new Date(checkout.expires_at * 1000).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error: updateError } = await supabase
      .from("listing_publication_payments")
      .update({
        provider_checkout_id: checkout.id,
        checkout_url: checkout.url,
        checkout_expires_at: checkoutExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pendingPaymentId)
      .eq("status", "pending")
      .select("id")
      .single();
    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, url: checkout.url });
  } catch (error) {
    if (error instanceof OwnerAuthUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error
        ? error.message
        : "Nu am putut deschide plata.";
    console.error("[owner-checkout]", {
      paymentId: pendingPaymentId,
      message,
    });

    const missingConfiguration = /STRIPE_(SECRET_KEY|WEBHOOK_SECRET)/.test(
      message
    );
    return NextResponse.json(
      {
        error: missingConfiguration
          ? "Platile online nu sunt inca activate."
          : "Nu am putut deschide plata. Incearca din nou.",
      },
      { status: missingConfiguration ? 503 : 500 }
    );
  }
}
