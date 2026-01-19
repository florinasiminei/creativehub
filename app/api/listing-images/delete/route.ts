import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const payload = await request.json();
    const id = payload?.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data: rows } = await supabaseAdmin.from('listing_images').select('*').eq('id', id).limit(1).single();
    if (!rows) return NextResponse.json({ error: 'Image not found' }, { status: 404 });

    const imageUrl = rows.image_url as string;
    // parse storage path from public url when using public bucket
    // public url format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const url = new URL(imageUrl);
    const matched = url.pathname.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.*)$/);
    if (matched) {
      const bucket = matched[1];
      const path = decodeURIComponent(matched[2]);
      await supabaseAdmin.storage.from(bucket).remove([path]);
    }

    const { error } = await supabaseAdmin.from('listing_images').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown' }, { status: 500 });
  }
}
