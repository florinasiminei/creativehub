import { Suspense } from "react";
import type { Metadata } from "next";
import DraftsLoginClient from "./drafts-login-client";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  manifest: "/drafts.webmanifest",
  appleWebApp: {
    title: "cabn Admin",
  },
};

export default function DraftsLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-emerald-50 dark:bg-zinc-950" />}>
      <DraftsLoginClient />
    </Suspense>
  );
}
