"use client";

import { useEffect, useState } from 'react';

export function useHash(): string {
  if (typeof window === 'undefined') return '';
  const [hash, setHash] = useState<string>("");
  useEffect(() => {
    const update = () => setHash(window.location.hash || "");
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return hash;
}