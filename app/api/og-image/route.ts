import { NextRequest, NextResponse } from "next/server";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";

const siteHost = new URL(getCanonicalSiteUrl()).hostname;
const allowedHosts = new Set([siteHost, "wqogynlfehnwdlbvquos.supabase.co"]);

export async function GET(request: NextRequest) {
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

  if (!["http:", "https:"].includes(imageUrl.protocol) || !allowedHosts.has(imageUrl.hostname)) {
    return NextResponse.json({ error: "Disallowed image host" }, { status: 400 });
  }

  const upstream = await fetch(imageUrl.toString(), {
    headers: {
      "User-Agent": "cabn-og-image-proxy/1.0",
      Accept: "image/*",
    },
    next: { revalidate: 60 * 60 },
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: "Unable to fetch image" }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      "X-Robots-Tag": "all",
    },
  });
}
