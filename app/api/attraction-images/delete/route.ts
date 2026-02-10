import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';

export async function POST(request: Request) {
  try {
    const limit = rateLimit(request, { windowMs: 60_000, max: 40, keyPrefix: 'attraction-images-delete' });
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
    const { data: row } = await supabaseAdmin
      .from('attraction_images')
      .select('id, image_url')
      .eq('id', id)
      .maybeSingle();

    if (!row) return NextResponse.json({ error: 'Imagine inexistenta' }, { status: 404 });

    try {
      const url = new URL(row.image_url);
      const matched = url.pathname.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.*)$/);
      if (matched) {
        const bucket = matched[1];
        const path = decodeURIComponent(matched[2]);
        await supabaseAdmin.storage.from(bucket).remove([path]);
      }
    } catch {
      // ignore
    }

    const { error } = await supabaseAdmin.from('attraction_images').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
