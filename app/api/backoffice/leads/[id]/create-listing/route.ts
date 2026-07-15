import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getDraftRoleFromRequest } from "@/lib/draftsAuth";
import { generateListingToken } from "@/lib/listingTokens";
import { syncListingGeoZones } from "@/lib/geoZones";
import { slugify } from "@/lib/utils";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const role = getDraftRoleFromRequest(req);
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (leadError) throw leadError;
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (lead.listing_id) return NextResponse.json({ listingId: lead.listing_id, alreadyLinked: true });

    const slug = await ensureUniqueListingSlug(supabase, lead.property_name || "cazare");
    const payload = {
      title: lead.property_name || "Draft proprietate",
      slug,
      judet: lead.judet || null,
      city: lead.city || null,
      sat: lead.sat || null,
      phone: lead.phone || null,
      price: 0,
      capacity: "1",
      type: "cabana",
      description: lead.notes || null,
      is_published: false,
      edit_token: generateListingToken(),
      created_by_actor: role === "staff" ? "georgiana" : "admin",
    };

    let { data: listing, error: listingError } = await supabase
      .from("listings")
      .insert(payload)
      .select("id")
      .single();

    if (listingError && /created_by_actor/i.test(listingError.message || "")) {
      const fallbackPayload = { ...payload } as Record<string, unknown>;
      delete fallbackPayload.created_by_actor;
      ({ data: listing, error: listingError } = await supabase
        .from("listings")
        .insert(fallbackPayload)
        .select("id")
        .single());
    }

    if (listingError) throw listingError;
    if (!listing?.id) throw new Error("Listing insert failed");

    await supabase
      .from("leads")
      .update({ listing_id: listing.id, status: "convertit" })
      .eq("id", params.id);

    await syncListingGeoZones(supabase, { listingId: listing.id, judet: lead.judet || null });

    return NextResponse.json({ listingId: listing.id });
  } catch (err: any) {
    console.error("POST /api/backoffice/leads/[id]/create-listing:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

async function ensureUniqueListingSlug(supabase: any, title: string) {
  const base = slugify(title) || "cazare";
  let candidate = base;
  let suffix = 2;

  while (suffix < 10_000) {
    const { count, error } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("slug", candidate);

    if (error || Number(count || 0) === 0) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return `${base}-${Date.now().toString(36)}`;
}
