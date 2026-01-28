import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const limit = rateLimit(request, { windowMs: 60_000, max: 60, keyPrefix: 'listing-update' });
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const body = await request.json();
    const { id, title, location, address, price, capacity, phone, description, type, facilities, is_published } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (location !== undefined) updateData.location = location;
    if (address !== undefined) updateData.address = address;
    if (price !== undefined) updateData.price = price;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (phone !== undefined) updateData.phone = phone;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (is_published !== undefined) updateData.is_published = is_published;
    const toNumber = (value: unknown) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };
    if ((body as any).lat !== undefined) updateData.lat = toNumber((body as any).lat);
    if ((body as any).lng !== undefined) updateData.lng = toNumber((body as any).lng);
    if ((body as any).latitude !== undefined && updateData.lat === undefined) updateData.lat = toNumber((body as any).latitude);
    if ((body as any).longitude !== undefined && updateData.lng === undefined) updateData.lng = toNumber((body as any).longitude);
    if ((body as any).search_radius !== undefined) updateData.search_radius = (body as any).search_radius;

    let { error: upErr } = await supabaseAdmin.from('listings').update(updateData).eq('id', id);
    if (upErr && /lat|lng|latitude|longitude|search_radius/i.test(upErr.message || '')) {
      const fallbackUpdate = { ...updateData };
      const message = String(upErr.message || '');
      if (/search_radius/i.test(message) && !/lat|lng|latitude|longitude/i.test(message)) {
        delete fallbackUpdate.search_radius;
      } else {
        delete fallbackUpdate.lat;
        delete fallbackUpdate.lng;
        delete fallbackUpdate.search_radius;
      }
      ({ error: upErr } = await supabaseAdmin.from('listings').update(fallbackUpdate).eq('id', id));
    }
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    // update facilities
    if (Array.isArray(facilities)) {
      await supabaseAdmin.from('listing_facilities').delete().eq('listing_id', id);
      if (facilities.length > 0) {
        const rels = facilities.map((fid: string) => ({ listing_id: id, facility_id: fid }));
        await supabaseAdmin.from('listing_facilities').insert(rels);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown' }, { status: 500 });
  }
}
