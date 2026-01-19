
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { slugify } from '@/lib/utils';

// Note: It's recommended to use a service role key for admin-level operations.
// This key should be stored securely in environment variables and NOT exposed to the client.
// For this implementation, we are creating a new client instance with the service key.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Basic validation
    if (!body.titlu || !body.pret_pe_noapte) {
      return NextResponse.json({ error: 'Title and Price are required.' }, { status: 400 });
    }

    const slug = slugify(body.titlu);

    const { data, error } = await supabaseAdmin
      .from('cazari')
      .insert([
        {
          // Basic Info
          title: body.titlu,
          slug: slug,
          short_description: body.descriere_scurta,
          description: body.descriere,
          status: body.status || 'draft',
          type: body.tip_cazare,
          brand_tag: body.brand_tag,

          // Pricing & Capacity
          price: body.pret_pe_noapte,
          capacity: body.capacitate_max,
          camere: body.numar_camere,
          paturi: body.numar_paturi,
          bai: body.numar_bai,

          // House Rules
          self_checkin: body.self_checkin,
          copii_permis: body.copii_permis,
          animale_permise: body.animale_permise,
          fumat_permis: body.fumat_permis,
          zgomot_restrictions: body.zgomot_restrictions,

          // Location
          regiune_turistica: body.regiune_turistica,
          localitate: body.localitate,
          judet: body.judet,
          sat: body.sat,
          adresa: body.adresa,
          lat: body.lat,
          lng: body.lng,

          // Media
          thumbnail_url: body.thumbnail_url,
          video_teaser_url: body.video_teaser_url,
          // image_gallery will be handled separately, perhaps after the main record is created.

          // Meta
          vizibil_din: body.vizibil_din,
          vizibil_pana: body.vizibil_pana,
          created_by: body.created_by,

          // Top Facilities - Assuming these are boolean columns for simplicity first
          are_jacuzzi: body.are_jacuzzi,
          are_piscina: body.are_piscina,
          are_sauna: body.are_sauna,
          are_semineu: body.are_semineu,
          wifi: body.wifi,
          parcare: body.parcare,
          vedere_munte: body.vedere_munte,
          acces_lac_rau: body.acces_lac_rau,
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Property added successfully!', id: data.id }, { status: 201 });

  } catch (e) {
    console.error('API Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'An internal error occurred.', details: errorMessage }, { status: 500 });
  }
}
