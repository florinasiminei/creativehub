"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SubmissionNotice() {
  const searchParams = useSearchParams();
  const message =
    searchParams.get("submitted") === "1"
      ? "Proprietatea a fost trimisă spre verificare."
      : searchParams.get("updated") === "1"
      ? "Proprietatea a fost modificată cu succes."
      : "";
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);

  useEffect(() => {
    setDismissedMessage(null);
    if (!message) return;
    const timer = window.setTimeout(() => setDismissedMessage(message), 10_000);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message || dismissedMessage === message) return null;

  return (
    <div role="status" className="fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 shadow-lg flex items-start justify-between gap-3">
      <span>{message}</span>
      <button
        type="button"
        onClick={() => setDismissedMessage(message)}
        className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900"
        aria-label="Închide notificarea"
      >
        ×
      </button>
    </div>
  );
}
