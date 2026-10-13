export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  parseAndVerifyStripeWebhook,
  type StripeCheckoutEvent,
} from "@/lib/server/stripeCheckout";

const SUCCESS_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

const FAILURE_EVENTS = new Set([
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function markEventProcessed(eventId: string, error: string | null = null) {
  const supabase = getSupabaseAdmin();
  const { error: updateError } = await supabase
    .from("publication_payment_webhook_events")
    .update({
      processed_at: error ? null : new Date().toISOString(),
      processing_error: error,
    })
    .eq("provider", "stripe")
    .eq("event_id", eventId);
  if (updateError) throw updateError;
}

async function recordEvent(event: StripeCheckoutEvent, paymentId: string | null) {
  const supabase = getSupabaseAdmin();
  const object = event.data?.object;
  const providerPaymentId =
    typeof object?.payment_intent === "string" && object.payment_intent
      ? object.payment_intent
      : null;
  const { error } = await supabase
    .from("publication_payment_webhook_events")
    .insert({
      provider: "stripe",
      event_id: event.id,
      event_type: event.type,
      payment_id: paymentId,
      provider_payment_id: providerPaymentId,
      payload: {
        object_id: object?.id || null,
        payment_id: paymentId,
        payment_status: object?.payment_status || null,
      },
    });

  if (!error) return { alreadyProcessed: false };
  if (error.code !== "23505") throw error;

  const { data: existing, error: existingError } = await supabase
    .from("publication_payment_webhook_events")
    .select("processed_at")
    .eq("provider", "stripe")
    .eq("event_id", event.id)
    .maybeSingle();
  if (existingError) throw existingError;

  return { alreadyProcessed: Boolean(existing?.processed_at) };
}

export async function POST(request: Request) {
  let event: StripeCheckoutEvent | null = null;

  try {
    const rawBody = await request.text();
    event = parseAndVerifyStripeWebhook(
      rawBody,
      request.headers.get("stripe-signature")
    );

    if (!SUCCESS_EVENTS.has(event.type) && !FAILURE_EVENTS.has(event.type)) {
      return NextResponse.json({ received: true });
    }

    const object = event.data?.object;
    if (object?.metadata?.cabn_flow !== "annual_renewal") {
      return NextResponse.json({
        received: true,
        ignored: true,
      });
    }

    const paymentId = String(object?.metadata?.payment_id || "").trim();
    if (!isUuid(paymentId)) {
      return NextResponse.json(
        { error: "Evenimentul nu contine un payment_id valid." },
        { status: 400 }
      );
    }

    const checkoutId = String(object?.id || "").trim();
    if (!checkoutId) {
      return NextResponse.json(
        { error: "Evenimentul nu contine un checkout_id valid." },
        { status: 400 }
      );
    }

    const eventRecord = await recordEvent(event, paymentId);
    if (eventRecord.alreadyProcessed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const supabase = getSupabaseAdmin();
    const { data: paymentRecord, error: paymentRecordError } = await supabase
      .from("listing_publication_payments")
      .select("id, period_id, status, provider_checkout_id")
      .eq("id", paymentId)
      .eq("provider", "stripe")
      .maybeSingle();
    if (paymentRecordError) throw paymentRecordError;
    if (!paymentRecord) {
      throw new Error("Payment-ul Stripe nu exista.");
    }
    if (
      paymentRecord.provider_checkout_id &&
      paymentRecord.provider_checkout_id !== checkoutId
    ) {
      throw new Error("Checkout-ul Stripe nu corespunde payment-ului.");
    }

    if (FAILURE_EVENTS.has(event.type)) {
      if (paymentRecord.status !== "pending") {
        await markEventProcessed(event.id);
        return NextResponse.json({
          received: true,
          ignored: true,
        });
      }

      const paymentStatus =
        event.type === "checkout.session.expired" ? "cancelled" : "failed";
      const { data: payment, error: paymentError } = await supabase
        .from("listing_publication_payments")
        .update({
          status: paymentStatus,
          provider_checkout_id:
            paymentRecord.provider_checkout_id || checkoutId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId)
        .eq("provider", "stripe")
        .eq("status", "pending")
        .select("period_id")
        .maybeSingle();
      if (paymentError) throw paymentError;

      if (payment?.period_id) {
        const { error: periodError } = await supabase
          .from("listing_publication_periods")
          .update({ status: "cancelled" })
          .eq("id", payment.period_id)
          .eq("status", "pending");
        if (periodError) throw periodError;
      }

      await markEventProcessed(event.id);
      return NextResponse.json({ received: true });
    }

    if (object?.payment_status !== "paid") {
      await markEventProcessed(event.id);
      return NextResponse.json({
        received: true,
        paymentPending: true,
      });
    }

    const amountMinor = Number(object.amount_total);
    const currency = String(object.currency || "").trim().toUpperCase();
    if (!Number.isInteger(amountMinor) || amountMinor <= 0 || !currency) {
      throw new Error("Suma sau moneda confirmata de Stripe este invalida.");
    }

    const providerPaymentId =
      typeof object.payment_intent === "string" && object.payment_intent
        ? object.payment_intent
        : String(object.id || "");

    const { data: result, error: finalizeError } = await supabase.rpc(
      "finalize_listing_renewal_payment",
      {
        p_payment_id: paymentId,
        p_provider_checkout_id: checkoutId,
        p_provider_payment_id: providerPaymentId,
        p_amount_minor: amountMinor,
        p_currency: currency,
      }
    );
    if (finalizeError) throw finalizeError;

    await markEventProcessed(event.id);

    try {
      revalidatePath("/");
      revalidatePath("/cazari");
      revalidatePath("/proprietari");
      revalidatePath("/sitemap.xml");
    } catch (revalidateError) {
      console.error("[stripe-webhook] revalidate failed", revalidateError);
    }

    return NextResponse.json({ received: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe webhook invalid.";
    if (event?.id) {
      await markEventProcessed(event.id, message).catch(() => undefined);
      console.error("[stripe-webhook] processing failed", {
        eventId: event.id,
        message,
      });
      return NextResponse.json({ error: 'Procesarea platii a esuat.' }, { status: 500 });
    }

    return NextResponse.json({ error: 'Semnatura sau evenimentul Stripe este invalid.' }, { status: 400 });
  }
}
