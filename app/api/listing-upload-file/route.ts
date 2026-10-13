export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { LISTING_SUBMISSION_LIMITS } from '@/lib/listings/listingSubmissionRules';
import { buildListingCardVariantBuffer, toListingCardVariantPath } from '@/lib/server/listingImageVariants';
import {
  invalidateSubmittedOwnerListing,
  resolveListingAccess,
} from '@/lib/server/ownerAuth';
import {
  createSignedUploadUrl,
  deleteR2Object,
  downloadBufferFromR2,
  getR2PublicUrl,
  getR2ObjectMetadata,
  uploadBufferToR2,
} from '@/lib/server/r2';

const MAX_FILE_BYTES = LISTING_SUBMISSION_LIMITS.maxImageBytes;
const MAX_LISTING_IMAGES = LISTING_SUBMISSION_LIMITS.maxImages;

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};
const ALLOWED_IMAGE_TYPES = new Set(Object.keys(MIME_EXT));

function normalizeContentType(value: unknown) {
  return String(value || '').split(';', 1)[0].trim().toLowerCase();
}

function parseFileSize(value: unknown) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function getFileValidationError(contentType: string, fileSize: number | null) {
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return 'Tip de fisier neacceptat. Foloseste JPEG, PNG, WebP sau AVIF.';
  }
  if (fileSize === null) {
    return 'Dimensiunea fisierului este invalida.';
  }
  if (fileSize > MAX_FILE_BYTES) {
    return 'Fisier prea mare. Dimensiunea maxima este 15 MB.';
  }
  return null;
}

function getUploadFailure(error: unknown) {
  const message =
    error instanceof Error ? error.message : 'Uploadul imaginii a esuat.';
  if (/maximum 30 de imagini|maximum 30 imagini/i.test(message)) {
    return { message: 'Poti incarca maximum 30 de imagini.', status: 400 };
  }
  if (/proprietarul s-a schimbat/i.test(message)) {
    return {
      message: 'Accesul la proprietate s-a schimbat. Reincarca pagina.',
      status: 409,
    };
  }
  if (/unsupported image|invalid image|corrupt|bad seek|input buffer/i.test(message)) {
    return {
      message: 'Fisierul nu contine o imagine valida.',
      status: 400,
    };
  }
  return { message: 'Uploadul imaginii nu a putut fi finalizat.', status: 500 };
}

function safeBaseName(name: string) {
  const base = name.replace(/[^a-zA-Z0-9.\-_]/g, '').replace(/\.[^.]+$/, '');
  return base || 'image';
}

function getExtension(name: string, mime?: string) {
  if (mime && MIME_EXT[mime]) return MIME_EXT[mime];
  const raw = name.split('.').pop();
  if (raw && raw.length <= 5) return raw.toLowerCase();
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
  const access = await resolveListingAccess(req, String(listingId), supabaseAdmin);
  if (!access.authorized) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { supabaseAdmin, access };
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
  const cardPath = toListingCardVariantPath(path);
  const sourceBuffer = await downloadBufferFromR2(path);
  const cardBuffer = await buildListingCardVariantBuffer(sourceBuffer);
  await uploadBufferToR2(cardPath, cardBuffer, 'image/webp');
}

async function validateStoredImage(path: string, expectedContentType: string, expectedFileSize: number) {
  try {
    const metadata = await getR2ObjectMetadata(path);
    const storedContentType = normalizeContentType(metadata.contentType);
    const storedFileSize = metadata.contentLength;

    if (!ALLOWED_IMAGE_TYPES.has(storedContentType) || storedContentType !== expectedContentType) {
      return 'Tipul fisierului incarcat nu corespunde uploadului pregatit.';
    }
    if (
      typeof storedFileSize !== 'number'
      || storedFileSize <= 0
      || storedFileSize > MAX_FILE_BYTES
      || storedFileSize !== expectedFileSize
    ) {
      return 'Dimensiunea fisierului incarcat nu corespunde uploadului pregatit.';
    }
    return null;
  } catch {
    return 'Fisierul incarcat nu a putut fi verificat.';
  }
}

async function deleteInvalidUnpersistedUpload(
  path: string,
  listingId: string,
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
) {
  const url = getR2PublicUrl(path);
  const { data, error } = await supabaseAdmin
    .from('listing_images')
    .select('id')
    .eq('listing_id', listingId)
    .eq('image_url', url)
    .limit(1)
    .maybeSingle();

  if (error || data) return;
  await Promise.allSettled([
    deleteR2Object(path),
    deleteR2Object(toListingCardVariantPath(path)),
  ]);
}

async function handlePrepare(req: Request, body: any) {
  const listingId = String(body?.listingId || '').trim();
  const fileName = String(body?.fileName || '').trim();
  const contentType = normalizeContentType(body?.contentType);
  const fileSize = parseFileSize(body?.fileSize);

  if (!listingId || !fileName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const validationError = getFileValidationError(contentType, fileSize);
  if (validationError || fileSize === null) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const access = await ensureListingUploadAccess(req, listingId);
  if ('error' in access) return access.error;

  const capacityError = await ensureListingImageCapacity(listingId, access.supabaseAdmin);
  if (capacityError) return capacityError;

  const path = buildListingPath(listingId, fileName, contentType);
  const signed = await createSignedUploadUrl(path, contentType, 300, fileSize);

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
  const contentType = normalizeContentType(body?.contentType);
  const fileSize = parseFileSize(body?.fileSize);
  const displayOrder = Number(body?.displayOrder);
  const altValue = body?.alt;
  const alt = typeof altValue === 'string' ? altValue.slice(0, 500) : null;

  if (!listingId || !path) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (!path.startsWith(`listings/${listingId}/`)) {
    return NextResponse.json({ error: 'Invalid upload path' }, { status: 400 });
  }

  const validationError = getFileValidationError(contentType, fileSize);
  if (validationError || fileSize === null) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const access = await ensureListingUploadAccess(req, listingId);
  if ('error' in access) return access.error;

  const storedImageError = await validateStoredImage(path, contentType, fileSize);
  if (storedImageError) {
    await deleteInvalidUnpersistedUpload(path, listingId, access.supabaseAdmin);
    return NextResponse.json({ error: storedImageError }, { status: 400 });
  }

  const capacityError = await ensureListingImageCapacity(listingId, access.supabaseAdmin);
  if (capacityError) return capacityError;

  if (access.access.kind === 'owner') {
    await invalidateSubmittedOwnerListing(
      access.supabaseAdmin,
      listingId,
      access.access.ownerId
    );
  }

  const url = getR2PublicUrl(path);
  let imageRegistered = false;

  try {
    await createCardVariant(path);
    const normalizedDisplayOrder =
      Number.isInteger(displayOrder) &&
      displayOrder >= 0 &&
      displayOrder < MAX_LISTING_IMAGES
        ? displayOrder
        : null;
    const { data: insertedRows, error: imgErr } =
      await access.supabaseAdmin.rpc('register_listing_image', {
        p_listing_id: listingId,
        p_image_url: url,
        p_display_order: normalizedDisplayOrder,
        p_alt: alt,
        p_expected_owner_id:
          access.access.kind === 'owner'
            ? access.access.ownerId
            : null,
      });
    const inserted = Array.isArray(insertedRows)
      ? insertedRows[0]
      : insertedRows;

    if (imgErr || !inserted) {
      throw new Error(imgErr?.message || 'insert_failed');
    }
    imageRegistered = true;
    revalidatePath('/', 'layout');

    if (access.access.kind === 'owner') {
      await invalidateSubmittedOwnerListing(
        access.supabaseAdmin,
        listingId,
        access.access.ownerId
      );
    }

    return NextResponse.json({
      id: String(inserted.image_id),
      url,
      display_order: inserted.display_order,
    });
  } catch (err: any) {
    if (!imageRegistered) {
      await Promise.allSettled([
        deleteR2Object(path),
        deleteR2Object(toListingCardVariantPath(path)),
      ]);
    }
    console.error(err);
    const failure = getUploadFailure(err);
    return NextResponse.json(
      { error: failure.message },
      { status: failure.status }
    );
  }
}

async function handleLegacyUpload(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const form = await req.formData();
  const listingId = String(form.get('listingId') || '').trim();
  const displayOrder = Number(form.get('displayOrder'));
  const altValue = form.get('alt');
  const alt = typeof altValue === 'string' ? altValue.slice(0, 500) : null;
  const fileValue = form.get('file');

  if (!listingId || !(fileValue instanceof File)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const contentType = normalizeContentType(fileValue.type);
  const fileSize = parseFileSize(fileValue.size);
  const validationError = getFileValidationError(contentType, fileSize);
  if (validationError || fileSize === null) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const access = await ensureListingUploadAccess(req, listingId);
  if ('error' in access) return access.error;

  const capacityError = await ensureListingImageCapacity(listingId, supabaseAdmin);
  if (capacityError) return capacityError;

  if (access.access.kind === 'owner') {
    await invalidateSubmittedOwnerListing(
      supabaseAdmin,
      listingId,
      access.access.ownerId
    );
  }

  const path = buildListingPath(listingId, fileValue.name || 'image', contentType);
  const sourceBuffer = Buffer.from(await fileValue.arrayBuffer());
  let imageRegistered = false;

  try {
    await uploadBufferToR2(path, sourceBuffer, contentType);
    const storedImageError = await validateStoredImage(path, contentType, fileSize);
    if (storedImageError) {
      await deleteInvalidUnpersistedUpload(path, listingId, supabaseAdmin);
      return NextResponse.json({ error: storedImageError }, { status: 400 });
    }
    const url = getR2PublicUrl(path);
    await createCardVariant(path);
    const normalizedDisplayOrder =
      Number.isInteger(displayOrder) &&
      displayOrder >= 0 &&
      displayOrder < MAX_LISTING_IMAGES
        ? displayOrder
        : null;
    const { data: insertedRows, error: imgErr } =
      await supabaseAdmin.rpc('register_listing_image', {
        p_listing_id: listingId,
        p_image_url: url,
        p_display_order: normalizedDisplayOrder,
        p_alt: alt,
        p_expected_owner_id:
          access.access.kind === 'owner'
            ? access.access.ownerId
            : null,
      });
    const inserted = Array.isArray(insertedRows)
      ? insertedRows[0]
      : insertedRows;

    if (imgErr || !inserted) {
      throw new Error(imgErr?.message || 'insert_failed');
    }
    imageRegistered = true;
    revalidatePath('/', 'layout');

    if (access.access.kind === 'owner') {
      await invalidateSubmittedOwnerListing(
        supabaseAdmin,
        listingId,
        access.access.ownerId
      );
    }

    return NextResponse.json({
      id: String(inserted.image_id),
      url,
      display_order: inserted.display_order,
    });
  } catch (err: any) {
    if (!imageRegistered) {
      await Promise.allSettled([
        deleteR2Object(path),
        deleteR2Object(toListingCardVariantPath(path)),
      ]);
    }
    console.error(err);
    const failure = getUploadFailure(err);
    return NextResponse.json(
      { error: failure.message },
      { status: failure.status }
    );
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
    return NextResponse.json({ error: "Cererea nu a putut fi procesata. Incearca din nou." }, { status: 500 });
  }
}
