import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';

export async function POST(req: Request) {
  try {
    const limit = rateLimit(req, { windowMs: 60_000, max: 60, keyPrefix: 'attraction-images-reorder' });
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    const role = getDraftRoleFromRequest(req);
    const requiredToken = process.env.INVITE_TOKEN;
    const inviteToken = req.headers.get('x-invite-token');
    const hasInvite = requiredToken && inviteToken === requiredToken;
    const hasRole = role === 'admin' || role === 'staff';
    if (!hasRole && !hasInvite) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const attractionId = body?.attractionId ? String(body.attractionId) : '';
    const ids = Array.isArray(body?.ids) ? body.ids.map((v: unknown) => String(v)) : [];

    if (!attractionId) return NextResponse.json({ error: 'Missing attractionId' }, { status: 400 });
    if (!ids.length) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();

    const { data: rows, error: rowsErr } = await supabaseAdmin
      .from('attraction_images')
      .select('id, attraction_id')
      .in('id', ids);
    if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 500 });

    const invalid = (rows || []).some((row: any) => String(row.attraction_id) !== attractionId);
    if (invalid || (rows || []).length !== ids.length) {
      return NextResponse.json({ error: 'Ids invalide pentru atractia selectata.' }, { status: 400 });
    }

    for (let index = 0; index < ids.length; index++) {
      const id = ids[index];
      const { error } = await supabaseAdmin
        .from('attraction_images')
        .update({ display_order: index })
        .eq('id', id)
        .eq('attraction_id', attractionId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
