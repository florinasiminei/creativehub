import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const requiredToken = process.env.INVITE_TOKEN;
    if (requiredToken) {
      const token = req.headers.get('x-invite-token');
      if (!token || token !== requiredToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
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
      location,
      address,
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

    if (!title || !location) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    const payload: any = {
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      location,
      address: address || null,
      price: price || 0,
      capacity: capacity || 1,
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

    let { data, error } = await supabaseAdmin.from('listings').insert(payload).select('id').single();
    if (error && /lat|lng|latitude|longitude|search_radius|camere|paturi|bai|rooms|beds|bathrooms/i.test(error.message || '')) {
      const fallbackPayload = { ...payload };
      const message = String(error.message || '');
      if (/search_radius/i.test(message) && !/lat|lng|latitude|longitude/i.test(message)) {
        delete fallbackPayload.search_radius;
      } else {
        delete fallbackPayload.lat;
        delete fallbackPayload.lng;
        delete fallbackPayload.search_radius;
      }
      if (/camere|paturi|bai|rooms|beds|bathrooms/i.test(message)) {
        delete fallbackPayload.camere;
        delete fallbackPayload.paturi;
        delete fallbackPayload.bai;
      }
      ({ data, error } = await supabaseAdmin.from('listings').insert(fallbackPayload).select('id').single());
    }
    if (error) {
      console.error('Error inserting listing', error);
      return NextResponse.json({ error: error.message || 'Insert failed' }, { status: 500 });
    }

    const listingId = (data as any).id;

    // Insert listing_facilities if provided (best-effort)
    if (Array.isArray(facilities) && facilities.length > 0) {
      const rels = facilities.map((fid: string) => ({ listing_id: listingId, facility_id: fid }));
      const { error: relErr } = await supabaseAdmin.from('listing_facilities').insert(rels);
      if (relErr) console.warn('Could not insert listing_facilities', relErr.message);
    }

    return NextResponse.json({ ok: true, id: listingId });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
