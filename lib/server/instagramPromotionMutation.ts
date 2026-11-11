import 'server-only';
import type { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { promotionWeek, type InstagramPromotion } from '@/lib/social/instagram';
import { BufferRequestError, getBufferPost, pauseBufferInstagramPost } from '@/lib/server/bufferInstagram';
import { instagramPromotionEnabled } from '@/lib/server/instagramPromotionConfig';
import { InstagramPromotionBusyError, withInstagramPromotionWorkerLock } from '@/lib/server/instagramPromotionLock';
import { claimInstagramPromotion, finishInstagramPromotion, getInstagramPromotion, PromotionError } from '@/lib/server/instagramPromotions';

type Database = ReturnType<typeof getSupabaseAdmin>;
type Options = { actor?: string; shouldInvalidate?: () => Promise<boolean> };

export function getInstagramSourceMutationFailure(error: unknown) {
  return error instanceof PromotionError ? { message: error.message, status: error.status } : null;
}

export async function withInstagramSourceMutation<T>(db: Database, listingId: string, mutation: () => Promise<T>, options: Options = {}): Promise<T> {
  let mutationStarted = false;
  const runMutation = () => { mutationStarted = true; return mutation(); };
  try {
    return await withInstagramPromotionWorkerLock(db, async () => {
      if (options.shouldInvalidate && !await options.shouldInvalidate()) return runMutation();
      const promotion = await getInstagramPromotion(db, listingId);
      if (!promotion || promotion.status === 'published') return runMutation();

      let locked: InstagramPromotion | null = await claimInstagramPromotion(db, promotion, promotion.revision, options.actor || 'system');
      let failed = false;
      try {
        if (locked.buffer_post_id) {
          const remote = await getBufferPost(locked.buffer_post_id);
          if (!remote) throw new PromotionError('Programarea Instagram nu poate fi verificată. Reîncearcă după verificarea calendarului.', 503);
          if (remote.status === 'sending') throw new PromotionError('Postarea Instagram este în curs de publicare. Reîncearcă în câteva momente.', 409);
          if (remote.status === 'sent') {
            const postedFor = remote.dueAt || remote.sentAt || locked.scheduled_for;
            await finishInstagramPromotion(db, locked, {
              status: 'published', published_at: remote.sentAt || new Date().toISOString(), external_url: remote.externalLink,
              scheduled_for: postedFor, scheduled_week: postedFor ? promotionWeek(new Date(postedFor)) : locked.scheduled_week,
              preferred_date: null, last_error: null,
            });
            locked = null;
            return await runMutation();
          }
          await pauseBufferInstagramPost(locked.buffer_post_id);
        }

        // Keep the campaign lock until all source writes finish. The durable flag
        // also prevents scheduling after a process interruption and lease expiry.
        const { data, error } = await db.from('social_promotions').update({
          needs_reapproval: true,
          status: locked.approved_at || locked.buffer_post_id ? 'paused' : locked.status,
          scheduled_for: null, scheduled_week: null, preferred_date: null,
          last_error: null,
        }).eq('id', locked.id).eq('lock_token', locked.lock_token).select('*').maybeSingle();
        if (error) throw error;
        if (!data) throw new PromotionError('Postarea Instagram este procesată. Reîncearcă în câteva momente.', 409);
        locked = data as InstagramPromotion;
        return await runMutation();
      } catch (error) {
        failed = true;
        throw error;
      } finally {
        if (locked) {
          try { await finishInstagramPromotion(db, locked, {}); }
          catch (error) {
            if (!failed) throw error;
            console.error('[instagram-promotion] Source mutation lock release needs attention', { listingId });
          }
        }
      }
    });
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (!mutationStarted && !instagramPromotionEnabled() && ['42P01', 'PGRST205'].includes(code)) return runMutation();
    if (error instanceof InstagramPromotionBusyError || error instanceof BufferRequestError) {
      throw new PromotionError(error.message, 503);
    }
    throw error;
  }
}
