import 'server-only';
import { randomUUID } from 'node:crypto';
import type { getSupabaseAdmin } from '@/lib/supabaseAdmin';

type Database = ReturnType<typeof getSupabaseAdmin>;

export class InstagramPromotionBusyError extends Error {
  readonly status = 503;
  constructor() {
    super('Calendarul Instagram este în curs de actualizare. Reîncearcă în câteva momente.');
  }
}

export async function acquireInstagramPromotionWorkerLock(db: Database, waitMs = 0) {
  const deadline = Date.now() + waitMs;
  do {
    const token = randomUUID();
    const now = new Date();
    const { data, error } = await db.from('social_promotion_worker').update({
      lock_token: token, lock_until: new Date(now.getTime() + 5 * 60_000).toISOString(),
    }).eq('id', 'instagram').or(`lock_token.is.null,lock_until.lt.${now.toISOString()}`).select('id').maybeSingle();
    if (error) throw error;
    if (data) return token;
    const remaining = deadline - Date.now();
    if (remaining <= 0) return null;
    await new Promise((resolve) => setTimeout(resolve, Math.min(remaining, 100 + Math.random() * 150)));
  } while (Date.now() <= deadline);
  return null;
}

export async function releaseInstagramPromotionWorkerLock(db: Database, token: string) {
  const { error } = await db.from('social_promotion_worker').update({ lock_token: null, lock_until: null })
    .eq('id', 'instagram').eq('lock_token', token);
  if (error) throw error;
}

export async function withInstagramPromotionWorkerLock<T>(db: Database, action: () => Promise<T>, waitMs = 20_000): Promise<T> {
  const token = await acquireInstagramPromotionWorkerLock(db, waitMs);
  if (!token) throw new InstagramPromotionBusyError();
  try {
    return await action();
  } finally {
    await releaseInstagramPromotionWorkerLock(db, token);
  }
}
