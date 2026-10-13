import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getDraftRoleFromRequest } from "@/lib/draftsAuth";
import { rulePayload, normalizeText } from "@/lib/calendar/shared";
import type { CalendarRule } from "@/lib/calendar/types";

export async function GET(req: Request) {
  try {
    const role = await getDraftRoleFromRequest(req);
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("calendar_rules")
      .select("*")
      .eq("active", true)
      .order("judet", { ascending: true })
      .order("city", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("GET /api/calendar/rules:", err);
    return NextResponse.json(
      { error: "Cererea nu a putut fi procesata. Incearca din nou." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const role = await getDraftRoleFromRequest(req);
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<CalendarRule>;
    if (!body.judet?.trim()) {
      return NextResponse.json({ error: "Judetul este obligatoriu." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const normalizedCity = normalizeText(body.city);
    const { data: existing, error: checkError } = await supabase
      .from("calendar_rules")
      .select("id")
      .eq("active", true)
      .eq("judet", body.judet.trim())
      .or(normalizedCity ? `city.eq.${body.city?.trim()},city.is.null` : "city.is.null");

    if (checkError) throw checkError;

    const duplicate = (existing || []).find((rule: any) => {
      if (normalizedCity) return normalizeText(rule.city) === normalizedCity;
      return !rule.city;
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Exista deja o regula activa pentru aceasta locatie. Editati regula existenta." },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("calendar_rules")
      .insert(rulePayload(body))
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/calendar/rules:", err);
    return NextResponse.json(
      { error: "Cererea nu a putut fi procesata. Incearca din nou." },
      { status: 500 }
    );
  }
}
