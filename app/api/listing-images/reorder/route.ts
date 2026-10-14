import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { queueInstagramPromotionSync } from '@/lib/server/instagramPromotionConfig';
import {
  invalidateSubmittedOwnerListing,
  resolveListingAccess,
} from '@/lib/server/ownerAuth';

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(req: Request) {
  try {
    const limit = rateLimit(req, { windowMs: 60_000, max: 60, keyPrefix: 'listing-images-reorder' });
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const body = await req.json();
    const { listingId, ids } = body || {};
    if (!listingId || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Missing listingId or ids' }, { status: 400 });
    }
    const normalizedIds = ids.map((id) => String(id)).filter(Boolean);
    if (
      !isUuid(String(listingId)) ||
      normalizedIds.length === 0 ||
      normalizedIds.length > 30 ||
      normalizedIds.some((id) => !isUuid(id))
    ) {
      return NextResponse.json({ error: 'Invalid image ids' }, { status: 400 });
    }

    const access = await resolveListingAccess(req, String(listingId), supabaseAdmin);
    if (!access.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uniqueIds = Array.from(new Set(normalizedIds));
    if (uniqueIds.length !== normalizedIds.length) {
      return NextResponse.json({ error: 'Duplicate image ids' }, { status: 400 });
    }

    if (access.kind === 'owner') {
      await invalidateSubmittedOwnerListing(supabaseAdmin, String(listingId), access.ownerId);
    }

    const { error } = await supabaseAdmin.rpc('reorder_listing_images', {
      p_listing_id: String(listingId),
      p_image_ids: uniqueIds,
      p_expected_owner_id:
        access.kind === 'owner' ? access.ownerId : null,
    });
    if (error) {
      const conflict = /proprietarul s-a schimbat/i.test(error.message || '');
      const invalid = /lista .* invalida|duplicate|nu apartin|toate imaginile/i.test(
        error.message || ''
      );
      return NextResponse.json(
        {
          error: conflict
            ? 'Accesul la proprietate s-a schimbat. Reincarca pagina.'
            : invalid
              ? 'Ordinea imaginilor este invalida. Reincarca pagina.'
              : 'Nu am putut salva ordinea imaginilor.',
        },
        { status: conflict ? 409 : invalid ? 400 : 500 }
      );
    }

    if (access.kind === 'owner') {
      await invalidateSubmittedOwnerListing(supabaseAdmin, String(listingId), access.ownerId);
    }

    queueInstagramPromotionSync(String(listingId));
    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Cererea nu a putut fi procesata. Incearca din nou." }, { status: 500 });
  }
}
