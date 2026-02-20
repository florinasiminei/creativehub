export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import sharp from 'sharp';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';
import { isListingTokenValid } from '@/lib/listingTokens';

const MAX_IMAGE_WIDTH = 2400;
const WEBP_QUALITY = 82;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 6 * 1024 * 1024;
const MAX_LISTING_IMAGES = 20;

export async function POST(request: Request) {
  try {
    const limit = rateLimit(request, { windowMs: 60_000, max: 20, keyPrefix: 'listing-upload' });
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const form = await request.formData();
    const listingId = form.get('listingId') as string | null;
    if (!listingId) return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });

    const role = getDraftRoleFromRequest(request);
    const hasRole = role === 'admin' || role === 'staff';
    if (!hasRole) {
      const listingToken = request.headers.get('x-listing-token');
      const ok = await isListingTokenValid(String(listingId), listingToken, supabaseAdmin);
      if (!ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const files = form.getAll('files') as File[];
    const alts = form.getAll('alts') as string[];
    const startIndexRaw = form.get('startIndex') as string | null;
    const startIndex = startIndexRaw ? Number(startIndexRaw) || 0 : 0;

    const { count: existingCount } = await supabaseAdmin
      .from('listing_images')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId);
    const totalAfter = (existingCount || 0) + files.length;
    if (totalAfter > MAX_LISTING_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_LISTING_IMAGES} imagini per listare.` },
        { status: 400 }
      );
    }
    const results: Array<{ id: string; url: string; display_order: number; alt?: string | null }> = [];
    const failures: Array<{ name: string; reason: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (typeof f.size === 'number' && f.size > MAX_UPLOAD_BYTES) {
        failures.push({ name: f.name, reason: 'file_too_large' });
        continue;
      }
      // @ts-ignore - File from formData
      const originalBuffer = Buffer.from(await (f as any).arrayBuffer());
      const safeBaseRaw = f.name.replace(/[^a-zA-Z0-9.\-_]/g, '').replace(/\.[^.]+$/, '');
      const safeBase = safeBaseRaw || 'image';
      let buffer = originalBuffer;
      let contentType = f.type;
      let extension = f.name.split('.').pop() || 'bin';

      if (f.type.startsWith('image/')) {
        try {
          buffer = await sharp(originalBuffer)
            .rotate()
            .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer();
          contentType = 'image/webp';
          extension = 'webp';
          if (buffer.length > MAX_OUTPUT_BYTES) {
            buffer = await sharp(originalBuffer)
              .rotate()
              .resize({ width: 1920, withoutEnlargement: true })
              .webp({ quality: 74 })
              .toBuffer();
          }
        } catch (err) {
          console.warn('Image optimization failed, using original file:', (err as Error)?.message || err);
        }
      }

      const name = `${Date.now()}_${Math.random().toString(36).slice(2)}_${safeBase}.${extension}`;
      const path = `listings/${listingId}/${name}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from('listing-images')
        .upload(path, buffer, { cacheControl: '31536000', upsert: false, contentType });
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
