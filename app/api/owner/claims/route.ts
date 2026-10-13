import { NextResponse } from "next/server";
import { getVerifiedOwner, OwnerAuthUnavailableError } from "@/lib/server/ownerAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimit } from "@/lib/rateLimit";
import { formatOwnerClaimMessage, validateOwnerClaimDetails } from "@/lib/validation/ownerClaim";

function normalizeListingReference(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || raw.length > 300) return null;

  try {
    const url = new URL(raw);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments.at(-1)?.trim() || null;
  } catch {
    const withoutQuery = raw.split(/[?#]/, 1)[0]?.trim() || "";
    const segments = withoutQuery.split("/").filter(Boolean);
    return segments.at(-1)?.trim() || null;
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(request: Request) {
  try {
    const limit = rateLimit(request, {
      windowMs: 60 * 60_000,
      max: 5,
      keyPrefix: "owner-claim",
    });
    if (!limit.ok) {
      return NextResponse.json(
        {
          error:
            "Ai trimis prea multe solicitari. Incearca din nou mai tarziu.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfter) },
        }
      );
    }

    const supabase = getSupabaseAdmin();
    const user = await getVerifiedOwner(request, supabase);
    if (!user?.id || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Cerere invalida." },
        { status: 400 }
      );
    }

    const reference = normalizeListingReference(body.listingReference);
    if (!reference) {
      return NextResponse.json(
        {
          error:
            "Introdu linkul sau identificatorul proprietatii publicate.",
        },
        { status: 400 }
      );
    }

    const { details, errors } = validateOwnerClaimDetails(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: Object.values(errors)[0] },
        { status: 400 }
      );
    }
    const message = formatOwnerClaimMessage(details);

    let listingQuery = supabase
      .from("listings")
      .select("id, title, owner_id")
      .eq("is_published", true)
    .in("publication_status", ["active", "expiring"])
    .or(`publication_expires_at.is.null,publication_expires_at.gt.${new Date().toISOString()}`);
    listingQuery = isUuid(reference)
      ? listingQuery.eq("id", reference)
      : listingQuery.eq("slug", reference);

    const { data: listing, error: listingError } =
      await listingQuery.maybeSingle();
    if (listingError) throw listingError;
    if (!listing) {
      return NextResponse.json(
        {
          error:
            "Nu am gasit o proprietate publica pentru referinta introdusa.",
        },
        { status: 404 }
      );
    }

    if (listing.owner_id === user.id) {
      return NextResponse.json(
        { error: "Proprietatea este deja asociata contului tau." },
        { status: 409 }
      );
    }
    if (listing.owner_id) {
      return NextResponse.json(
        {
          error:
            "Proprietatea este deja administrata dintr-un alt cont. Contacteaza echipa CABN pentru un transfer.",
        },
        { status: 409 }
      );
    }

    const { data: existingClaim, error: existingError } = await supabase
      .from("listing_owner_claims")
      .select("id, status")
      .eq("listing_id", listing.id)
      .eq("user_id", user.id)
      .in("status", ["pending", "approved"])
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingClaim) {
      return NextResponse.json(
        {
          error:
            existingClaim.status === "approved"
              ? "Proprietatea este deja asociata contului tau."
              : "Cererea pentru aceasta proprietate este deja in verificare.",
        },
        { status: 409 }
      );
    }

    const { data: claim, error: claimError } = await supabase
      .from("listing_owner_claims")
      .insert({
        listing_id: listing.id,
        user_id: user.id,
        claimant_email: user.email,
        message: message || null,
        status: "pending",
      })
      .select("id, status, created_at")
      .single();
    if (claimError?.code === "23505") {
      return NextResponse.json(
        { error: "Cererea pentru aceasta proprietate este deja in verificare." },
        { status: 409 }
      );
    }
    if (claimError) throw claimError;

    return NextResponse.json(
      {
        ok: true,
        claim: {
          id: String(claim.id),
          status: String(claim.status),
          createdAt: String(claim.created_at),
          listingTitle: String(listing.title || ""),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof OwnerAuthUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("[owner-claim]", error);
    return NextResponse.json(
      { error: "Nu am putut trimite cererea de revendicare." },
      { status: 500 }
    );
  }
}
