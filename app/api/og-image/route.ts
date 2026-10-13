import { NextRequest, NextResponse } from "next/server";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { rateLimit } from "@/lib/rateLimit";

const siteHost = new URL(getCanonicalSiteUrl()).hostname;
const allowedHosts = new Set([siteHost, "img.cabn.ro", "wqogynlfehnwdlbvquos.supabase.co", "sjxiiqywwmcnluhaijxh.supabase.co"]);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
let configuredImageBase: URL | null = null;
try {
  if (process.env.R2_PUBLIC_BASE_URL) {
    configuredImageBase = new URL(process.env.R2_PUBLIC_BASE_URL);
    if (configuredImageBase.protocol === 'https:') allowedHosts.add(configuredImageBase.hostname);
  }
} catch {
  configuredImageBase = null;
}

function isAllowedImageUrl(url: URL) {
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowedHosts.has(url.hostname)) return false;
  if (url.hostname === siteHost) return url.pathname.startsWith('/images/') || url.pathname === '/fallback.svg';
  if (url.hostname.endsWith('.supabase.co')) return url.pathname.startsWith('/storage/v1/object/public/listing-images/');
  if (configuredImageBase && url.hostname === configuredImageBase.hostname) {
    const prefix = configuredImageBase.pathname.replace(/\/+$/, '') + '/';
    return url.pathname.startsWith(prefix);
  }
  return true;
}

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, { windowMs: 60_000, max: 60, keyPrefix: 'og-image' });
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
  const src = request.nextUrl.searchParams.get("src");
  if (!src) {
    return NextResponse.json({ error: "Missing src query parameter" }, { status: 400 });
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(src);
  } catch {
    return NextResponse.json({ error: "Invalid src URL" }, { status: 400 });
  }

  if (!isAllowedImageUrl(imageUrl)) {
    return NextResponse.json({ error: "Disallowed image host" }, { status: 400 });
  }

  try {
    const upstream = await fetch(imageUrl.toString(), {
      headers: {
        "User-Agent": "cabn-og-image-proxy/1.0",
        Accept: "image/*",
      },
      next: { revalidate: 60 * 60 },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: "Unable to fetch image" }, { status: 502 });
    }

    const contentType = (upstream.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
    const trustedSvg = imageUrl.hostname === siteHost && contentType === 'image/svg+xml';
    if (!ALLOWED_IMAGE_TYPES.has(contentType) && !trustedSvg) {
      await upstream.body?.cancel();
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 });
    }
    const announcedSize = Number(upstream.headers.get('content-length'));
    if (announcedSize > MAX_IMAGE_BYTES) {
      await upstream.body?.cancel();
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }
    const reader = upstream.body?.getReader();
    if (!reader) return NextResponse.json({ error: 'Empty image' }, { status: 502 });
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: 'Image too large' }, { status: 413 });
      }
      chunks.push(value);
    }
    if (!total) return NextResponse.json({ error: 'Empty image' }, { status: 502 });
    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        "X-Robots-Tag": "all",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Unable to fetch image' }, { status: 502 });
  }
}
