import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';
import { generateListingToken } from '@/lib/listingTokens';
import { syncListingGeoZones } from '@/lib/geoZones';

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

    const limit = rateLimit(req, { windowMs: 60_000, max: 40, keyPrefix: 'listing-create' });
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const body = await req.json();
    const {
      title,
      slug,
      city,
      sat,
      price,
      capacity,
      phone,
      type,
      description,
      facilities,
      lat,
      lng,
      latitude,
      longitude,
      search_radius,
      display_order,
      camere,
      paturi,
      bai,
    } = body;

    const judetVal = body.judet ?? null;
    if (!title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!judetVal) {
      return NextResponse.json({ error: 'Județ obligatoriu' }, { status: 400 });
    }

    const toNumber = (value: unknown) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    const parsedLat = toNumber(lat) ?? toNumber(latitude);
    const parsedLng = toNumber(lng) ?? toNumber(longitude);
    const parsedCamere = toNumber(camere);
    const parsedPaturi = toNumber(paturi);
    const parsedBai = toNumber(bai);

    const normalizeCapacity = (value: unknown) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
      if (typeof value !== 'string') return '';
      return value
        .replace(/[–—]/g, '-')
        .replace(/\s+/g, ' ')
        .replace(/\s*([-/])\s*/g, '$1')
        .trim();
    };

    const normalizedCapacity = normalizeCapacity(capacity);

    const payload: any = {
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      judet: judetVal,
      city: city || null,
      sat: sat || null,
      price: price || 0,
      capacity: normalizedCapacity || '1',
      camere: parsedCamere,
      paturi: parsedPaturi,
      bai: parsedBai,
      phone: phone || null,
      type: type || 'cabana',
      description: description || null,
      lat: parsedLat,
      lng: parsedLng,
      search_radius: search_radius || 5,
      is_published: false,
      edit_token: generateListingToken(),
    };

    if (Object.prototype.hasOwnProperty.call(body, 'display_order')) {
      payload.display_order = display_order ?? null;
    } else {
      // Use an incrementing counter so newer listings get higher values.
      try {
        const { data: orderRows, error: orderErr } = await supabaseAdmin
          .from('listings')
          .select('display_order')
          .order('display_order', { ascending: false, nullsFirst: false })
          .limit(1);
        if (!orderErr) {
          const maxOrder = orderRows?.[0]?.display_order;
          const nextOrder = typeof maxOrder === 'number' ? maxOrder + 1 : 1;
          payload.display_order = nextOrder;
        }
      } catch {
        // ignore if column does not exist yet
      }
    }

    let { data, error } = await supabaseAdmin.from('listings').insert(payload).select('id, edit_token').single();
    if (error && /lat|lng|latitude|longitude|search_radius|camere|paturi|bai/i.test(error.message || '')) {
      const fallbackPayload = { ...payload };
      const message = String(error.message || '');
      if (/search_radius/i.test(message) && !/lat|lng|latitude|longitude/i.test(message)) {
        delete fallbackPayload.search_radius;
      } else {
        delete fallbackPayload.lat;
        delete fallbackPayload.lng;
        delete fallbackPayload.search_radius;
      }
      ({ data, error } = await supabaseAdmin.from('listings').insert(fallbackPayload).select('id, edit_token').single());
    }
    if (error) {
      console.error('Error inserting listing', error);
      return NextResponse.json({ error: error.message || 'Insert failed' }, { status: 500 });
    }

    const listingId = (data as any).id;
    const editToken = (data as any)?.edit_token || payload.edit_token;

    // Insert listing_facilities if provided (best-effort)
    if (Array.isArray(facilities) && facilities.length > 0) {
      const rels = facilities.map((fid: string) => ({ listing_id: listingId, facility_id: fid }));
      const { error: relErr } = await supabaseAdmin.from('listing_facilities').insert(rels);
      if (relErr) console.warn('Could not insert listing_facilities', relErr.message);
    }

    await syncListingGeoZones(supabaseAdmin, {
      listingId,
      judet: payload.judet,
    });

    return NextResponse.json({ ok: true, id: listingId, editToken });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
