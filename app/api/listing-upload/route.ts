export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const requiredToken = process.env.INVITE_TOKEN;
    if (requiredToken) {
      const token = request.headers.get('x-invite-token');
      if (!token || token !== requiredToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const limit = rateLimit(request, { windowMs: 60_000, max: 20, keyPrefix: 'listing-upload' });
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const form = await request.formData();
    const listingId = form.get('listingId') as string | null;
    if (!listingId) return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });

    const files = form.getAll('files') as File[];
    const alts = form.getAll('alts') as string[];
    const startIndexRaw = form.get('startIndex') as string | null;
    const startIndex = startIndexRaw ? Number(startIndexRaw) || 0 : 0;
    const results: Array<{ id: string; url: string; display_order: number; alt?: string | null }> = [];
    const failures: Array<{ name: string; reason: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      // @ts-ignore - File from formData
      const buffer = Buffer.from(await (f as any).arrayBuffer());
      const name = `${Date.now()}_${Math.random().toString(36).slice(2)}_${f.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
      const path = `listings/${listingId}/${name}`;
      const { error: upErr } = await supabaseAdmin.storage.from('listing-images').upload(path, buffer, { cacheControl: '3600', upsert: false, contentType: f.type });
      if (upErr) {
        console.warn('Could not upload', upErr.message);
        failures.push({ name: f.name, reason: upErr.message || 'upload_failed' });
        continue;
      }
      const { data: publicData } = supabaseAdmin.storage.from('listing-images').getPublicUrl(path);
      const url = (publicData as any)?.publicUrl || (publicData as any)?.public_url || '';
      if (!url) {
        failures.push({ name: f.name, reason: 'public_url_missing' });
        continue;
      }
      // insert row in listing_images table using server key
      const alt = alts[i] || null;
      const { data: inserted, error: imgErr } = await supabaseAdmin.from('listing_images').insert([{ listing_id: listingId, image_url: url, display_order: startIndex + i, alt }]).select('id, image_url, display_order').single();
      if (imgErr || !inserted) {
        console.warn('Could not insert listing_images', imgErr?.message);
        failures.push({ name: f.name, reason: imgErr?.message || 'insert_failed' });
        continue;
      }
      results.push({ id: String(inserted.id), url, display_order: startIndex + i, alt });
    }

    if (failures.length > 0) {
      return NextResponse.json(
        { error: 'Partial upload', uploaded: results, failed: failures },
        { status: 500 }
      );
    }

    return NextResponse.json({ uploaded: results, failed: [] });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
