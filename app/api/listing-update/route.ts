import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
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

    const { error: upErr } = await supabaseAdmin.from('listings').update(updateData).eq('id', id);
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
