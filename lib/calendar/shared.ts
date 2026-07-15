import type { CalendarRule, CalendarSettings } from "./types";

export const DEFAULT_SETTINGS: Omit<CalendarSettings, "id" | "created_at" | "updated_at"> = {
  available_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  available_after_time: "10:00",
  available_hours: ["10:00"],
  max_visits_per_day: 1,
  min_days_before_booking: 3,
  auto_confirm: false,
  manual_confirmation_required: true,
};

export function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return /^\d{2}:\d{2}$/.test(value) ? value : null;
}

export function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function toNullablePositiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

export function toNullablePositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function normalizeText(value?: string | null): string {
  return String(value || "").trim().toLowerCase();
}

export function parseDateInput(value?: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return startOfDay(parsed);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getEnglishDayName(date: Date): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function fetchCalendarSettings(supabase: any): Promise<CalendarSettings> {
  const { data, error } = await supabase
    .from("calendar_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const merged = { ...DEFAULT_SETTINGS, ...(data || {}) } as CalendarSettings;
  if (!merged.available_after_time) {
    merged.available_after_time = Array.isArray(merged.available_hours)
      ? merged.available_hours[0] || "10:00"
      : "10:00";
  }
  return merged;
}

export async function findAppliedRule(supabase: any, judet: string, city?: string): Promise<CalendarRule | null> {
  const { data, error } = await supabase
    .from("calendar_rules")
    .select("*")
    .eq("active", true)
    .eq("judet", judet);

  if (error) throw error;
  const rules = (data || []) as CalendarRule[];
  const normalizedCity = normalizeText(city);
  return (
    rules.find((rule) => normalizeText(rule.city) === normalizedCity && normalizedCity) ||
    rules.find((rule) => !rule.city) ||
    null
  );
}

export function rulePayload(body: Partial<CalendarRule>) {
  return {
    judet: body.judet?.trim(),
    city: body.city?.trim() || null,
    available_after_time: normalizeTime(body.available_after_time) || null,
    min_distance_km: toNullablePositiveInteger(body.min_distance_km),
    max_distance_km: toNullablePositiveInteger(body.max_distance_km),
    max_visits_per_day: toNullablePositiveInteger(body.max_visits_per_day),
    requires_manual_approval: body.requires_manual_approval !== false,
    allow_weekends: Boolean(body.allow_weekends),
    travel_cost_supplement: toNullablePositiveNumber(body.travel_cost_supplement),
    internal_notes: body.internal_notes?.trim() || null,
    active: true,
  };
}

export function formatRoDate(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });
}
