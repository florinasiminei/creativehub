export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';
import { isListingTokenValid } from '@/lib/listingTokens';

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/heic': 'heic',
};

type UploadRequestFile = {
  name: string;
  type?: string;
  size?: number;
  index: number;
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

export async function POST(req: Request) {
  try {
    const limit = rateLimit(req, { windowMs: 60_000, max: 80, keyPrefix: 'listing-upload-sign' });
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const listingId = body?.listingId as string | undefined;
    const startIndex = Number(body?.startIndex || 0) || 0;
    const files = Array.isArray(body?.files) ? (body.files as UploadRequestFile[]) : [];

    if (!listingId) return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });
    if (!files.length) return NextResponse.json({ error: 'Missing files' }, { status: 400 });

    const role = getDraftRoleFromRequest(req);
    const hasRole = role === 'admin' || role === 'staff';
    if (!hasRole) {
      const listingToken = req.headers.get('x-listing-token');
      const ok = await isListingTokenValid(String(listingId), listingToken, supabaseAdmin);
      if (!ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const uploads: Array<{ index: number; path: string; token: string; display_order: number }> = [];
    const failed: Array<{ index: number; name: string; reason: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f || typeof f.index !== 'number') {
        failed.push({ index: -1, name: 'unknown', reason: 'invalid_file' });
        continue;
      }
      if (typeof f.size === 'number' && f.size > MAX_FILE_BYTES) {
        failed.push({ index: f.index, name: f.name, reason: 'file_too_large' });
        continue;
      }

      const base = safeBaseName(f.name || 'image');
      const ext = getExtension(f.name || 'image', f.type);
      const name = `${Date.now()}_${Math.random().toString(36).slice(2)}_${base}.${ext}`;
      const path = `listings/${listingId}/${name}`;

      const { data, error } = await supabaseAdmin.storage
        .from('listing-images')
        .createSignedUploadUrl(path, { upsert: false });
      if (error || !data?.token) {
        failed.push({ index: f.index, name: f.name, reason: error?.message || 'signed_url_failed' });
        continue;
      }

      uploads.push({ index: f.index, path, token: data.token, display_order: startIndex + i });
    }

    return NextResponse.json({ uploads, failed });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
