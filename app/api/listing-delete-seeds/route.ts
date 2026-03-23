import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';

export async function POST(request: Request) {
  try {
    const role = getDraftRoleFromRequest(request);
    if (role !== 'admin' && role !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = rateLimit(request, { windowMs: 60_000, max: 20, keyPrefix: 'listing-delete-seeds' });
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const onlyEmpty = body?.onlyEmpty !== false;
    const supabaseAdmin = getSupabaseAdmin();

    const { data: rows, error } = await supabaseAdmin
      .from('listings')
      .select('id, title, is_published, display_order')
      .eq('is_published', false)
      .is('display_order', null)
      .eq('title', 'Draft proprietate');

    if (error) {
      return NextResponse.json({ error: error.message || 'Nu am putut incarca drafturile seed.' }, { status: 500 });
    }

    const seedIds = (rows || []).map((row: any) => String(row.id)).filter(Boolean);
    if (seedIds.length === 0) {
      return NextResponse.json({ ok: true, deletedCount: 0, deletedIds: [] });
    }

    const { data: imageRows, error: imageError } = await supabaseAdmin
      .from('listing_images')
      .select('listing_id')
      .in('listing_id', seedIds);

    if (imageError) {
      return NextResponse.json({ error: imageError.message || 'Nu am putut verifica imaginile drafturilor seed.' }, { status: 500 });
    }

    const listingIdsWithImages = new Set((imageRows || []).map((row: any) => String(row.listing_id)));
    const deletableIds = onlyEmpty
      ? seedIds.filter((id) => !listingIdsWithImages.has(id))
      : seedIds;

    if (deletableIds.length === 0) {
      return NextResponse.json({ ok: true, deletedCount: 0, deletedIds: [] });
    }

    await supabaseAdmin.from('listing_images').delete().in('listing_id', deletableIds);
    await supabaseAdmin.from('listing_facilities').delete().in('listing_id', deletableIds);

    const { error: deleteError } = await supabaseAdmin.from('listings').delete().in('id', deletableIds);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message || 'Nu am putut sterge drafturile seed.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deletedCount: deletableIds.length, deletedIds: deletableIds });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'unknown' }, { status: 500 });
  }
}
