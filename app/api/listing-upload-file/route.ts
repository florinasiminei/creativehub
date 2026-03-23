export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';
import { isListingTokenValid } from '@/lib/listingTokens';
import { buildListingCardVariantBuffer, toListingCardVariantPath } from '@/lib/server/listingImageVariants';
import {
  createSignedUploadUrl,
  deleteR2Object,
  downloadBufferFromR2,
  getR2PublicUrl,
  uploadBufferToR2,
} from '@/lib/server/r2';

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

function buildListingPath(listingId: string, fileName: string, mime?: string) {
  const base = safeBaseName(fileName || 'image');
  const ext = getExtension(fileName || 'image', mime);
  const name = `${Date.now()}_${Math.random().toString(36).slice(2)}_${base}.${ext}`;
  return `listings/${listingId}/${name}`;
}

async function ensureListingUploadAccess(req: Request, listingId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const role = getDraftRoleFromRequest(req);
  const hasRole = role === 'admin' || role === 'staff';

  if (!hasRole) {
    const listingToken = req.headers.get('x-listing-token');
    const ok = await isListingTokenValid(String(listingId), listingToken, supabaseAdmin);
    if (!ok) {
      return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
  }

  return { supabaseAdmin };
}

async function ensureListingImageCapacity(listingId: string, supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
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

  return null;
}

async function createCardVariant(path: string) {
  try {
    const cardPath = toListingCardVariantPath(path);
    const sourceBuffer = await downloadBufferFromR2(path);
    const cardBuffer = await buildListingCardVariantBuffer(sourceBuffer);
    await uploadBufferToR2(cardPath, cardBuffer, 'image/webp');
  } catch (error) {
    console.warn('[listing-upload-file] card variant processing failed:', (error as Error)?.message || error);
  }
}

async function handlePrepare(req: Request, body: any) {
  const listingId = String(body?.listingId || '').trim();
  const fileName = String(body?.fileName || '').trim();
  const contentType = String(body?.contentType || 'application/octet-stream').trim() || 'application/octet-stream';

  if (!listingId || !fileName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const access = await ensureListingUploadAccess(req, listingId);
  if ('error' in access) return access.error;

  const capacityError = await ensureListingImageCapacity(listingId, access.supabaseAdmin);
  if (capacityError) return capacityError;

  const path = buildListingPath(listingId, fileName, contentType);
  const signed = await createSignedUploadUrl(path, contentType);

  return NextResponse.json({
    path,
    url: getR2PublicUrl(path),
    uploadUrl: signed.uploadUrl,
    uploadHeaders: signed.headers,
    contentType,
  });
}

async function handleComplete(req: Request, body: any) {
  const listingId = String(body?.listingId || '').trim();
  const path = String(body?.path || '').trim();
  const displayOrder = Number(body?.displayOrder);
  const altValue = body?.alt;
  const alt = typeof altValue === 'string' ? altValue : null;

  if (!listingId || !path) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (!path.startsWith(`listings/${listingId}/`)) {
    return NextResponse.json({ error: 'Invalid upload path' }, { status: 400 });
  }

  const access = await ensureListingUploadAccess(req, listingId);
  if ('error' in access) return access.error;

  const capacityError = await ensureListingImageCapacity(listingId, access.supabaseAdmin);
  if (capacityError) return capacityError;

  const url = getR2PublicUrl(path);

  try {
    const variantPromise = createCardVariant(path);
    const insertPromise = access.supabaseAdmin
      .from('listing_images')
      .insert([{ listing_id: listingId, image_url: url, display_order: Number.isFinite(displayOrder) ? displayOrder : null, alt }])
      .select('id, image_url, display_order')
      .single();
    const [{ data: inserted, error: imgErr }] = await Promise.all([insertPromise, variantPromise]);

    if (imgErr || !inserted) {
      throw new Error(imgErr?.message || 'insert_failed');
    }

    return NextResponse.json({ id: String(inserted.id), url, display_order: inserted.display_order });
  } catch (err: any) {
    await Promise.allSettled([
      deleteR2Object(path),
      deleteR2Object(toListingCardVariantPath(path)),
    ]);
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

async function handleLegacyUpload(req: Request) {
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

  const access = await ensureListingUploadAccess(req, listingId);
  if ('error' in access) return access.error;

  const capacityError = await ensureListingImageCapacity(listingId, supabaseAdmin);
  if (capacityError) return capacityError;

  const path = buildListingPath(listingId, fileValue.name || 'image', fileValue.type);
  const sourceBuffer = Buffer.from(await fileValue.arrayBuffer());

  try {
    await uploadBufferToR2(path, sourceBuffer, fileValue.type || 'application/octet-stream');
    const url = getR2PublicUrl(path);
    const variantPromise = createCardVariant(path);
    const insertPromise = supabaseAdmin
      .from('listing_images')
      .insert([{ listing_id: listingId, image_url: url, display_order: Number.isFinite(displayOrder) ? displayOrder : null, alt }])
      .select('id, image_url, display_order')
      .single();
    const [{ data: inserted, error: imgErr }] = await Promise.all([insertPromise, variantPromise]);

    if (imgErr || !inserted) {
      throw new Error(imgErr?.message || 'insert_failed');
    }

    return NextResponse.json({ id: String(inserted.id), url, display_order: inserted.display_order });
  } catch (err: any) {
    await Promise.allSettled([
      deleteR2Object(path),
      deleteR2Object(toListingCardVariantPath(path)),
    ]);
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const limit = rateLimit(req, { windowMs: 60_000, max: 100, keyPrefix: 'listing-upload-file' });
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const requestContentType = req.headers.get('content-type') || '';
    if (requestContentType.includes('application/json')) {
      const body = await req.json().catch(() => null);
      const action = String(body?.action || '').trim();

      if (action === 'prepare') return handlePrepare(req, body);
      if (action === 'complete') return handleComplete(req, body);

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return handleLegacyUpload(req);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
