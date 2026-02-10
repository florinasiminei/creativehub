import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';

const ATTRACTION_SELECT =
  'id, title, slug, location_name, price, description, judet, city, sat, lat, lng, is_published, created_by_actor, created_at, updated_at';

export async function POST(request: Request) {
  try {
    const limit = rateLimit(request, { windowMs: 60_000, max: 120, keyPrefix: 'attraction-get' });
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    const role = getDraftRoleFromRequest(request);
    const requiredToken = process.env.INVITE_TOKEN;
    const inviteToken = request.headers.get('x-invite-token');
    const hasInvite = requiredToken && inviteToken === requiredToken;
    const hasRole = role === 'admin' || role === 'staff';
    if (!hasRole && !hasInvite) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const id = body?.id ? String(body.id) : '';
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('attractions')
      .select(ATTRACTION_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Attraction not found' }, { status: 404 });

    const { data: images } = await supabaseAdmin
      .from('attraction_images')
      .select('id, image_url, display_order, alt')
      .eq('attraction_id', id)
      .order('display_order', { ascending: true });

    return NextResponse.json({ attraction: data, images: images || [] });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown' }, { status: 500 });
  }
}
