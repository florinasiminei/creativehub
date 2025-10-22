"use client";

import Image from "next/image";

export default function LoadingLogo() {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative w-[140px] h-[140px] animate-pulse">
        <Image
          src="/images/iconita.svg"
          alt="CABN.ro se încarcă..."
          fill
          className="object-contain"
          priority
        />
      </div>
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 animate-pulse">
        Se încarcă...
      </p>
    </div>
  );
}
