"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

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

  useEffect(() => {
    if (!pathname) return;
    const payload = {
      path: pathname,
      anonId: getAnonId(),
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    };

    try {
      if (navigator.sendBeacon) {
        const body = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon("/api/pageview", body);
        return;
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
