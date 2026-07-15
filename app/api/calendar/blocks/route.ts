import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getDraftRoleFromRequest } from "@/lib/draftsAuth";

export async function GET(req: Request) {
  try {
    const role = getDraftRoleFromRequest(req);
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("calendar_blocks")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("GET /api/calendar/blocks:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const role = getDraftRoleFromRequest(req);
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as {
      start_date: string;
      end_date: string;
      reason: string;
    };

    if (!body.start_date || !body.end_date || !body.reason?.trim()) {
      return NextResponse.json({ error: "Toate campurile sunt obligatorii." }, { status: 400 });
    }
    if (body.start_date > body.end_date) {
      return NextResponse.json(
        { error: "Data de inceput trebuie sa fie inainte de data de final." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("calendar_blocks")
      .insert({
        start_date: body.start_date,
        end_date: body.end_date,
        reason: body.reason.trim(),
        blocked_by: role,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/calendar/blocks:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const role = getDraftRoleFromRequest(req);
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.pathname.split("/").filter(Boolean).pop();
    if (!id) {
      return NextResponse.json({ error: "ID obligatoriu." }, { status: 400 });
    }

    const body = await req.json() as {
      start_date?: string;
      end_date?: string;
      reason?: string;
    };

    const supabase = getSupabaseAdmin();
    const updatePayload: Record<string, unknown> = {};
    if (body.start_date) updatePayload.start_date = body.start_date;
    if (body.end_date) updatePayload.end_date = body.end_date;
    if (body.reason?.trim()) updatePayload.reason = body.reason.trim();

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "Niciun camp de actualizat." }, { status: 400 });
    }

    if (updatePayload.start_date && updatePayload.end_date && updatePayload.start_date > updatePayload.end_date) {
      return NextResponse.json(
        { error: "Data de inceput trebuie sa fie inainte de data de final." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("calendar_blocks")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("PATCH /api/calendar/blocks:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
