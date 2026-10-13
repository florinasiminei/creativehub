import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import {
  invalidateSubmittedOwnerListing,
  resolveListingAccess,
} from '@/lib/server/ownerAuth';
import { deleteStoredImageUrls } from '@/lib/server/r2';

export async function POST(request: Request) {
  try {
    const limit = rateLimit(request, { windowMs: 60_000, max: 40, keyPrefix: 'listing-images-delete' });
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const payload = await request.json();
    const id = payload?.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data: rows, error: imageError } = await supabaseAdmin
      .from('listing_images')
      .select('id, listing_id, image_url')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (imageError) {
      return NextResponse.json({ error: imageError.message }, { status: 500 });
    }
    if (!rows) return NextResponse.json({ error: 'Image not found' }, { status: 404 });

    const access = await resolveListingAccess(request, String(rows.listing_id), supabaseAdmin);
    if (!access.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (access.kind === 'owner') {
      const [
        { data: listing, error: listingError },
        { count: imageCount, error: imageCountError },
      ] = await Promise.all([
        supabaseAdmin
          .from('listings')
          .select('is_published')
          .eq('id', String(rows.listing_id))
          .eq('owner_id', access.ownerId)
          .maybeSingle(),
        supabaseAdmin
          .from('listing_images')
          .select('id', { count: 'exact', head: true })
          .eq('listing_id', String(rows.listing_id)),
      ]);

      if (listingError || imageCountError) {
        return NextResponse.json(
          { error: listingError?.message || imageCountError?.message || 'Nu am putut verifica galeria.' },
          { status: 500 }
        );
      }
      if (!listing) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (listing.is_published === true && (imageCount || 0) <= 5) {
        return NextResponse.json(
          { error: 'O proprietate publicata trebuie sa pastreze cel putin 5 imagini.' },
          { status: 409 }
        );
      }
    }

    if (access.kind === 'owner') {
      await invalidateSubmittedOwnerListing(
        supabaseAdmin,
        String(rows.listing_id),
        access.ownerId
      );
    }

    const { data: deletedRows, error: deleteError } = await supabaseAdmin.rpc(
      'delete_listing_image_record',
      {
        p_image_id: String(id),
        p_expected_owner_id:
          access.kind === 'owner' ? access.ownerId : null,
      }
    );
    if (deleteError) {
      const conflict = /cel putin 5 imagini|proprietarul .* schimbat/i.test(
        deleteError.message || ''
      );
      const missing = /nu exista/i.test(deleteError.message || '');
      return NextResponse.json(
        {
          error: conflict
            ? 'O proprietate publicata trebuie sa pastreze cel putin 5 imagini.'
            : missing
              ? 'Imaginea nu mai exista.'
              : deleteError.message,
        },
        { status: conflict ? 409 : missing ? 404 : 500 }
      );
    }

    const deletedRow = Array.isArray(deletedRows)
      ? deletedRows[0]
      : deletedRows;
    if (access.kind === 'owner') {
      await invalidateSubmittedOwnerListing(
        supabaseAdmin,
        String(rows.listing_id),
        access.ownerId
      );
    }
    const imageUrl =
      deletedRow?.deleted_image_url || (rows.image_url as string);
    try {
      await deleteStoredImageUrls([imageUrl], {
        supabaseAdmin,
        includeListingCardVariant: true,
      });
    } catch (storageError) {
      console.error('[listing-image-delete] storage cleanup failed', storageError);
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Cererea nu a putut fi procesata. Incearca din nou." }, { status: 500 });
  }
}
