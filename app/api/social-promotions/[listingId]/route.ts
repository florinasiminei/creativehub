import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { resolveListingAccess } from '@/lib/server/ownerAuth';
import { rateLimit } from '@/lib/rateLimit';
import {
  approveInstagramPromotion, changeInstagramPromotion, estimateInstagramDate, getInstagramPromotion, getPromotionSource,
  instagramPromotionEnabled, PromotionError, promotionSourceIsCurrent, saveInstagramDraft,
} from '@/lib/server/instagramPromotions';
import { promotionFailure, promotionJson, readPromotionBody } from '@/lib/server/instagramPromotionHttp';
import { queueInstagramPromotionSync } from '@/lib/server/instagramPromotionConfig';
import type { InstagramPromotion } from '@/lib/social/instagram';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 180;
type Context = { params: Promise<{ listingId: string }> };

async function accessPromotion(request: Request, context: Context) {
  const { listingId } = await context.params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(listingId)) throw new PromotionError('Cazare invalidă.');
  const db = getSupabaseAdmin();
  const access = await resolveListingAccess(request, listingId, db);
  if (!access.authorized || access.kind === 'legacy-token') throw new PromotionError('Confirmă contul pentru a continua.', 401);
  const source = await getPromotionSource(db, listingId);
  if (access.kind === 'owner' && source.ownerId !== access.ownerId) throw new PromotionError('Accesul la cazare s-a schimbat.', 403);
  return { db, access, source };
}

async function promotionResponse(
  db: ReturnType<typeof getSupabaseAdmin>, source: Awaited<ReturnType<typeof getPromotionSource>>, promotion: InstagramPromotion | null,
) {
  let estimatedFor: string | null = null;
  try { estimatedFor = await estimateInstagramDate(db, source, promotion); }
  catch { console.warn('[instagram-promotion] Date estimate is unavailable', { listingId: source.id }); }
  return promotionJson({ source, promotion, sourceCurrent: !promotion || promotionSourceIsCurrent(source, promotion), estimatedFor });
}

export async function GET(request: Request, context: Context) {
  try {
    const { db, source } = await accessPromotion(request, context);
    const promotion = await getInstagramPromotion(db, source.id);
    if (!instagramPromotionEnabled() && !promotion) throw new PromotionError('Promovarea Instagram nu este încă disponibilă.', 503);
    return await promotionResponse(db, source, promotion);
  } catch (error) { return promotionFailure(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    const { db, access, source } = await accessPromotion(request, context);
    const limit = rateLimit(request, { windowMs: 60_000, max: 12, keyPrefix: `instagram-promotion-${source.id}` });
    if (!limit.ok) return promotionJson({ error: 'Prea multe modificări. Reîncearcă într-un minut.' }, 429);
    const body = await readPromotionBody(request);
    if (!instagramPromotionEnabled() && !['withdraw', 'pause'].includes(String(body.action))) {
      throw new PromotionError('Promovarea Instagram nu este încă disponibilă.', 503);
    }
    const actor = access.kind === 'owner' ? access.ownerId : 'staff';
    if (body.action === 'save') {
      const promotion = await saveInstagramDraft(db, source, body, actor);
      return await promotionResponse(db, source, promotion);
    }
    if (body.action === 'approve') {
      if (access.kind !== 'owner' || body.consent !== true) throw new PromotionError('Acordul trebuie dat de proprietarul cazării.', 403);
      const existing = await getInstagramPromotion(db, source.id);
      if (!existing || existing.content_hash !== body.contentHash) throw new PromotionError('Preview-ul s-a schimbat. Reîncarcă versiunea finală.', 409);
      const promotion = await approveInstagramPromotion(db, source, body.revision, access.ownerId);
      // Publishing stays disabled until explicitly activated in server configuration.
      queueInstagramPromotionSync(source.id);
      return await promotionResponse(db, source, promotion);
    }
    if (!['withdraw', 'pause', 'resume', 'reschedule'].includes(String(body.action))) throw new PromotionError('Acțiune invalidă.');
    if (access.kind === 'owner' && body.action !== 'withdraw') throw new PromotionError('Acțiune rezervată echipei CABN.', 403);
    const existing = await getInstagramPromotion(db, source.id);
    if (!existing) throw new PromotionError('Postarea nu a fost găsită.', 404);
    const promotion = await changeInstagramPromotion(db, existing, body.action as 'withdraw' | 'pause' | 'resume' | 'reschedule', body.revision, actor, body.preferredDate);
    return await promotionResponse(db, source, promotion);
  } catch (error) { return promotionFailure(error); }
}
