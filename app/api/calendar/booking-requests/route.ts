import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getDraftRoleFromRequest } from "@/lib/draftsAuth";
import { rateLimit } from "@/lib/rateLimit";
import {
  parseDateInput,
  startOfDay,
  getEnglishDayName,
  normalizeText,
  isSafeUrl,
  fetchCalendarSettings,
  findAppliedRule,
} from "@/lib/calendar/shared";
import type { BookingRequestSubmission, BookingRequestStatus } from "@/lib/calendar/types";

const ACTIVE_DAY_STATUSES: BookingRequestStatus[] = [
  "cerere_primita",
  "in_verificare",
  "confirmata",
  "reprogramare_propusa",
];

export async function GET(req: Request) {
  try {
    const role = await getDraftRoleFromRequest(req);
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("booking_requests")
      .select("*, applied_rule:calendar_rules(*)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("GET /api/calendar/booking-requests:", err);
    return NextResponse.json(
      { error: "Cererea nu a putut fi procesata. Incearca din nou." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const limit = rateLimit(req, { windowMs: 60_000, max: 12, keyPrefix: "calendar-booking-request" });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Prea multe cereri. Incercati din nou in cateva minute." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const body = (await req.json()) as BookingRequestSubmission;
    const validationError = validateSubmission(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const settings = await fetchCalendarSettings(supabase);
    const preferredDate = parseDateInput(body.preferred_date);
    const minDate = startOfDay(new Date());
    minDate.setDate(minDate.getDate() + settings.min_days_before_booking);

    if (!preferredDate || preferredDate < minDate) {
      return NextResponse.json(
        { error: `Alegeti o data cu cel putin ${settings.min_days_before_booking} zile in avans.` },
        { status: 400 }
      );
    }

    const dayName = getEnglishDayName(preferredDate);
    if (!settings.available_days.includes(dayName)) {
      return NextResponse.json(
        { error: "Data selectata nu este intr-o zi disponibila pentru deplasari." },
        { status: 400 }
      );
    }

    const appliedRule = await findAppliedRule(supabase, body.judet, body.city);
    const isWeekend = dayName === "Saturday" || dayName === "Sunday";
    if (appliedRule && isWeekend && !appliedRule.allow_weekends) {
      return NextResponse.json(
        { error: "Pentru zona selectata nu sunt disponibile deplasari in weekend." },
        { status: 400 }
      );
    }

    const availableAfterTime = appliedRule?.available_after_time || settings.available_after_time;
    if (availableAfterTime) {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      if (body.preferred_date === todayStr) {
        const [h, m] = availableAfterTime.split(":").map(Number);
        const cutoff = new Date(now);
        cutoff.setHours(h, m, 0, 0);
        if (now < cutoff) {
          return NextResponse.json(
            { error: `Pentru aceasta locatie, cererile se pot trimite dupa ora ${availableAfterTime}.` },
            { status: 400 }
          );
        }
      }
    }

    const { data: blocks, error: blocksError } = await supabase
      .from("calendar_blocks")
      .select("id")
      .lte("start_date", body.preferred_date)
      .gte("end_date", body.preferred_date);

    if (blocksError) throw blocksError;
    if ((blocks || []).length > 0) {
      return NextResponse.json(
        { error: "Data selectata este blocata in calendar." },
        { status: 400 }
      );
    }

    const maxVisits = appliedRule?.max_visits_per_day || settings.max_visits_per_day || 1;
    const sameDayCount = await countActiveRequestsForDay(supabase, body.preferred_date);
    if (sameDayCount >= maxVisits) {
      return NextResponse.json(
        { error: "Data selectata a atins numarul maxim de deplasari. Alegeti alta data." },
        { status: 400 }
      );
    }

    const listingId = await findExistingListing(supabase, body);
    const leadId = await findOrCreateLead(supabase, body, listingId);
    const canAutoConfirm =
      settings.auto_confirm &&
      !settings.manual_confirmation_required &&
      !appliedRule?.requires_manual_approval;
    const initialStatus: BookingRequestStatus = canAutoConfirm ? "confirmata" : "cerere_primita";

    const insertPayload: Record<string, unknown> = {
      lead_id: leadId,
      listing_id: listingId,
      property_name: body.property_name.trim(),
      contact_name: body.contact_name.trim(),
      phone: body.phone.trim(),
      judet: body.judet,
      city: body.city?.trim() || null,
      sat: body.sat?.trim() || null,
      preferred_date: body.preferred_date,
      confirmed_date: canAutoConfirm ? body.preferred_date : null,
      external_links: body.external_links || null,
      notes: body.notes?.trim() || null,
      status: initialStatus,
      applied_rule_id: appliedRule?.id || null,
    };

    let { data: newRequest, error: createError } = await supabase
      .from("booking_requests")
      .insert(insertPayload)
      .select("*, applied_rule:calendar_rules(*)")
      .single();

    if (createError && /lead_id/i.test(createError.message || "")) {
      delete insertPayload.lead_id;
      ({ data: newRequest, error: createError } = await supabase
        .from("booking_requests")
        .insert(insertPayload)
        .select("*, applied_rule:calendar_rules(*)")
        .single());
    }

    if (createError) throw createError;

    await markLeadAsBookingRequest(supabase, leadId, listingId);
    await sendInternalNotification(newRequest.id, "new_request", supabase);
    return NextResponse.json(
      { id: newRequest.id, status: newRequest.status, preferred_date: newRequest.preferred_date },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err: any) {
    console.error("POST /api/calendar/booking-requests:", err);
    return NextResponse.json(
      { error: "Cererea nu a putut fi procesata. Incearca din nou." },
      { status: 500 }
    );
  }
}

function validateSubmission(body: BookingRequestSubmission) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Cerere invalida.';
  const limits = { property_name: 160, contact_name: 120, phone: 32, judet: 120, city: 120, sat: 120, preferred_date: 10, notes: 5000 };
  for (const [field, maximum] of Object.entries(limits)) {
    const value = body[field as keyof BookingRequestSubmission];
    if (value !== undefined && (typeof value !== 'string' || value.length > maximum)) return 'Datele introduse sunt prea lungi sau invalide.';
  }
  if (body.external_links !== undefined && (!Array.isArray(body.external_links) || body.external_links.length > 10 || body.external_links.some((link) => !link || typeof link.url !== 'string' || link.url.length > 2000))) return 'Linkuri invalide.';
  if (!body?.property_name?.trim()) return "Numele cazarii este obligatoriu.";
  if (!body?.contact_name?.trim()) return "Numele persoanei de contact este obligatoriu.";
  if (!body?.phone?.trim()) return "Telefonul este obligatoriu.";
  if (body.phone.replace(/\D/g, "").length < 10) return "Numarul de telefon pare incomplet.";
  if (!body?.judet?.trim()) return "Judetul este obligatoriu.";
  if (!body?.preferred_date || !parseDateInput(body.preferred_date)) return "Data preferata este invalida.";
  if (body.external_links?.some((link) => !isSafeUrl(link.url))) return "Unul dintre linkuri este invalid.";
  return null;
}

async function countActiveRequestsForDay(supabase: any, date: string) {
  const { data, error } = await supabase
    .from("booking_requests")
    .select("id, preferred_date, confirmed_date, proposed_date, status")
    .in("status", ACTIVE_DAY_STATUSES);

  if (error) throw error;
  return (data || []).filter(
    (request: any) =>
      request.preferred_date === date ||
      request.confirmed_date === date ||
      request.proposed_date === date
  ).length;
}

async function findExistingListing(supabase: any, body: BookingRequestSubmission) {
  const phone = body.phone.trim();
  const propertyName = body.property_name.trim();

  const { data: byPhone } = await supabase
    .from("listings")
    .select("id")
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();

  if (byPhone?.id) return byPhone.id as string;

  const { data: byTitle } = await supabase
    .from("listings")
    .select("id")
    .eq("title", propertyName)
    .eq("judet", body.judet)
    .limit(1)
    .maybeSingle();

  return byTitle?.id || null;
}

async function findOrCreateLead(supabase: any, body: BookingRequestSubmission, listingId: string | null) {
  try {
    const phone = body.phone.trim();
    const propertyName = body.property_name.trim();
    const { data: byPhone } = await supabase
      .from("leads")
      .select("id, listing_id")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

    if (byPhone?.id) {
      const updatePayload: Record<string, unknown> = {
        property_name: propertyName,
        contact_name: body.contact_name.trim(),
        judet: body.judet,
        city: body.city?.trim() || null,
        sat: body.sat?.trim() || null,
        status: "cerere_deplasare",
      };
      if (listingId && !byPhone.listing_id) updatePayload.listing_id = listingId;
      await supabase.from("leads").update(updatePayload).eq("id", byPhone.id);
      return byPhone.id as string;
    }

    const { data, error } = await supabase
      .from("leads")
      .insert({
        listing_id: listingId,
        property_name: propertyName,
        contact_name: body.contact_name.trim(),
        phone,
        judet: body.judet,
        city: body.city?.trim() || null,
        sat: body.sat?.trim() || null,
        source: "calendar_deplasari",
        status: "cerere_deplasare",
        notes: body.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (err) {
    console.warn("Could not create or update lead for booking request:", err);
    return null;
  }
}

async function markLeadAsBookingRequest(supabase: any, leadId: string | null, listingId: string | null) {
  if (!leadId) return;
  try {
    const payload: Record<string, unknown> = { status: "cerere_deplasare" };
    if (listingId) payload.listing_id = listingId;
    await supabase.from("leads").update(payload).eq("id", leadId);
  } catch (err) {
    console.warn("Could not update lead status after booking request:", err);
  }
}

async function sendInternalNotification(
  requestId: string,
  type: "new_request" | "status_change" | "reminder",
  supabase: any
) {
  try {
    const { data: request } = await supabase
      .from("booking_requests")
      .select("property_name, contact_name, phone, judet, city, preferred_date")
      .eq("id", requestId)
      .maybeSingle();
    let emailSent = false;
    if (type === "new_request") {
      try {
        emailSent = await sendNewRequestEmail(request);
      } catch (emailError) {
        console.error("Failed to send calendar email notification:", emailError);
      }
    }

    await supabase.from("calendar_notifications").insert({
      booking_request_id: requestId,
      notification_type: type,
      sent_via: emailSent ? ["in_app", "email"] : ["in_app"],
      email_sent_to: emailSent ? getNotificationRecipient() : null,
      notes: emailSent ? "Email intern trimis." : "Notificare interna inregistrata.",
    });
  } catch (err) {
    console.error("Failed to create calendar notification:", err);
  }
}

async function sendNewRequestEmail(request: any) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass || !request) return false;

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const to = getNotificationRecipient();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to,
    subject: `Cerere noua Calendar Deplasari - ${request.property_name}`,
    text: [
      "A intrat o cerere noua in Calendar Deplasari.",
      "",
      `Cazare: ${request.property_name}`,
      `Contact: ${request.contact_name}`,
      `Telefon: ${request.phone}`,
      `Localitate: ${request.city || "-"}`,
      `Judet: ${request.judet}`,
      `Data preferata: ${request.preferred_date}`,
      "",
      "Verifica cererea in backoffice: /drafts?tab=calendar",
    ].join("\n"),
  });

  return true;
}

function getNotificationRecipient() {
  return process.env.CALENDAR_EMAIL_TO || process.env.CONTACT_EMAIL_TO || "marketing@cabn.ro";
}
