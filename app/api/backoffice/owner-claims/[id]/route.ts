import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getDraftRoleFromRequest } from "@/lib/draftsAuth";
import { rateLimit } from "@/lib/rateLimit";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const ACTIONS = new Set(["approve", "reject"]);

export async function POST(
  request: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const role = await getDraftRoleFromRequest(request);
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = rateLimit(request, {
      windowMs: 60_000,
      max: 30,
      keyPrefix: "backoffice-owner-claims",
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Prea multe cereri." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfter) },
        }
      );
    }

    const body = await request.json().catch(() => null);
    const action =
      body && typeof body === "object" && !Array.isArray(body)
        ? String(body.action || "").trim()
        : "";
    if (!ACTIONS.has(action)) {
      return NextResponse.json(
        { error: "Actiune invalida." },
        { status: 400 }
      );
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.id)) {
      return NextResponse.json({ error: "Identificatorul cererii este invalid." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc(
      "review_listing_owner_claim",
      {
        p_claim_id: params.id,
        p_action: action,
        p_reviewer: role,
      }
    );
    if (error) {
      const message = String(error.message || "");
      if (/claim-ul nu exista|listarea nu exista/i.test(message)) {
        return NextResponse.json({ error: "Cererea sau proprietatea nu mai exista." }, { status: 404 });
      }
      if (/deja procesat/i.test(message)) {
        return NextResponse.json({ error: "Cererea a fost deja procesata. Reincarca lista." }, { status: 409 });
      }
      const conflict = /alt proprietar|already owned|conflict/i.test(message);
      return NextResponse.json(
        {
          error: conflict
            ? "Proprietatea este deja asociata altui proprietar."
            : "Nu am putut procesa revendicarea.",
        },
        { status: conflict ? 409 : 500 }
      );
    }

    try {
      revalidatePath("/drafts");
      revalidatePath("/proprietari");
    } catch (revalidateError) {
      console.error("[owner-claim-review] revalidate failed", revalidateError);
    }

    return NextResponse.json({ ok: true, result: data });
  } catch (error) {
    console.error("[owner-claim-review]", error);
    return NextResponse.json(
      { error: "Nu am putut procesa cererea." },
      { status: 500 }
    );
  }
}
