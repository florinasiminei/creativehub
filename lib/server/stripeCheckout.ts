import crypto from "crypto";

const STRIPE_API_URL = "https://api.stripe.com/v1";
const STRIPE_API_VERSION = "2026-02-25.clover";
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

type CheckoutSessionInput = {
  paymentId: string;
  listingId: string;
  userId: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
  successUrl: string;
  cancelUrl: string;
};

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  expires_at: number | null;
};

export type StripeCheckoutEvent = {
  id: string;
  type: string;
  data?: {
    object?: {
      id?: string;
      payment_status?: string;
      payment_intent?: string | null;
      amount_total?: number | null;
      currency?: string | null;
      metadata?: Record<string, string | undefined> | null;
    };
  };
};

function requireStripeEnv(name: "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Platile online nu sunt configurate: lipseste ${name}.`);
  }
  return value;
}

export function assertStripePaymentsConfigured() {
  const secretKey = requireStripeEnv("STRIPE_SECRET_KEY");
  requireStripeEnv("STRIPE_WEBHOOK_SECRET");
  return { secretKey };
}

export async function createStripeCheckoutSession(
  input: CheckoutSessionInput
): Promise<StripeCheckoutSession> {
  const { secretKey } = assertStripePaymentsConfigured();
  const params = new URLSearchParams();

  params.set("mode", "payment");
  params.set("locale", "ro");
  params.set("submit_type", "pay");
  params.set("payment_method_types[0]", "card");
  params.set("client_reference_id", input.paymentId);
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  params.set("line_items[0][quantity]", "1");
  params.set(
    "line_items[0][price_data][currency]",
    input.currency.trim().toLowerCase()
  );
  params.set(
    "line_items[0][price_data][unit_amount]",
    String(input.amountMinor)
  );
  params.set(
    "line_items[0][price_data][product_data][name]",
    "Publicare CABN pentru 12 luni"
  );
  params.set(
    "line_items[0][price_data][product_data][description]",
    "Prelungirea publicarii proprietatii pe cabn.ro pentru inca 12 luni."
  );
  params.set("metadata[payment_id]", input.paymentId);
  params.set("metadata[listing_id]", input.listingId);
  params.set("metadata[user_id]", input.userId);
  params.set("metadata[cabn_flow]", "annual_renewal");
  params.set(
    "payment_intent_data[metadata][payment_id]",
    input.paymentId
  );
  params.set(
    "payment_intent_data[metadata][listing_id]",
    input.listingId
  );
  params.set(
    "payment_intent_data[metadata][cabn_flow]",
    "annual_renewal"
  );

  const response = await fetch(`${STRIPE_API_URL}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": input.idempotencyKey,
      "Stripe-Version": STRIPE_API_VERSION,
    },
    body: params.toString(),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | {
        id?: string;
        url?: string | null;
        expires_at?: number | null;
        error?: { message?: string };
      }
    | null;

  if (!response.ok || !body?.id || !body.url) {
    throw new Error(
      body?.error?.message ||
        "Stripe nu a putut crea sesiunea de plata."
    );
  }

  return {
    id: body.id,
    url: body.url,
    expires_at:
      typeof body.expires_at === "number" ? body.expires_at : null,
  };
}

export function parseAndVerifyStripeWebhook(
  rawBody: string,
  signatureHeader: string | null
): StripeCheckoutEvent {
  const webhookSecret = requireStripeEnv("STRIPE_WEBHOOK_SECRET");
  if (!signatureHeader) {
    throw new Error("Lipseste semnatura Stripe.");
  }

  const signatureParts = signatureHeader
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const timestampPart = signatureParts.find((part) => part.startsWith("t="));
  const signatures = signatureParts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));
  const timestamp = Number(timestampPart?.slice(2));

  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    throw new Error("Semnatura Stripe este invalida.");
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (ageSeconds > WEBHOOK_TOLERANCE_SECONDS) {
    throw new Error("Evenimentul Stripe este prea vechi.");
  }

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest();

  const signatureValid = signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const received = Buffer.from(signature, "hex");
    return (
      received.length === expected.length &&
      crypto.timingSafeEqual(received, expected)
    );
  });

  if (!signatureValid) {
    throw new Error("Semnatura Stripe nu a putut fi verificata.");
  }

  const event = JSON.parse(rawBody) as StripeCheckoutEvent;
  if (!event?.id || !event?.type) {
    throw new Error("Eveniment Stripe invalid.");
  }
  return event;
}
