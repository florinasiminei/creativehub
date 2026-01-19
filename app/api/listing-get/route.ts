import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { id, slug, requirePublished } = await request.json();
    if (!id && !slug) return NextResponse.json({ error: 'Missing id or slug' }, { status: 400 });

    const query = supabaseAdmin.from('listings').select('*');
    if (id) query.eq('id', id);
    else if (slug) query.eq('slug', slug);
    if (requirePublished) query.eq('is_published', true);
    const { data, error } = await query.single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // also fetch related images and facilities
    const listingId = data?.id;
    const { data: images } = await supabaseAdmin.from('listing_images').select('*').eq('listing_id', listingId).order('display_order', { ascending: true });
    const { data: facilityRows } = await supabaseAdmin.from('listing_facilities').select('facility_id, facilities(id, name)').eq('listing_id', listingId);

    return NextResponse.json({
      listing: data,
      images: images || [],
      facilities: (facilityRows || []).map((r: any) => (r.facilities ? r.facilities.id : r.facility_id)),
      facilitiesDetailed: (facilityRows || []).map((r: any) => r.facilities).filter(Boolean),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown' }, { status: 500 });
  }
}
