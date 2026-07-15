// Types and interfaces for Calendar Deplasari (photo/video visit scheduling).

export type BookingRequestStatus =
  | "cerere_primita"
  | "in_verificare"
  | "confirmata"
  | "reprogramare_propusa"
  | "anulata"
  | "finalizata";

export type NotificationType = "new_request" | "status_change" | "reminder";

export type ExternalLinkPlatform = "booking" | "airbnb" | "facebook" | "site";

export type ExternalLink = {
  platform: ExternalLinkPlatform;
  url: string;
};

export interface BookingRequest {
  id: string;
  lead_id: string | null;
  listing_id: string | null;
  property_name: string;
  contact_name: string;
  phone: string;
  judet: string;
  city: string | null;
  sat: string | null;
  preferred_date: string;
  external_links: ExternalLink[] | null;
  notes: string | null;
  status: BookingRequestStatus;
  applied_rule_id: string | null;
  applied_rule?: CalendarRule | null;
  confirmed_date: string | null;
  proposed_date: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarSettings {
  id: string;
  available_days: string[];
  available_after_time: string;
  /** @deprecated Synced from available_after_time. Kept for DB compatibility. */
  available_hours: string[];
  max_visits_per_day: number;
  min_days_before_booking: number;
  auto_confirm: boolean;
  manual_confirmation_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarRule {
  id: string;
  judet: string;
  city: string | null;
  available_after_time: string | null;
  min_distance_km: number | null;
  max_distance_km: number | null;
  max_visits_per_day: number | null;
  requires_manual_approval: boolean;
  allow_weekends: boolean;
  travel_cost_supplement: number | null;
  internal_notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarBlock {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  blocked_by: string | null;
  created_at: string;
}

export interface CalendarNotification {
  id: string;
  booking_request_id: string;
  notification_type: NotificationType;
  sent_via: string[];
  sent_at: string;
  email_sent_to: string | null;
}

export interface BookingRequestSubmission {
  property_name: string;
  contact_name: string;
  phone: string;
  judet: string;
  city?: string;
  sat?: string;
  preferred_date: string;
  external_links?: ExternalLink[];
  notes?: string;
}

export interface BookingRequestStatusUpdate {
  status: BookingRequestStatus;
  confirmed_date?: string;
  proposed_date?: string;
  rejection_reason?: string;
}

export interface CalendarDay {
  date: string;
  dayOfWeek: number;
  dayName: string;
  bookingCount: number;
  requestCount: number;
  isBlocked: boolean;
  isToday: boolean;
  isPast: boolean;
  isCurrentMonth: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number;
  days: CalendarDay[];
}

export interface CalendarAvailabilityDay {
  date: string;
  available: boolean;
  reason: string | null;
  request_count: number;
}

export interface CalendarAvailability {
  judet: string;
  city: string | null;
  available_after_time: string;
  min_days_before_booking: number;
  max_visits_per_day: number;
  applied_rule: {
    id: string;
    judet: string;
    city: string | null;
    available_after_time: string | null;
    requires_manual_approval: boolean;
    allow_weekends: boolean;
    travel_cost_supplement: number | null;
  } | null;
  days: CalendarAvailabilityDay[];
}

export const STATUS_LABELS: Record<BookingRequestStatus, string> = {
  cerere_primita: "Cerere primita",
  in_verificare: "In verificare",
  confirmata: "Confirmata",
  reprogramare_propusa: "Reprogramare propusa",
  anulata: "Anulata",
  finalizata: "Finalizata",
};

export const STATUS_COLORS: Record<BookingRequestStatus, string> = {
  cerere_primita: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
  in_verificare: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
  confirmata: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  reprogramare_propusa: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  anulata: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
  finalizata: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200",
};
