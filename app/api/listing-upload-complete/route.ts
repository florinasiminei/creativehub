export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';
import { isListingTokenValid } from '@/lib/listingTokens';

export async function POST(req: Request) {
  try {
    const limit = rateLimit(req, { windowMs: 60_000, max: 120, keyPrefix: 'listing-upload-complete' });
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const listingId = body?.listingId as string | undefined;
    const path = body?.path as string | undefined;
    const displayOrder = Number(body?.displayOrder);
    const alt = body?.alt ?? null;

    if (!listingId || !path) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    if (!path.startsWith(`listings/${listingId}/`)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const role = getDraftRoleFromRequest(req);
    const hasRole = role === 'admin' || role === 'staff';
    if (!hasRole) {
      const listingToken = req.headers.get('x-listing-token');
      const ok = await isListingTokenValid(String(listingId), listingToken, supabaseAdmin);
      if (!ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { data: publicData } = supabaseAdmin.storage.from('listing-images').getPublicUrl(path);
    const url = (publicData as any)?.publicUrl || (publicData as any)?.public_url || '';
    if (!url) return NextResponse.json({ error: 'public_url_missing' }, { status: 500 });

    const { data: inserted, error: imgErr } = await supabaseAdmin
      .from('listing_images')
      .insert([{ listing_id: listingId, image_url: url, display_order: Number.isFinite(displayOrder) ? displayOrder : null, alt }])
      .select('id, image_url, display_order')
      .single();
    if (imgErr || !inserted) {
      console.warn('Could not insert listing_images', imgErr?.message);
      return NextResponse.json({ error: imgErr?.message || 'insert_failed' }, { status: 500 });
    }

    return NextResponse.json({ id: String(inserted.id), url, display_order: inserted.display_order });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
