import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const body = await req.json();
    const { title, slug, location, address, price, capacity, phone, type, description, facilities } = body;

    if (!title || !location) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload: any = {
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      location,
      address: address || null,
      price: price || 0,
      capacity: capacity || 1,
      phone: phone || null,
      type: type || 'cabana',
      description: description || null,
      is_published: false,
    };

    const { data, error } = await supabaseAdmin.from('listings').insert(payload).select('id').single();
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
