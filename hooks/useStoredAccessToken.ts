'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type UseStoredAccessTokenOptions = {
  queryToken: string | null;
  storageKey: string;
  cleanupPath: string;
  stripQueryToken?: boolean;
  queryParamKey?: string;
};

export default function useStoredAccessToken({
  queryToken,
  storageKey,
  cleanupPath,
  stripQueryToken = true,
  queryParamKey = 'token',
}: UseStoredAccessTokenOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(queryToken);
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (queryToken) {
      setToken(queryToken);
      try {
        sessionStorage.setItem(storageKey, queryToken);
      } catch {
        // Ignore storage errors.
      }

      if (stripQueryToken) {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete(queryParamKey);
        const nextQuery = nextParams.toString();
        router.replace(nextQuery ? `${cleanupPath}?${nextQuery}` : cleanupPath);
      }

      setTokenReady(true);
      return;
    }

    if (!token) {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) setToken(stored);
      } catch {
        // Ignore storage errors.
      }
    }

    setTokenReady(true);
  }, [cleanupPath, queryParamKey, queryToken, router, searchParams, storageKey, stripQueryToken, token]);

  return {
    token,
    setToken,
    tokenReady,
  };
}
