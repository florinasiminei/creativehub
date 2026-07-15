import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getDraftRoleFromRequest } from "@/lib/draftsAuth";
import type { BookingRequestStatus, BookingRequestStatusUpdate } from "@/lib/calendar/types";

const STATUSES: BookingRequestStatus[] = [
  "cerere_primita",
  "in_verificare",
  "confirmata",
  "reprogramare_propusa",
  "anulata",
  "finalizata",
];

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const role = getDraftRoleFromRequest(req);
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("booking_requests")
      .select("*, applied_rule:calendar_rules(*)")
      .eq("id", params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("GET /api/calendar/booking-requests/[id]:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const role = getDraftRoleFromRequest(req);
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as BookingRequestStatusUpdate;
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Status invalid." }, { status: 400 });
    }
    if (body.status === "confirmata" && !body.confirmed_date) {
      return NextResponse.json({ error: "Data confirmată este obligatorie." }, { status: 400 });
    }
    if (body.status === "reprogramare_propusa" && !body.proposed_date) {
      return NextResponse.json({ error: "Data propusă este obligatorie." }, { status: 400 });
    }
    if (body.status === "anulata" && !body.rejection_reason?.trim()) {
      return NextResponse.json({ error: "Motivul anulării este obligatoriu." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const updateData: Record<string, unknown> = {
      status: body.status,
      rejection_reason: body.status === "anulata" ? body.rejection_reason?.trim() : null,
    };

    if (body.status === "confirmata") {
      updateData.confirmed_date = body.confirmed_date;
      updateData.proposed_date = null;
    } else if (body.status === "reprogramare_propusa") {
      updateData.proposed_date = body.proposed_date;
      updateData.confirmed_date = null;
    } else if (body.status === "finalizata") {
      updateData.proposed_date = null;
    }

    const { data: updated, error: updateError } = await supabase
      .from("booking_requests")
      .update(updateData)
      .eq("id", params.id)
      .select("*, applied_rule:calendar_rules(*)")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await sendStatusChangeNotification(params.id, supabase);
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PATCH /api/calendar/booking-requests/[id]:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const role = getDraftRoleFromRequest(req);
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("booking_requests")
      .delete()
      .eq("id", params.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/calendar/booking-requests/[id]:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

async function sendStatusChangeNotification(requestId: string, supabase: any) {
  try {
    await supabase.from("calendar_notifications").insert({
      booking_request_id: requestId,
      notification_type: "status_change",
      sent_via: ["in_app"],
    });
  } catch (err) {
    console.error("Failed to create status change notification:", err);
  }
}
