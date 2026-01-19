import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // remove images from storage
    const { data: imgs } = await supabaseAdmin.from('listing_images').select('id, image_url').eq('listing_id', id);
    for (const img of imgs || []) {
      try {
        const url = new URL(img.image_url);
        const matched = url.pathname.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.*)$/);
        if (matched) {
          const bucket = matched[1];
          const path = decodeURIComponent(matched[2]);
          await supabaseAdmin.storage.from(bucket).remove([path]);
        }
      } catch (err) {
        // ignore
      }
    }

    // delete listing_images and listing
    await supabaseAdmin.from('listing_images').delete().eq('listing_id', id);
    await supabaseAdmin.from('listing_facilities').delete().eq('listing_id', id);
    const { error } = await supabaseAdmin.from('listings').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'unknown' }, { status: 500 });
  }
}
