import { timingSafeEqual } from 'node:crypto';
import { processInstagramPromotions } from '@/lib/server/instagramPromotions';
import { promotionFailure, promotionJson } from '@/lib/server/instagramPromotionHttp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 180;

export async function GET(request: Request) {
  const expected = process.env.INSTAGRAM_PROMOTION_CRON_SECRET?.trim();
  const actual = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected || '');
  if (!expected || actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    return promotionJson({ error: 'Unauthorized' }, 401);
  }
  try { return promotionJson(await processInstagramPromotions()); }
  catch (error) { return promotionFailure(error); }
}
