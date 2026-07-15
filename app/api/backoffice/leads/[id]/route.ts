import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getDraftRoleFromRequest } from "@/lib/draftsAuth";
import type { LeadStatus } from "@/lib/admin/draftsDashboard";

const LEAD_STATUSES: LeadStatus[] = [
  "nou",
  "contactat",
  "interesat",
  "cerere_deplasare",
  "convertit",
  "neinteresat",
  "inactiv",
];

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const role = getDraftRoleFromRequest(req);
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const payload = sanitizeLeadUpdate(body);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("leads")
      .update(payload)
      .eq("id", params.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("PATCH /api/backoffice/leads/[id]:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

function sanitizeLeadUpdate(body: any) {
  const payload: Record<string, unknown> = {};
  if (body?.listing_id !== undefined) payload.listing_id = body.listing_id || null;
  if (body?.property_name !== undefined) payload.property_name = String(body.property_name || "").trim();
  if (body?.contact_name !== undefined) payload.contact_name = String(body.contact_name || "").trim() || null;
  if (body?.phone !== undefined) payload.phone = String(body.phone || "").trim() || null;
  if (body?.email !== undefined) payload.email = String(body.email || "").trim() || null;
  if (body?.judet !== undefined) payload.judet = String(body.judet || "").trim() || null;
  if (body?.city !== undefined) payload.city = String(body.city || "").trim() || null;
  if (body?.sat !== undefined) payload.sat = String(body.sat || "").trim() || null;
  if (body?.source !== undefined) payload.source = String(body.source || "").trim() || "cold_call";
  if (body?.status !== undefined && LEAD_STATUSES.includes(body.status)) payload.status = body.status;
  if (body?.follow_up_at !== undefined) payload.follow_up_at = body.follow_up_at || null;
  if (body?.notes !== undefined) payload.notes = String(body.notes || "").trim() || null;
  return payload;
}
