"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackCollectionListingView } from "@/lib/listingJourneyAnalytics";

const VISIT_KEY = "cabn_pageview_visit_v1";
const VISIT_TIMEOUT_MS = 30 * 60 * 1000;
// The Admin SEO report also reads older referrer values that are plain URLs.
const ATTRIBUTION_PREFIX = "cabn-attribution:v1?";
const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign"];

type Visit = { attribution: string; lastSeen: number };

function readVisit(): Visit | null {
  try {
    const visit = JSON.parse(sessionStorage.getItem(VISIT_KEY) ?? "null");
    if (
      typeof visit?.lastSeen === "number" &&
      typeof visit?.attribution === "string" &&
      visit.attribution.startsWith(ATTRIBUTION_PREFIX)
    ) {
      return visit;
    }
  } catch {
    // Keep attribution in memory when session storage is unavailable.
  }
  return null;
}

function getExternalReferrer() {
  if (!document.referrer) return null;

  try {
    const url = new URL(document.referrer);
    const hostname = url.hostname.replace(/^www\./, "");
    if (hostname === window.location.hostname.replace(/^www\./, "")) return null;
    if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
  } catch {
    // An invalid referrer has no attribution value.
  }
  return null;
}

function getVisit(previous: Visit | null, firstPageview: boolean): Visit {
  const now = Date.now();
  const query = new URLSearchParams(window.location.search);
  const attribution = new URLSearchParams();
  for (const field of UTM_FIELDS) {
    const value = query.get(field)?.trim().slice(0, 80);
    if (value) attribution.set(field, value);
  }

  if (!attribution.toString() && previous && now - previous.lastSeen < VISIT_TIMEOUT_MS) {
    return { ...previous, lastSeen: now };
  }

  const referrer = firstPageview ? getExternalReferrer() : null;
  if (referrer) attribution.set("referrer", referrer);
  return { attribution: `${ATTRIBUTION_PREFIX}${attribution}`, lastSeen: now };
}

function getAnonId() {
  try {
    const key = "cabn_anon_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, generated);
    return generated;
  } catch {
    return null;
  }
}

export default function PageviewTracker() {
  const pathname = usePathname();
  const visit = useRef<Visit | null>(null);
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    trackCollectionListingView(pathname, previousPath.current);
    previousPath.current = pathname;

    const firstPageview = visit.current === null;
    const currentVisit = getVisit(visit.current ?? readVisit(), firstPageview);
    visit.current = currentVisit;
    try {
      sessionStorage.setItem(VISIT_KEY, JSON.stringify(currentVisit));
    } catch {
      // The current document still has the attribution in memory.
    }

    const payload = {
      path: pathname,
      anonId: getAnonId(),
      referrer: currentVisit.attribution,
    };

    try {
      if (navigator.sendBeacon) {
        const body = new Blob([JSON.stringify(payload)], { type: "application/json" });
        if (navigator.sendBeacon("/api/pageview", body)) return;
      }
    } catch {
      // fallback below
    }

    fetch("/api/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // ignore analytics failures
    });
  }, [pathname]);

  return null;
}
