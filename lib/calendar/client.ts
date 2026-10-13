import type {
  BookingRequest,
  BookingRequestStatusUpdate,
  BookingRequestSubmission,
  CalendarBlock,
  CalendarRule,
  CalendarSettings,
  CalendarMonth,
  CalendarDay,
  CalendarAvailability,
} from "./types";

export {
  DEFAULT_SETTINGS,
  normalizeTime,
  clampInteger,
  toNullablePositiveInteger,
  toNullablePositiveNumber,
  normalizeText,
  parseDateInput,
  startOfDay,
  getEnglishDayName,
  isSafeUrl,
  formatRoDate,
  fetchCalendarSettings as fetchCalendarSettingsClient,
  findAppliedRule as findAppliedRuleClient,
  rulePayload as rulePayloadClient,
} from "./shared";

const API_BASE = "/api/calendar";

async function readError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({}));
  return new Error(typeof payload?.error === "string" ? payload.error : fallback);
}

export async function fetchBookingRequests(): Promise<BookingRequest[]> {
  const res = await fetch(`${API_BASE}/booking-requests`, { cache: "no-store" });
  if (!res.ok) throw await readError(res, "Nu am putut încărca cererile.");
  return res.json();
}

export async function fetchBookingRequest(id: string): Promise<BookingRequest> {
  const res = await fetch(`${API_BASE}/booking-requests/${id}`, { cache: "no-store" });
  if (!res.ok) throw await readError(res, "Nu am putut încărca cererea.");
  return res.json();
}

export async function createBookingRequest(data: BookingRequestSubmission): Promise<Pick<BookingRequest, 'id' | 'status' | 'preferred_date'>> {
  const res = await fetch(`${API_BASE}/booking-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await readError(res, "Nu am putut trimite cererea.");
  return res.json();
}

export async function fetchCalendarAvailability(params: {
  judet: string;
  city?: string;
  days?: number;
  from?: string;
}): Promise<CalendarAvailability> {
  const searchParams = new URLSearchParams({
    judet: params.judet,
    days: String(params.days || 45),
  });
  if (params.city) searchParams.set("city", params.city);
  if (params.from) searchParams.set("from", params.from);

  const res = await fetch(`${API_BASE}/availability?${searchParams.toString()}`, { cache: "no-store" });
  if (!res.ok) throw await readError(res, "Nu am putut incarca disponibilitatea.");
  return res.json();
}

export async function updateBookingRequestStatus(
  id: string,
  update: BookingRequestStatusUpdate
): Promise<BookingRequest> {
  const res = await fetch(`${API_BASE}/booking-requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw await readError(res, "Nu am putut actualiza cererea.");
  return res.json();
}

export async function deleteBookingRequest(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/booking-requests/${id}`, { method: "DELETE" });
  if (!res.ok) throw await readError(res, "Nu am putut șterge cererea.");
}

export async function fetchCalendarSettings(): Promise<CalendarSettings> {
  const res = await fetch(`${API_BASE}/settings`, { cache: "no-store" });
  if (!res.ok) throw await readError(res, "Nu am putut încărca setările calendarului.");
  return res.json();
}

export async function updateCalendarSettings(
  data: Partial<CalendarSettings>
): Promise<CalendarSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await readError(res, "Nu am putut salva setările calendarului.");
  return res.json();
}

export async function fetchCalendarRules(): Promise<CalendarRule[]> {
  const res = await fetch(`${API_BASE}/rules`, { cache: "no-store" });
  if (!res.ok) throw await readError(res, "Nu am putut încărca regulile.");
  return res.json();
}

export async function createCalendarRule(data: Partial<CalendarRule>): Promise<CalendarRule> {
  const res = await fetch(`${API_BASE}/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await readError(res, "Nu am putut crea regula.");
  return res.json();
}

export async function updateCalendarRule(
  id: string,
  data: Partial<CalendarRule>
): Promise<CalendarRule> {
  const res = await fetch(`${API_BASE}/rules/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await readError(res, "Nu am putut actualiza regula.");
  return res.json();
}

export async function deleteCalendarRule(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/rules/${id}`, { method: "DELETE" });
  if (!res.ok) throw await readError(res, "Nu am putut șterge regula.");
}

export async function fetchCalendarBlocks(): Promise<CalendarBlock[]> {
  const res = await fetch(`${API_BASE}/blocks`, { cache: "no-store" });
  if (!res.ok) throw await readError(res, "Nu am putut încărca blocările.");
  return res.json();
}

export async function createCalendarBlock(data: {
  start_date: string;
  end_date: string;
  reason: string;
}): Promise<CalendarBlock> {
  const res = await fetch(`${API_BASE}/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await readError(res, "Nu am putut bloca perioada.");
  return res.json();
}

export async function updateCalendarBlock(
  id: string,
  data: { start_date?: string; end_date?: string; reason?: string }
): Promise<CalendarBlock> {
  const res = await fetch(`${API_BASE}/blocks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await readError(res, "Nu am putut actualiza blocarea.");
  return res.json();
}

export async function deleteCalendarBlock(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/blocks/${id}`, { method: "DELETE" });
  if (!res.ok) throw await readError(res, "Nu am putut debloca perioada.");
}

export function buildCalendarMonth(
  year: number,
  month: number,
  bookings: BookingRequest[],
  blocks: CalendarBlock[]
): CalendarMonth {
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - ((firstDay.getDay() + 6) % 7));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: CalendarDay[] = [];

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const dateStr = toDateInputValue(date);
    const dayOfWeek = date.getDay();
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek];

    const bookingCount = bookings.filter((booking) => booking.confirmed_date === dateStr).length;
    const requestCount = bookings.filter(
      (booking) =>
        booking.status !== "anulata" &&
        booking.status !== "finalizata" &&
        (booking.preferred_date === dateStr ||
          booking.confirmed_date === dateStr ||
          booking.proposed_date === dateStr)
    ).length;

    days.push({
      date: dateStr,
      dayOfWeek,
      dayName,
      bookingCount,
      requestCount,
      isBlocked: blocks.some((block) => block.start_date <= dateStr && block.end_date >= dateStr),
      isToday: date.getTime() === today.getTime(),
      isPast: date < today,
      isCurrentMonth: date.getMonth() === month,
    });
  }

  return { year, month, days };
}

export function buildCalendarWeek(
  selectedDate: string | null,
  bookings: BookingRequest[],
  blocks: CalendarBlock[]
): CalendarDay[] {
  const base = selectedDate ? parseDateInput(selectedDate) : new Date();
  const weekStart = new Date(base);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  return buildCalendarMonth(weekStart.getFullYear(), weekStart.getMonth(), bookings, blocks).days
    .filter((day) => day.date >= toDateInputValue(weekStart))
    .slice(0, 7);
}

export function getMonthLabel(year: number, month: number): string {
  const date = new Date(year, month);
  return date.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
}

export function applyCalendarRule(
  judet: string,
  city: string | null,
  rules: CalendarRule[]
): CalendarRule | null {
  if (city) {
    const cityRule = rules.find((rule) => rule.active && rule.judet === judet && rule.city === city);
    if (cityRule) return cityRule;
  }

  return rules.find((rule) => rule.active && rule.judet === judet && !rule.city) || null;
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
