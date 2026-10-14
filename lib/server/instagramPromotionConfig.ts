import 'server-only';
import { after } from 'next/server';

export function instagramPromotionEnabled() {
  const configured = process.env.INSTAGRAM_PROMOTION_ENABLED;
  return configured === undefined ? process.env.NODE_ENV === 'development' : configured === 'true';
}

export function instagramPromotionConfiguration() {
  return {
    enabled: instagramPromotionEnabled(),
    publishingEnabled: process.env.INSTAGRAM_PROMOTION_PUBLISHING_ENABLED === 'true',
    bufferConfigured: Boolean(process.env.BUFFER_API_KEY?.trim() && process.env.BUFFER_INSTAGRAM_CHANNEL_ID?.trim()),
    cronConfigured: Boolean(process.env.INSTAGRAM_PROMOTION_CRON_SECRET?.trim()),
  };
}

export function queueInstagramPromotionSync(listingId: string) {
  const config = instagramPromotionConfiguration();
  if (!config.enabled || !config.publishingEnabled) return;
  // The daily authenticated worker also recovers missed/interrupted callbacks.
  after(async () => {
    try {
      const { processInstagramPromotions } = await import('@/lib/server/instagramPromotions');
      await processInstagramPromotions(listingId);
    } catch { console.error('[instagram-promotion] Listing synchronization needs attention', { listingId }); }
  });
}
