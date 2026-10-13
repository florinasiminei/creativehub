import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const revalidate = 3600;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // regiune, judet, localitate, etc.

    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .from('geo_zones')
      .select('id, name, slug, type, parent_id, display_order')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[geo-zones]', error);
      return NextResponse.json({ error: "Cererea nu a putut fi procesata. Incearca din nou." }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: unknown) {
    console.error('[geo-zones]', err);
    return NextResponse.json(
      { error: "Cererea nu a putut fi procesata. Incearca din nou." },
      { status: 500 }
    );
  }
}
