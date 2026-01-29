import { Suspense } from "react";
import HomeClient from "./home-client";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent" />}>
      <HomeClient />
    </Suspense>
  );
}
