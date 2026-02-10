import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';

export async function POST(request: Request) {
  try {
    const limit = rateLimit(request, { windowMs: 60_000, max: 60, keyPrefix: 'attraction-update' });
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

    const toNumber = (value: unknown) => {
      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (Object.prototype.hasOwnProperty.call(body, 'title')) updateData.title = body.title || null;
    if (Object.prototype.hasOwnProperty.call(body, 'location_name')) updateData.location_name = body.location_name || null;
    if (Object.prototype.hasOwnProperty.call(body, 'price')) updateData.price = toNumber(body.price);
    if (Object.prototype.hasOwnProperty.call(body, 'description')) updateData.description = body.description || null;
    if (Object.prototype.hasOwnProperty.call(body, 'judet')) updateData.judet = body.judet || null;
    if (Object.prototype.hasOwnProperty.call(body, 'city')) updateData.city = body.city || null;
    if (Object.prototype.hasOwnProperty.call(body, 'sat')) updateData.sat = body.sat || null;
    if (Object.prototype.hasOwnProperty.call(body, 'lat')) updateData.lat = toNumber(body.lat);
    if (Object.prototype.hasOwnProperty.call(body, 'lng')) updateData.lng = toNumber(body.lng);
    if (Object.prototype.hasOwnProperty.call(body, 'is_published')) updateData.is_published = Boolean(body.is_published);

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('attractions').update(updateData).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
      revalidatePath('/drafts');
      revalidatePath('/atractii');
    } catch (reErr) {
      console.error('[attraction-update] revalidate failed', reErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
