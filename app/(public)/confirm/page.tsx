import { Suspense } from "react";
import ConfirmClient from "./confirm-client";

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-emerald-50" />}>
      <ConfirmClient />
    </Suspense>
  );
}
