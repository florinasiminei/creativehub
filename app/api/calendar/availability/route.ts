import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  clampInteger,
  parseDateInput,
  startOfDay,
  getEnglishDayName,
  toDateInputValue,
  fetchCalendarSettings,
  findAppliedRule,
} from "@/lib/calendar/shared";
import type { BookingRequestStatus, CalendarAvailabilityDay } from "@/lib/calendar/types";

export const dynamic = "force-dynamic";

const ACTIVE_DAY_STATUSES: BookingRequestStatus[] = [
  "cerere_primita",
  "in_verificare",
  "confirmata",
  "reprogramare_propusa",
];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const judet = url.searchParams.get("judet")?.trim();
    const city = url.searchParams.get("city")?.trim() || null;
    const days = clampInteger(url.searchParams.get("days"), 7, 90, 45);
    const from = parseDateInput(url.searchParams.get("from")) || startOfDay(new Date());

    if (!judet) {
      return NextResponse.json({ error: "Judetul este obligatoriu." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const settings = await fetchCalendarSettings(supabase);
    const appliedRule = await findAppliedRule(supabase, judet, city || undefined);
    const availableAfterTime = appliedRule?.available_after_time || settings.available_after_time || "10:00";
    const maxVisits = appliedRule?.max_visits_per_day || settings.max_visits_per_day || 1;

    const start = startOfDay(from);
    const minDate = startOfDay(new Date());
    minDate.setDate(minDate.getDate() + settings.min_days_before_booking);
    if (start < minDate) start.setTime(minDate.getTime());

    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    const startStr = toDateInputValue(start);
    const endStr = toDateInputValue(end);

    const [{ data: requests, error: requestsError }, { data: blocks, error: blocksError }] = await Promise.all([
      supabase
        .from("booking_requests")
        .select("preferred_date, confirmed_date, proposed_date, status")
        .in("status", ACTIVE_DAY_STATUSES)
        .or(
          `preferred_date.gte.${startStr},confirmed_date.gte.${startStr},proposed_date.gte.${startStr}`
        ),
      supabase
        .from("calendar_blocks")
        .select("start_date, end_date, reason")
        .lte("start_date", endStr)
        .gte("end_date", startStr),
    ]);

    if (requestsError) throw requestsError;
    if (blocksError) throw blocksError;

    const daysPayload: CalendarAvailabilityDay[] = Array.from({ length: days }, (_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      const dateStr = toDateInputValue(date);
      const dayName = getEnglishDayName(date);
      const isWeekend = dayName === "Saturday" || dayName === "Sunday";
      const block = (blocks || []).find((item: any) => item.start_date <= dateStr && item.end_date >= dateStr);
      const requestCount = (requests || []).filter(
        (item: any) =>
          item.preferred_date === dateStr ||
          item.confirmed_date === dateStr ||
          item.proposed_date === dateStr
      ).length;

      let reason: string | null = null;
      if (!settings.available_days.includes(dayName)) reason = "Zi indisponibila";
      if (appliedRule && isWeekend && !appliedRule.allow_weekends) reason = "Weekend indisponibil pentru zona";
      if (block) reason = "Zi blocata";
      if (requestCount >= maxVisits) reason = "Capacitate atinsa";

      return {
        date: dateStr,
        available: reason === null,
        reason,
        request_count: requestCount,
      };
    });

    return NextResponse.json({
      judet,
      city,
      available_after_time: availableAfterTime,
      min_days_before_booking: settings.min_days_before_booking,
      max_visits_per_day: maxVisits,
      applied_rule: appliedRule
        ? {
            id: appliedRule.id,
            judet: appliedRule.judet,
            city: appliedRule.city,
            available_after_time: appliedRule.available_after_time,
            requires_manual_approval: appliedRule.requires_manual_approval,
            allow_weekends: appliedRule.allow_weekends,
            travel_cost_supplement: appliedRule.travel_cost_supplement,
          }
        : null,
      days: daysPayload,
    });
  } catch (err: any) {
    console.error("GET /api/calendar/availability:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
