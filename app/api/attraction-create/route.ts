import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';
import { slugify } from '@/lib/utils';

async function ensureUniqueAttractionSlug(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  baseSlug: string
) {
  const normalizedBase = slugify(baseSlug) || 'atractie';
  let candidate = normalizedBase;
  let suffix = 2;

  while (true) {
    const { count, error } = await supabaseAdmin
      .from('attractions')
      .select('id', { count: 'exact', head: true })
      .eq('slug', candidate);

    if (error) return candidate;
    if (Number(count || 0) === 0) return candidate;

    candidate = `${normalizedBase}-${suffix}`;
    suffix += 1;
    if (suffix > 10_000) {
      return `${normalizedBase}-${Date.now().toString(36)}`;
    }
  }
}

export async function POST(req: Request) {
  try {
    const role = getDraftRoleFromRequest(req);
    const requiredToken = process.env.INVITE_TOKEN;
    const inviteToken = req.headers.get('x-invite-token');
    const hasInvite = requiredToken && inviteToken === requiredToken;
    const hasRole = role === 'admin' || role === 'staff';
    if (!hasRole && !hasInvite) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = rateLimit(req, { windowMs: 60_000, max: 40, keyPrefix: 'attraction-create' });
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();

    const title = String(body?.title || '').trim();
    const locationName = String(body?.location_name || '').trim();
    const description = typeof body?.description === 'string' ? body.description.trim() : null;
    const judet = typeof body?.judet === 'string' && body.judet.trim() ? body.judet.trim() : null;
    const city = typeof body?.city === 'string' && body.city.trim() ? body.city.trim() : null;
    const sat = typeof body?.sat === 'string' && body.sat.trim() ? body.sat.trim() : null;

    if (!title || !locationName) {
      return NextResponse.json({ error: 'Numele si locatia sunt obligatorii.' }, { status: 400 });
    }

    const toNumber = (value: unknown) => {
      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    const parsedLat = toNumber(body?.lat) ?? toNumber(body?.latitude);
    const parsedLng = toNumber(body?.lng) ?? toNumber(body?.longitude);
    const parsedPrice = toNumber(body?.price);

    const preferredSlug = typeof body?.slug === 'string' ? slugify(body.slug) : '';
    const titleSlug = slugify(title);
    const uniqueSlug = await ensureUniqueAttractionSlug(supabaseAdmin, preferredSlug || titleSlug || 'atractie');

    const createdByActor: 'admin' | 'georgiana' | 'client' =
      !hasRole && !!hasInvite ? 'client' : role === 'staff' ? 'georgiana' : 'admin';

    const payload: Record<string, unknown> = {
      title,
      slug: uniqueSlug,
      location_name: locationName,
      price: parsedPrice,
      description: description || null,
      judet,
      city,
      sat,
      lat: parsedLat,
      lng: parsedLng,
      is_published: false,
      created_by_actor: createdByActor,
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await supabaseAdmin.from('attractions').insert(payload).select('id').single();

    if (error && /created_by_actor/i.test(error.message || '')) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.created_by_actor;
      ({ data, error } = await supabaseAdmin
        .from('attractions')
        .insert(fallbackPayload)
        .select('id')
        .single());
    }

    if (error) {
      return NextResponse.json({ error: error.message || 'Insert failed' }, { status: 500 });
    }

    try {
      revalidatePath('/drafts');
      revalidatePath('/atractii');
    } catch (reErr) {
      console.error('[attraction-create] revalidate failed', reErr);
    }

    return NextResponse.json({ ok: true, id: (data as any).id });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

