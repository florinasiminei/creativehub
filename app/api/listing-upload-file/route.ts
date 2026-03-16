export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';
import { isListingTokenValid } from '@/lib/listingTokens';
import { buildListingCardVariantBuffer, toListingCardVariantPath } from '@/lib/server/listingImageVariants';
import { getR2PublicUrl, uploadBufferToR2 } from '@/lib/server/r2';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_LISTING_IMAGES = 20;

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/heic': 'heic',
};

function safeBaseName(name: string) {
  const base = name.replace(/[^a-zA-Z0-9.\-_]/g, '').replace(/\.[^.]+$/, '');
  return base || 'image';
}

function getExtension(name: string, mime?: string) {
  const raw = name.split('.').pop();
  if (raw && raw.length <= 5) return raw.toLowerCase();
  if (mime && MIME_EXT[mime]) return MIME_EXT[mime];
  return 'bin';
}

async function createCardVariant(path: string, sourceBuffer: Buffer) {
  try {
    const cardPath = toListingCardVariantPath(path);
    const cardBuffer = await buildListingCardVariantBuffer(sourceBuffer);
    await uploadBufferToR2(cardPath, cardBuffer, 'image/webp');
  } catch (error) {
    console.warn('[listing-upload-file] card variant processing failed:', (error as Error)?.message || error);
  }
}

export async function POST(req: Request) {
  try {
    const limit = rateLimit(req, { windowMs: 60_000, max: 40, keyPrefix: 'listing-upload-file' });
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const form = await req.formData();
    const listingId = String(form.get('listingId') || '').trim();
    const displayOrder = Number(form.get('displayOrder'));
    const altValue = form.get('alt');
    const alt = typeof altValue === 'string' ? altValue : null;
    const fileValue = form.get('file');

    if (!listingId || !(fileValue instanceof File)) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (typeof fileValue.size === 'number' && fileValue.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Fisier prea mare.' }, { status: 400 });
    }

    const role = getDraftRoleFromRequest(req);
    const hasRole = role === 'admin' || role === 'staff';
    if (!hasRole) {
      const listingToken = req.headers.get('x-listing-token');
      const ok = await isListingTokenValid(String(listingId), listingToken, supabaseAdmin);
      if (!ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { count: existingCount } = await supabaseAdmin
      .from('listing_images')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId);
    if ((existingCount || 0) >= MAX_LISTING_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_LISTING_IMAGES} imagini per listare.` },
        { status: 400 }
      );
    }

    const base = safeBaseName(fileValue.name || 'image');
    const ext = getExtension(fileValue.name || 'image', fileValue.type);
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}_${base}.${ext}`;
    const path = `listings/${listingId}/${name}`;
    const sourceBuffer = Buffer.from(await fileValue.arrayBuffer());

    await uploadBufferToR2(path, sourceBuffer, fileValue.type || 'application/octet-stream');
    await createCardVariant(path, sourceBuffer);

    const url = getR2PublicUrl(path);
    const { data: inserted, error: imgErr } = await supabaseAdmin
      .from('listing_images')
      .insert([{ listing_id: listingId, image_url: url, display_order: Number.isFinite(displayOrder) ? displayOrder : null, alt }])
      .select('id, image_url, display_order')
      .single();
    if (imgErr || !inserted) {
      return NextResponse.json({ error: imgErr?.message || 'insert_failed' }, { status: 500 });
    }

    return NextResponse.json({ id: String(inserted.id), url, display_order: inserted.display_order });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
