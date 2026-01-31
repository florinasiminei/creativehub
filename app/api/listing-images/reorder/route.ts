import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';
import { isListingTokenValid } from '@/lib/listingTokens';

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

    const role = getDraftRoleFromRequest(req);
    const hasRole = role === 'admin' || role === 'staff';
    if (!hasRole) {
      const listingToken = req.headers.get('x-listing-token');
      const ok = await isListingTokenValid(String(listingId), listingToken, supabaseAdmin);
      if (!ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      await supabaseAdmin.from('listing_images').update({ display_order: i }).eq('id', id);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
