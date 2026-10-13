import crypto from "crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getDraftRoleFromRequest } from "@/lib/draftsAuth";

export async function POST(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const role = await getDraftRoleFromRequest(req);
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isUuid(params.id)) {
      return NextResponse.json(
        { error: "Proprietatea selectata este invalida." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const amount = toNonNegativeNumber(body?.amount);
    if (amount === null) {
      return NextResponse.json(
        { error: "Suma incasata este invalida." },
        { status: 400 }
      );
    }

    const currency = String(body?.currency || "RON").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json(
        { error: "Moneda este invalida." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const requestedIdempotencyKey = String(
      body?.idempotency_key || ""
    ).trim();
    const idempotencyKey =
      requestedIdempotencyKey &&
      requestedIdempotencyKey.length <= 200
        ? requestedIdempotencyKey
        : crypto.randomUUID();
    const { data, error } = await supabase.rpc(
      "create_manual_listing_renewal",
      {
        p_listing_id: params.id,
        p_amount: amount,
        p_currency: currency,
        p_method: cleanOptionalText(body?.method, 80),
        p_reference: cleanOptionalText(body?.reference, 200),
        p_notes: cleanOptionalText(body?.notes, 1000),
        p_created_by: role,
        p_idempotency_key: idempotencyKey,
      }
    );
    if (error) {
      const missingListing = /nu exista|not found/i.test(
        String(error.message || "")
      );
      return NextResponse.json(
        {
          error: missingListing
            ? "Proprietatea nu exista."
            : "Nu am putut salva reinnoirea.",
        },
        { status: missingListing ? 404 : 500 }
      );
    }

    const renewal = Array.isArray(data) ? data[0] : data;
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, renewal });
  } catch (err: any) {
    console.error("POST /api/backoffice/publication/[id]/renew:", err);
    return NextResponse.json({ error: "Cererea nu a putut fi procesata. Incearca din nou." }, { status: 500 });
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function toNonNegativeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(
    typeof value === "string" ? value.trim().replace(",", ".") : value
  );
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
}

function cleanOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}
