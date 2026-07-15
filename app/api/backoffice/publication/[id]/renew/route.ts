import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getDraftRoleFromRequest } from "@/lib/draftsAuth";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const role = getDraftRoleFromRequest(req);
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const amount = toNullablePositiveNumber(body?.amount);
    const currency = String(body?.currency || "RON").trim() || "RON";
    const notes = String(body?.notes || "").trim() || null;
    const paidAt = body?.paid_at || new Date().toISOString();

    const startsAt = body?.starts_at ? new Date(body.starts_at) : new Date();
    if (Number.isNaN(startsAt.getTime())) {
      return NextResponse.json({ error: "Data de start este invalida." }, { status: 400 });
    }

    const endsAt = body?.ends_at ? new Date(body.ends_at) : new Date(startsAt);
    if (!body?.ends_at) endsAt.setFullYear(endsAt.getFullYear() + 1);
    if (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      return NextResponse.json({ error: "Data de expirare este invalida." }, { status: 400 });
    }

    const renewalDueAt = new Date(endsAt);
    renewalDueAt.setDate(renewalDueAt.getDate() - 30);

    const supabase = getSupabaseAdmin();
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id")
      .eq("id", params.id)
      .maybeSingle();

    if (listingError) throw listingError;
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const { data: period, error: periodError } = await supabase
      .from("listing_publication_periods")
      .insert({
        listing_id: params.id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        amount,
        currency,
        status: "active",
        notes,
        created_by: role,
      })
      .select()
      .single();

    if (periodError) throw periodError;

    if (amount !== null && amount > 0) {
      await supabase.from("listing_publication_payments").insert({
        period_id: period.id,
        amount,
        currency,
        method: String(body?.method || "").trim() || null,
        paid_at: paidAt,
        reference: String(body?.reference || "").trim() || null,
        notes,
      });
    }

    const { error: updateError } = await supabase
      .from("listings")
      .update({
        is_published: true,
        published_at: startsAt.toISOString(),
        publication_expires_at: endsAt.toISOString(),
        renewal_due_at: renewalDueAt.toISOString(),
        publication_status: "active",
      })
      .eq("id", params.id);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, period });
  } catch (err: any) {
    console.error("POST /api/backoffice/publication/[id]/renew:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

function toNullablePositiveNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}
