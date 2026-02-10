import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getDraftRoleFromRequest } from "@/lib/draftsAuth";
import { rateLimit } from "@/lib/rateLimit";
import {
  getSeoIndexable,
  getSeoMenuVisibility,
  getSeoPageLastModifiedMs,
  getSeoPageStatus,
  getSeoToggleMeta,
} from "@/lib/seoPages";

type AllowedAction = "toggle_publish" | "toggle_noindex";

export async function POST(request: Request) {
  try {
    const role = getDraftRoleFromRequest(request);
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = rateLimit(request, { windowMs: 60_000, max: 60, keyPrefix: "seo-pages-update" });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const body = (await request.json()) as { id?: string; action?: AllowedAction };
    const id = body?.id;
    const action = body?.action;
    if (!id || !action) {
      return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: current, error: currentError } = await supabaseAdmin
      .from("geo_zones")
      .select("*")
      .eq("id", id)
      .single();

    if (currentError || !current) {
      return NextResponse.json({ error: currentError?.message || "Page not found" }, { status: 404 });
    }

    const row = current as Record<string, unknown>;
    const toggleMeta = getSeoToggleMeta(row);
    const updateData: Record<string, unknown> = {};

    if (action === "toggle_publish") {
      if (!toggleMeta.publishField) {
        return NextResponse.json({ error: "Publish field not available on this page" }, { status: 409 });
      }
      const currentValue = Boolean(row[toggleMeta.publishField]);
      updateData[toggleMeta.publishField] = !currentValue;
    }

    if (action === "toggle_noindex") {
      if (!toggleMeta.indexField || !toggleMeta.indexMode) {
        return NextResponse.json({ error: "Index field not available on this page" }, { status: 409 });
      }
      if (toggleMeta.indexMode === "indexable") {
        const currentValue = Boolean(row[toggleMeta.indexField]);
        updateData[toggleMeta.indexField] = !currentValue;
      } else {
        const currentValue = Boolean(row[toggleMeta.indexField]);
        updateData[toggleMeta.indexField] = !currentValue;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No changes to apply" }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("geo_zones")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: updateError?.message || "Update failed" }, { status: 500 });
    }

    const nextRow = updated as Record<string, unknown>;
    const nextLastModified = getSeoPageLastModifiedMs(nextRow) || Date.now();
    return NextResponse.json({
      ok: true,
      page: {
        id: String(nextRow.id),
        status: getSeoPageStatus(nextRow),
        inMenu: getSeoMenuVisibility(nextRow),
        indexable: getSeoIndexable(nextRow),
        lastModifiedMs: nextLastModified,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
