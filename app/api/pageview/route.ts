import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimit } from "@/lib/rateLimit";

const SKIP_PREFIXES = [
  "/api",
  "/drafts",
  "/drafts-login",
  "/admin-seo",
  "/add-property",
  "/edit-property",
  "/confirm",
  "/maintenance",
];

function isBot(ua: string) {
  const lower = ua.toLowerCase();
  return (
    lower.includes("bot") ||
    lower.includes("crawl") ||
    lower.includes("spider") ||
    lower.includes("headless") ||
    lower.includes("lighthouse")
  );
}

export async function POST(request: Request) {
  try {
    const limit = rateLimit(request, { windowMs: 60_000, max: 180, keyPrefix: "pageview" });
    if (!limit.ok) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const path = String(body?.path || "").trim();
    const anonId = String(body?.anonId || "").trim() || null;
    const referrer = String(body?.referrer || "").trim() || null;
    const userAgent = String(request.headers.get("user-agent") || "").trim() || null;

    if (!path || !path.startsWith("/") || path.length > 300) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    if (SKIP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return NextResponse.json({ ok: true });
    }

    if (userAgent && isBot(userAgent)) {
      return NextResponse.json({ ok: true });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from("seo_pageviews").insert({
      path,
      anon_id: anonId,
      referrer,
      user_agent: userAgent,
    });

    if (error) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
