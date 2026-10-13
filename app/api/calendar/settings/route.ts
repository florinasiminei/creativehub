import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getDraftRoleFromRequest } from "@/lib/draftsAuth";
import { DEFAULT_SETTINGS, normalizeTime, clampInteger, fetchCalendarSettings } from "@/lib/calendar/shared";
import type { CalendarSettings } from "@/lib/calendar/types";

export async function GET(req: Request) {
  try {
    const role = await getDraftRoleFromRequest(req);
    const isPublic = role !== "admin" && role !== "staff";
    const supabase = getSupabaseAdmin();
    const data = await fetchCalendarSettings(supabase);
    if (isPublic) {
      return NextResponse.json({
        min_days_before_booking: data.min_days_before_booking,
        available_after_time: data.available_after_time,
        available_days: data.available_days,
      });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("GET /api/calendar/settings:", err);
    return NextResponse.json(
      { error: "Cererea nu a putut fi procesata. Incearca din nou." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const role = await getDraftRoleFromRequest(req);
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<CalendarSettings>;
    const payload = sanitizeSettings(body);
    const supabase = getSupabaseAdmin();

    const { data: existing, error: fetchError } = await supabase
      .from("calendar_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const query = existing
      ? supabase.from("calendar_settings").update(payload).eq("id", existing.id)
      : supabase.from("calendar_settings").insert(payload);

    const { data, error } = await query.select().single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("PATCH /api/calendar/settings:", err);
    return NextResponse.json(
      { error: "Cererea nu a putut fi procesata. Incearca din nou." },
      { status: 500 }
    );
  }
}

function sanitizeSettings(body: Partial<CalendarSettings>) {
  const maxVisits = clampInteger(body.max_visits_per_day, 1, 20, DEFAULT_SETTINGS.max_visits_per_day);
  const minDays = clampInteger(body.min_days_before_booking, 1, 30, DEFAULT_SETTINGS.min_days_before_booking);
  const manualRequired = body.manual_confirmation_required !== false;
  const afterTime = normalizeTime(body.available_after_time) || DEFAULT_SETTINGS.available_after_time;

  return {
    available_days: Array.isArray(body.available_days) && body.available_days.length > 0
      ? body.available_days
      : DEFAULT_SETTINGS.available_days,
    available_after_time: afterTime,
    available_hours: [afterTime],
    max_visits_per_day: maxVisits,
    min_days_before_booking: minDays,
    manual_confirmation_required: manualRequired,
    auto_confirm: manualRequired ? false : Boolean(body.auto_confirm),
  };
}
