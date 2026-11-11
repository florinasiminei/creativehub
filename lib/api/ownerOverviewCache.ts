'use client';

import type { OwnerListing } from '@/components/owner/OwnerListingCard';
import type { OwnerClaim } from '@/components/owner/OwnerClaimSection';
import { OwnerRequestError } from '@/lib/ownerPortal';

export type OwnerOverview = {
  user: { email: string | null };
  listings: OwnerListing[];
  claims: OwnerClaim[];
  plan: { name: string; amount: number; currency: string; durationMonths: number } | null;
  instagramPromotionEnabled: boolean;
  instagramPromotionStatusAvailable: boolean;
};

type CacheEntry = {
  data: OwnerOverview | null;
  updatedAt: number;
  revision: number;
  request?: { controller: AbortController; promise: Promise<OwnerOverview> };
};

const CACHE_TTL_MS = 60_000;
const OVERVIEW_TIMEOUT_MS = 25_000;
const entries = new Map<string, CacheEntry>();
let activeOwnerId: string | null = null;

export function clearOwnerOverviewCache() {
  for (const entry of entries.values()) entry.request?.controller.abort();
  entries.clear();
}

export function syncOwnerOverviewCache(ownerId: string | null) {
  if (ownerId === activeOwnerId) return;
  clearOwnerOverviewCache();
  activeOwnerId = ownerId;
}

export function getCachedOwnerOverview(ownerId: string) {
  const entry = entries.get(ownerId);
  if (!entry?.data) return null;
  const age = Date.now() - entry.updatedAt;
  return { data: entry.data, fresh: entry.updatedAt > 0 && age >= 0 && age < CACHE_TTL_MS };
}

export function invalidateOwnerOverview(ownerId: string) {
  const entry = entries.get(ownerId);
  if (!entry) return;
  entry.updatedAt = 0;
  entry.revision += 1;
}

export function loadOwnerOverview(
  ownerId: string,
  fetchOverview: (signal: AbortSignal) => Promise<OwnerOverview>,
): Promise<OwnerOverview> {
  syncOwnerOverviewCache(ownerId);
  let entry = entries.get(ownerId);
  if (!entry) {
    entry = { data: null, updatedAt: 0, revision: 0 };
    entries.set(ownerId, entry);
  }
  if (entry.request) return entry.request.promise;

  const currentEntry = entry;
  currentEntry.updatedAt = 0;
  const controller = new AbortController();
  let onAbort: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    onAbort = () => reject(controller.signal.reason);
    controller.signal.addEventListener('abort', onAbort, { once: true });
  });
  const timeoutId = setTimeout(() => {
    controller.abort(new OwnerRequestError(
      'Încărcarea contului durează prea mult. Încearcă din nou.', 504, 'OWNER_PORTAL_TIMEOUT',
    ));
  }, OVERVIEW_TIMEOUT_MS);

  // The request belongs to the cache, so navigating away only detaches the page.
  const result = Promise.resolve().then(async () => {
    while (true) {
      controller.signal.throwIfAborted();
      const revision = currentEntry.revision;
      const data = await fetchOverview(controller.signal);
      controller.signal.throwIfAborted();
      // A mutation during the read needs a new read before the cache becomes fresh.
      if (revision !== currentEntry.revision) continue;
      currentEntry.data = data;
      currentEntry.updatedAt = Date.now();
      return data;
    }
  });
  const promise = Promise.race([result, cancelled]).finally(() => {
    clearTimeout(timeoutId);
    if (onAbort) controller.signal.removeEventListener('abort', onAbort);
    if (currentEntry.request?.controller === controller) currentEntry.request = undefined;
  });
  currentEntry.request = { controller, promise };
  return promise;
}
