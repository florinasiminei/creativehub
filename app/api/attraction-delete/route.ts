import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';

export async function POST(request: Request) {
  try {
    const role = getDraftRoleFromRequest(request);
    const requiredToken = process.env.INVITE_TOKEN;
    const inviteToken = request.headers.get('x-invite-token');
    const hasInvite = requiredToken && inviteToken && inviteToken === requiredToken;
    const hasRole = role === 'admin' || role === 'staff';
    if (!hasRole && !hasInvite) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = rateLimit(request, { windowMs: 60_000, max: 30, keyPrefix: 'attraction-delete' });
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data: imgs } = await supabaseAdmin
      .from('attraction_images')
      .select('id, image_url')
      .eq('attraction_id', id);

    for (const img of imgs || []) {
      try {
        const url = new URL(img.image_url);
        const matched = url.pathname.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.*)$/);
        if (matched) {
          const bucket = matched[1];
          const path = decodeURIComponent(matched[2]);
          await supabaseAdmin.storage.from(bucket).remove([path]);
        }
      } catch {
        // ignore
      }
    }

    await supabaseAdmin.from('attraction_images').delete().eq('attraction_id', id);
    const { error } = await supabaseAdmin.from('attractions').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
      revalidatePath('/drafts');
      revalidatePath('/atractii');
    } catch (reErr) {
      console.error('[attraction-delete] revalidate failed', reErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'unknown' }, { status: 500 });
  }
}

