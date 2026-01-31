import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';
import { isListingTokenValid } from '@/lib/listingTokens';

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

    const { data: rows } = await supabaseAdmin.from('listing_images').select('*').eq('id', id).limit(1).single();
    if (!rows) return NextResponse.json({ error: 'Image not found' }, { status: 404 });

    const role = getDraftRoleFromRequest(request);
    const hasRole = role === 'admin' || role === 'staff';
    if (!hasRole) {
      const listingToken = request.headers.get('x-listing-token');
      const ok = await isListingTokenValid(String(rows.listing_id), listingToken, supabaseAdmin);
      if (!ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const imageUrl = rows.image_url as string;
    // parse storage path from public url when using public bucket
    // public url format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const url = new URL(imageUrl);
    const matched = url.pathname.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.*)$/);
    if (matched) {
      const bucket = matched[1];
      const path = decodeURIComponent(matched[2]);
      await supabaseAdmin.storage.from(bucket).remove([path]);
    }

    const { error } = await supabaseAdmin.from('listing_images').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown' }, { status: 500 });
  }
}
