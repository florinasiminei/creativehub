import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const limit = rateLimit(request, { windowMs: 60_000, max: 60, keyPrefix: "listing-reorder" });
    if (!limit.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    }

    const { ids, reset } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Missing ids." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    if (reset) {
      const { error } = await supabaseAdmin
        .from("listings")
        .update({ display_order: null })
        .in("id", ids);
      if (error) {
        if (String(error.message || "").includes("display_order")) {
          return NextResponse.json({ error: "display_order column missing." }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    const total = ids.length;
    for (let index = 0; index < total; index++) {
      const id = ids[index];
      // Keep display_order increasing overall, but render listings top-to-bottom
      // by sorting descending (higher display_order first).
      const displayOrder = total - index;
      const { error } = await supabaseAdmin
        .from("listings")
        .update({ display_order: displayOrder })
        .eq("id", id);
      if (error) {
        if (String(error.message || "").includes("display_order")) {
          return NextResponse.json({ error: "display_order column missing." }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
