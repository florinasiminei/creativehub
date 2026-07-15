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

export async function GET(req: Request) {
  try {
    const role = getDraftRoleFromRequest(req);
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("GET /api/backoffice/leads:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const role = getDraftRoleFromRequest(req);
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const propertyName = readString(body.property_name);
    const createBookingRequest = body.create_booking_request === true;
    const preferredDate = readString(body.preferred_date);

    if (!propertyName) {
      return NextResponse.json({ error: "Numele cazării este obligatoriu." }, { status: 400 });
    }
    if (createBookingRequest && !isDateIso(preferredDate)) {
      return NextResponse.json({ error: "Data preferată este invalidă." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const payload = sanitizeLeadPayload(body);
    if (createBookingRequest) payload.status = "cerere_deplasare";

    const { data, error } = await supabase.from("leads").insert(payload).select().single();
    if (error) throw error;

    let bookingRequest = null;
    if (createBookingRequest) {
      const { data: createdRequest, error: requestError } = await supabase
        .from("booking_requests")
        .insert({
          lead_id: data.id,
          listing_id: data.listing_id || null,
          property_name: data.property_name,
          contact_name: data.contact_name || data.property_name,
          phone: data.phone || "-",
          judet: data.judet || "-",
          city: data.city || null,
          sat: data.sat || null,
          preferred_date: preferredDate,
          notes: data.notes || null,
          status: "cerere_primita",
        })
        .select("id, preferred_date, status")
        .single();

      if (requestError) {
        const { error: rollbackError } = await supabase.from("leads").delete().eq("id", data.id);
        if (rollbackError) console.error("POST /api/backoffice/leads rollback:", rollbackError);
        throw requestError;
      }

      bookingRequest = createdRequest;
    }

    return NextResponse.json({ lead: data, bookingRequest }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/backoffice/leads:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

function isDateIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeLeadPayload(body: Record<string, unknown>) {
  const requestedStatus = readString(body.status) as LeadStatus;
  const status: LeadStatus = LEAD_STATUSES.includes(requestedStatus) ? requestedStatus : "nou";
  return {
    listing_id: readString(body.listing_id) || null,
    property_name: readString(body.property_name),
    contact_name: readString(body.contact_name) || null,
    phone: readString(body.phone) || null,
    email: readString(body.email) || null,
    judet: readString(body.judet) || null,
    city: readString(body.city) || null,
    sat: readString(body.sat) || null,
    source: readString(body.source) || "cold_call",
    status,
    follow_up_at: readString(body.follow_up_at) || null,
    notes: readString(body.notes) || null,
    created_by: readString(body.created_by) || null,
  };
}
