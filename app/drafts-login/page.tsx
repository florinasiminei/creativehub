import { Suspense } from "react";
import DraftsLoginClient from "./drafts-login-client";

export default function DraftsLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-emerald-50 dark:bg-zinc-950" />}>
      <DraftsLoginClient />
    </Suspense>
  );
}
