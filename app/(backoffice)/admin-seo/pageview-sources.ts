"use server";

import { cookies } from "next/headers";
import type { ViewsWindow } from "@/lib/admin/seoDashboard";
import { getRoleFromEncodedAuth } from "@/lib/draftsAuth";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const ATTRIBUTION_PREFIX = "cabn-attribution:v1?";
const MAX_PAGEVIEWS = 500;
const MAX_SOURCES = 10;
const SITE_HOST = new URL(getCanonicalSiteUrl()).hostname.replace(/^www\./, "");
const WINDOW_HOURS: Record<ViewsWindow, number> = {
  "1h": 1,
  "6h": 6,
  "1d": 24,
  "7d": 7 * 24,
  "30d": 30 * 24,
  "90d": 90 * 24,
  "180d": 180 * 24,
  "365d": 365 * 24,
};

type Source = { source: string; medium: string | null; campaign: string | null; views: number };

function referrerHost(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname.length <= 253) {
      return url.hostname.replace(/^www\./, "");
    }
  } catch {
    // Historical referrers can be empty or malformed.
  }
  return null;
}

function sourceLabel(value: string | null) {
  if (!value) return "Sursă necunoscută";
  const source = value.toLowerCase();
  if (source === SITE_HOST) return "Navigare internă";
  if (source === "google" || /(?:^|\.)google\.(?:com|[a-z]{2}|(?:co|com)\.[a-z]{2})$/.test(source)) {
    return "Google";
  }
  if (/^(?:fb|facebook)$|(?:^|\.)facebook\.com$/.test(source)) return "Facebook";
  if (/^(?:ig|insta|instagram)$|(?:^|\.)instagram\.com$/.test(source)) return "Instagram";
  return source;
}

function utmValue(query: URLSearchParams | null, field: string) {
  return query?.get(field)?.trim().slice(0, 80) || null;
}

export async function getPageviewSources(path: string, viewsWindow: ViewsWindow) {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.length > 300 ||
    typeof viewsWindow !== "string" ||
    !Object.hasOwn(WINDOW_HOURS, viewsWindow)
  ) {
    return null;
  }

  const auth = (await cookies()).get("drafts_auth")?.value;
  if ((await getRoleFromEncodedAuth(auth)) !== "admin") return null;

  const since = new Date(Date.now() - WINDOW_HOURS[viewsWindow] * 60 * 60 * 1000).toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("seo_pageviews")
    .select("referrer")
    .eq("path", path)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(MAX_PAGEVIEWS + 1);

  if (error) return null;

  const groups = new Map<string, Source>();
  let historicalViews = 0;
  const pageviews = data.slice(0, MAX_PAGEVIEWS);
  for (const { referrer } of pageviews) {
    const trackedVisit = referrer?.startsWith(ATTRIBUTION_PREFIX);
    if (!trackedVisit) historicalViews += 1;
    const query = trackedVisit ? new URLSearchParams(referrer.slice(ATTRIBUTION_PREFIX.length)) : null;
    const host = referrerHost(query ? query.get("referrer") : referrer);
    const source = sourceLabel(utmValue(query, "utm_source") ?? host);
    const medium = utmValue(query, "utm_medium");
    const campaign = utmValue(query, "utm_campaign");
    const key = JSON.stringify([source, medium, campaign]);
    const group = groups.get(key);
    if (group) group.views += 1;
    else groups.set(key, { source, medium, campaign, views: 1 });
  }

  const sorted = [...groups.values()].sort((a, b) => b.views - a.views || a.source.localeCompare(b.source, "ro"));
  const sources = sorted.slice(0, MAX_SOURCES);
  const otherViews = sorted.slice(MAX_SOURCES).reduce((total, source) => total + source.views, 0);
  if (otherViews) sources.push({ source: "Alte surse", medium: null, campaign: null, views: otherViews });

  return { sources, total: pageviews.length, historicalViews, limited: data.length > MAX_PAGEVIEWS };
}
