export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';

const MAX_ATTRACTION_IMAGES = 12;

export async function POST(req: Request) {
  try {
    const limit = rateLimit(req, { windowMs: 60_000, max: 120, keyPrefix: 'attraction-upload-complete' });
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const attractionId = body?.attractionId as string | undefined;
    const path = body?.path as string | undefined;
    const displayOrder = Number(body?.displayOrder);
    const alt = body?.alt ?? null;

    if (!attractionId || !path) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    if (!path.startsWith(`attractions/${attractionId}/`)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const role = getDraftRoleFromRequest(req);
    const requiredToken = process.env.INVITE_TOKEN;
    const inviteToken = req.headers.get('x-invite-token');
    const hasInvite = requiredToken && inviteToken && inviteToken === requiredToken;
    const hasRole = role === 'admin' || role === 'staff';
    if (!hasRole && !hasInvite) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: publicData } = supabaseAdmin.storage.from('listing-images').getPublicUrl(path);
    const url = (publicData as any)?.publicUrl || (publicData as any)?.public_url || '';
    if (!url) return NextResponse.json({ error: 'public_url_missing' }, { status: 500 });

    const { count: existingCount } = await supabaseAdmin
      .from('attraction_images')
      .select('id', { count: 'exact', head: true })
      .eq('attraction_id', attractionId);

    if ((existingCount || 0) >= MAX_ATTRACTION_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ATTRACTION_IMAGES} imagini per atractie.` },
        { status: 400 }
      );
    }

    const { data: inserted, error: imgErr } = await supabaseAdmin
      .from('attraction_images')
      .insert([
        {
          attraction_id: attractionId,
          image_url: url,
          display_order: Number.isFinite(displayOrder) ? displayOrder : null,
          alt,
        },
      ])
      .select('id, image_url, display_order')
      .single();

    if (imgErr || !inserted) {
      return NextResponse.json({ error: imgErr?.message || 'insert_failed' }, { status: 500 });
    }

    return NextResponse.json({ id: String(inserted.id), url, display_order: inserted.display_order });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
