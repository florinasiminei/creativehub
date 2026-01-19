import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { listingId, ids } = body || {};
    if (!listingId || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Missing listingId or ids' }, { status: 400 });
    }

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      await supabaseAdmin.from('listing_images').update({ display_order: i }).eq('id', id);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
