"use client";

import Image from "next/image";

export default function LoadingLogo() {
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
      <div className="relative w-[120px] h-[120px] animate-pulse">
        <Image
          src="/images/logo.svg"
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