import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  INSTAGRAM_CONSENT, INSTAGRAM_CONSENT_VERSION, INSTAGRAM_MAX_CAPTION, INSTAGRAM_MAX_IMAGES,
  canApproveInstagramPromotion, instagramSlotOnDate, nextInstagramSlot, promotionWeek,
  type InstagramPromotion, type PromotionImage, type PromotionSource,
} from '@/lib/social/instagram';
import { renderInstagramImages } from '@/lib/server/instagramMedia';
import { createBufferInstagramDraft, getBufferInstagramChannel, getBufferPost, pauseBufferInstagramPost, scheduleBufferInstagramPost, type BufferPost } from '@/lib/server/bufferInstagram';
import { instagramPromotionConfiguration } from '@/lib/server/instagramPromotionConfig';
export { instagramPromotionEnabled, instagramPromotionConfiguration } from '@/lib/server/instagramPromotionConfig';

type Database = ReturnType<typeof getSupabaseAdmin>;
type Source = PromotionSource & { fingerprint: string; activeUntil: string | null };
type SourceRow = {
  id: string; owner_id: string | null; title: string; slug: string | null; type: string;
  judet: string | null; city: string | null; sat: string | null; capacity: string; price: string;
  description: string | null; camere: number | null; paturi: number | null; bai: number | null;
  is_published: boolean; publication_status: string | null; publication_expires_at: string | null;
  listing_images: Array<{ id: string; image_url: string; display_order: number | null }>;
  listing_facilities: Array<{ facilities: { name: string } | Array<{ name: string }> | null }>;
};

export class PromotionError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

export async function getPromotionSource(db: Database, listingId: string): Promise<Source> {
  const { data, error } = await db.from('listings').select(
    'id, owner_id, title, slug, type, judet, city, sat, capacity, price, description, camere, paturi, bai, is_published, publication_status, publication_expires_at, listing_images(id, image_url, display_order), listing_facilities(facilities(name))',
  ).eq('id', listingId).maybeSingle();
  if (error) throw error;
  if (!data) throw new PromotionError('Cazarea nu mai este disponibilă.', 404);
  const row = data as unknown as SourceRow;
  const facilities = row.listing_facilities.flatMap((item) => {
    const values = Array.isArray(item.facilities) ? item.facilities : item.facilities ? [item.facilities] : [];
    return values.map((facility) => facility.name);
  }).sort();
  const images = [...row.listing_images].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .filter((image) => image.image_url).map((image) => ({ id: image.id, url: image.image_url }));
  const publicContent = [row.title, row.type, row.judet, row.city, row.sat, row.capacity,
    row.price, row.description, row.camere, row.paturi, row.bai, row.owner_id, facilities];
  return {
    id: row.id, ownerId: row.owner_id || '', title: row.title,
    location: [row.sat, row.city, row.judet].filter(Boolean).join(', '), capacity: row.capacity,
    facilities, images, isPublished: row.is_published, activeUntil: row.publication_expires_at,
    eligible: row.is_published && ['active', 'expiring'].includes(row.publication_status || '')
      && (!row.publication_expires_at || Date.parse(row.publication_expires_at) > Date.now()),
    fingerprint: hash(publicContent),
  };
}

function sourceHash(source: Source, images: PromotionImage[]) {
  return hash([source.fingerprint, images.map((image) => [image.imageId, source.images.find((item) => item.id === image.imageId)?.url])]);
}

export function promotionSourceIsCurrent(source: Source, promotion: InstagramPromotion) {
  return !promotion.needs_reapproval && source.ownerId === promotion.owner_id
    && promotion.images.every((image) => source.images.some((item) => item.id === image.imageId))
    && sourceHash(source, promotion.images) === promotion.source_hash;
}

const sourceMatches = promotionSourceIsCurrent;

export async function getInstagramPromotion(db: Database, listingId: string) {
  const { data, error } = await db.from('social_promotions').select('*').eq('listing_reference', listingId).eq('platform', 'instagram').maybeSingle();
  if (error) throw error;
  return data as InstagramPromotion | null;
}

function validateDraft(caption: unknown, images: unknown, source: Source) {
  if (typeof caption !== 'string' || !caption.trim() || caption.trim().length > INSTAGRAM_MAX_CAPTION) {
    throw new PromotionError('Textul trebuie să conțină între 1 și 2.200 de caractere.');
  }
  if (!Array.isArray(images) || images.length < 1 || images.length > INSTAGRAM_MAX_IMAGES) {
    throw new PromotionError('Selectează între 1 și 5 fotografii.');
  }
  const positions = ['centre', 'north', 'south', 'east', 'west'];
  const selected: PromotionImage[] = images.map((image: unknown) => {
    if (!image || typeof image !== 'object' || !('imageId' in image) || !('position' in image)
      || typeof image.imageId !== 'string' || typeof image.position !== 'string'
      || !positions.includes(image.position) || !source.images.some((item) => item.id === image.imageId)) {
      throw new PromotionError('Selecția fotografiilor nu este validă. Reîncarcă galeria.');
    }
    return { imageId: image.imageId, position: image.position as PromotionImage['position'] };
  });
  if (new Set(selected.map((image) => image.imageId)).size !== selected.length) throw new PromotionError('Fotografiile trebuie să fie diferite.');
  return { caption: caption.trim(), images: selected };
}

async function claim(db: Database, promotion: InstagramPromotion, revision: unknown, actor: string) {
  if (revision !== promotion.revision) throw new PromotionError('Postarea s-a modificat. Reîncarcă preview-ul.', 409);
  const now = new Date();
  const token = randomUUID();
  const { data, error } = await db.from('social_promotions').update({
    lock_token: token, lock_until: new Date(now.getTime() + 5 * 60_000).toISOString(), last_actor: actor,
  }).eq('id', promotion.id).eq('revision', promotion.revision)
    .or(`lock_token.is.null,lock_until.lt.${now.toISOString()}`).select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw new PromotionError('Postarea este procesată. Reîncearcă în câteva momente.', 409);
  return data as InstagramPromotion;
}

async function finish(db: Database, promotion: InstagramPromotion, values: Record<string, unknown>) {
  let query = db.from('social_promotions').update({
    ...values, lock_token: null, lock_until: null,
  }).eq('id', promotion.id).eq('lock_token', promotion.lock_token);
  if (values.status === 'scheduled') query = query.eq('needs_reapproval', false).not('approved_at', 'is', null);
  const { data, error } = await query.select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw new PromotionError('Operația nu mai deține blocarea postării. Reîncarcă starea.', 409);
  return data as InstagramPromotion;
}

async function stopRemote(promotion: InstagramPromotion) {
  if (promotion.buffer_post_id) await pauseBufferInstagramPost(promotion.buffer_post_id);
}

function remoteMatches(remote: BufferPost, promotion: InstagramPromotion) {
  return remote.text === promotion.caption && remote.schedulingType === 'automatic'
    && JSON.stringify(remote.assets.map((asset) => asset.source)) === JSON.stringify(promotion.rendered_images);
}

export async function saveInstagramDraft(db: Database, source: Source, body: Record<string, unknown>, actor: string) {
  if (!source.ownerId) throw new PromotionError('Cazarea trebuie asociată unui proprietar confirmat.');
  const draft = validateDraft(body.caption, body.images, source);
  const previous = await getInstagramPromotion(db, source.id);
  if (!previous && body.revision !== 0) throw new PromotionError('Preview-ul nu mai este disponibil. Reîncarcă pagina.', 409);
  if (previous?.status === 'published') throw new PromotionError('Campania a fost deja publicată.');
  const locked = previous ? await claim(db, previous, body.revision, actor) : null;
  try {
    if (locked && locked.caption === draft.caption && hash(locked.images) === hash(draft.images) && sourceMatches(source, locked)) {
      return await finish(db, locked, {});
    }
    if (locked) await stopRemote(locked);
    const rendered = await renderInstagramImages(source, draft.images);
    const freshSource = await getPromotionSource(db, source.id);
    if (sourceHash(freshSource, draft.images) !== sourceHash(source, draft.images)) {
      throw new PromotionError('Cazarea s-a modificat în timpul generării. Reîncarcă preview-ul.', 409);
    }
    const values = {
      listing_id: source.id, listing_reference: source.id, owner_id: source.ownerId,
      caption: draft.caption, images: draft.images, rendered_images: rendered,
      source_hash: sourceHash(source, draft.images), content_hash: hash([draft.caption, rendered]),
      status: 'draft', revision: (previous?.revision || 0) + 1, approved_at: null,
      consent_version: null, consent_text: null, needs_reapproval: false,
      scheduled_for: null, scheduled_week: null, preferred_date: null, last_error: null, last_actor: actor,
    };
    if (locked) return await finish(db, locked, values);
    const { data, error } = await db.from('social_promotions').insert(values).select('*').single();
    if (error?.code === '23505') throw new PromotionError('Un preview a fost salvat între timp. Reîncarcă pagina.', 409);
    if (error) throw error;
    return data as InstagramPromotion;
  } catch (error) {
    if (locked) await finish(db, locked, { status: 'error', last_error: 'Preview-ul nu a fost actualizat. Verifică starea înainte de reluare.' });
    throw error;
  }
}

export async function approveInstagramPromotion(db: Database, source: Source, revision: unknown, ownerId: string) {
  const promotion = await getInstagramPromotion(db, source.id);
  if (!promotion || promotion.owner_id !== ownerId || source.ownerId !== ownerId) throw new PromotionError('Preview-ul nu este disponibil.', 404);
  const locked = await claim(db, promotion, revision, ownerId);
  try {
    if (!sourceMatches(source, locked)) throw new PromotionError('Datele cazării s-au schimbat. Generează și verifică un preview nou.', 409);
    if (!canApproveInstagramPromotion(locked)) {
      throw new PromotionError('Postarea are deja acord sau este programată. Reîncarcă starea.', 409);
    }
    return await finish(db, locked, {
      approved_at: new Date().toISOString(), consent_version: INSTAGRAM_CONSENT_VERSION,
      consent_text: INSTAGRAM_CONSENT, status: 'approved', last_error: null,
    });
  } catch (error) { await finish(db, locked, {}); throw error; }
}

export async function changeInstagramPromotion(db: Database, promotion: InstagramPromotion, action: 'pause' | 'withdraw' | 'resume' | 'reschedule', revision: unknown, actor: string, preferredDate?: unknown) {
  const locked = await claim(db, promotion, revision, actor);
  try {
    if (locked.status === 'published') throw new PromotionError('Postarea este publicată. Eliminarea se gestionează separat pe Instagram.');
    if (action === 'resume' || action === 'reschedule') {
      if (!locked.approved_at || locked.needs_reapproval || !['approved', 'scheduled', 'paused', 'error'].includes(locked.status)) {
        throw new PromotionError('Este necesar un preview aprobat înainte de programare.');
      }
      const source = locked.listing_id ? await getPromotionSource(db, locked.listing_id) : null;
      if (!source || !sourceMatches(source, locked)) throw new PromotionError('Cazarea s-a modificat. Este necesar acordul proprietarului.');
      let preferred: string | null = null;
      if (action === 'reschedule') {
        if (typeof preferredDate !== 'string') throw new PromotionError('Alege data programării.');
        try { instagramSlotOnDate(preferredDate); } catch (error) { throw new PromotionError(error instanceof Error ? error.message : 'Dată invalidă.'); }
        preferred = preferredDate;
      }
      await stopRemote(locked);
      return await finish(db, locked, { status: 'approved', last_error: null, scheduled_for: null, scheduled_week: null, preferred_date: preferred });
    }
    await stopRemote(locked);
    return await finish(db, locked, {
      status: action === 'withdraw' ? 'cancelled' : 'paused',
      ...(action === 'withdraw' ? { approved_at: null } : {}),
      scheduled_for: null, scheduled_week: null, preferred_date: null, last_error: null,
    });
  } catch (error) {
    await finish(db, locked, { last_error: error instanceof Error ? error.message : 'Operația nu a fost confirmată.' });
    throw error;
  }
}

async function syncPromotion(db: Database, promotion: InstagramPromotion) {
  const locked = await claim(db, promotion, promotion.revision, 'system');
  try {
    let remote: BufferPost | null = null;
    if (locked.buffer_post_id) {
      remote = await getBufferPost(locked.buffer_post_id);
      if (!remote) throw new PromotionError('Postarea lipsește din Buffer. Verifică manual calendarul înainte de reluare.');
      if (remote.status === 'sent') {
        return await finish(db, locked, { status: 'published', published_at: remote.sentAt || new Date().toISOString(), external_url: remote.externalLink, last_error: null });
      }
      if (remote.status === 'sending') return await finish(db, locked, {});
    }
    if (!locked.approved_at || !['approved', 'scheduled'].includes(locked.status)) {
      await stopRemote(locked);
      return await finish(db, locked, { scheduled_for: null, scheduled_week: null });
    }
    const source = locked.listing_id ? await getPromotionSource(db, locked.listing_id) : null;
    const expiresBeforePost = source?.activeUntil && remote?.dueAt
      ? Date.parse(source.activeUntil) <= Date.parse(remote.dueAt) : false;
    if (!source || !sourceMatches(source, locked) || !source.eligible || expiresBeforePost) {
      await stopRemote(locked);
      return await finish(db, locked, {
        status: 'paused', needs_reapproval: !source || !sourceMatches(source, locked),
        scheduled_for: null, scheduled_week: null,
        last_error: source && sourceMatches(source, locked) ? 'Cazarea trebuie să fie activă pe website inclusiv la data postării.' : 'Cazarea s-a modificat. Este necesar un preview și un acord nou.',
      });
    }
    if (remote) {
      if (remote.status === 'scheduled' && !remoteMatches(remote, locked)) {
        await stopRemote(locked);
        return await finish(db, locked, { status: 'error', scheduled_for: null, scheduled_week: null,
          last_error: 'Postarea a fost modificată în Buffer. Verifică preview-ul și reia programarea din CABN.' });
      }
      if (remote.status === 'scheduled' && remote.dueAt) {
        return await finish(db, locked, { status: 'scheduled', scheduled_for: remote.dueAt, scheduled_week: promotionWeek(new Date(remote.dueAt)), last_error: null });
      }
      if (remote?.status === 'error') return await finish(db, locked, { status: 'error', last_error: 'Buffer nu a publicat postarea. Verifică legătura Instagram și reia programarea.' });
    }
    return await finish(db, locked, {});
  } catch (error) {
    await finish(db, locked, { last_error: error instanceof Error ? error.message : 'Starea Buffer nu a putut fi verificată.' });
    throw error;
  }
}

async function schedulePromotion(db: Database, promotion: InstagramPromotion) {
  const locked = await claim(db, promotion, promotion.revision, 'system');
  try {
    const source = locked.listing_id ? await getPromotionSource(db, locked.listing_id) : null;
    if (!source || !source.eligible || !sourceMatches(source, locked) || !locked.approved_at) {
      return await finish(db, locked, { last_error: 'Așteaptă o cazare activă și acordul pentru versiunea curentă.' });
    }
    let postId = locked.buffer_post_id;
    if (!postId) {
      const draft = await createBufferInstagramDraft(locked.caption, locked.rendered_images);
      postId = draft.id;
      // Never schedule before the provider id is durable; an interrupted create can only leave an unpublished draft.
      const { data, error } = await db.from('social_promotions').update({ buffer_post_id: postId })
        .eq('id', locked.id).eq('lock_token', locked.lock_token).select('id').maybeSingle();
      if (error || !data) throw new PromotionError('Draftul Buffer nu a putut fi asociat. Publicarea nu a fost pornită.', 503);
    }
    const remote = await getBufferPost(postId);
    if (!remote) throw new PromotionError('Draftul Buffer nu poate fi verificat.');
    if (remote.status === 'sent') return await finish(db, locked, { status: 'published', published_at: remote.sentAt, external_url: remote.externalLink });
    if (remote.status === 'sending') return await finish(db, locked, {});
    if (remote.status === 'scheduled') {
      if (!remoteMatches(remote, locked)) {
        await pauseBufferInstagramPost(postId);
        throw new PromotionError('Postarea din Buffer diferă de versiunea aprobată. Reia programarea.');
      }
      return await finish(db, locked, { status: 'scheduled', scheduled_for: remote.dueAt, scheduled_week: remote.dueAt ? promotionWeek(new Date(remote.dueAt)) : locked.scheduled_week, last_error: null });
    }
    const { data: occupied, error: occupiedError } = await db.from('social_promotions').select('scheduled_week')
      .eq('platform', 'instagram').in('status', ['approved', 'scheduled', 'published', 'error']).not('scheduled_week', 'is', null).neq('id', locked.id);
    if (occupiedError) throw occupiedError;
    const weeks = new Set((occupied || []).map((row) => String(row.scheduled_week)));
    const slot = locked.preferred_date ? instagramSlotOnDate(locked.preferred_date) : nextInstagramSlot(weeks);
    if (weeks.has(promotionWeek(slot))) throw new PromotionError('Există deja o campanie în săptămâna aleasă.');
    if (source.activeUntil && Date.parse(source.activeUntil) <= slot.getTime()) {
      throw new PromotionError('Publicarea cazării expiră înaintea datei promovării. Reînnoiește cazarea sau alege o dată eligibilă.');
    }
    // Reserve the week locally before scheduling remotely; the unique index also protects other workers.
    const { data: reserved, error: reserveError } = await db.from('social_promotions').update({
      scheduled_for: slot.toISOString(), scheduled_week: promotionWeek(slot),
    }).eq('id', locked.id).eq('lock_token', locked.lock_token).eq('needs_reapproval', false).select('id').maybeSingle();
    if (reserveError || !reserved) throw new PromotionError('Intervalul nu a putut fi rezervat. Reîncearcă programarea.', 409);
    const latestSource = await getPromotionSource(db, source.id);
    if (!latestSource.eligible || !sourceMatches(latestSource, locked)) throw new PromotionError('Cazarea s-a schimbat înainte de programare.', 409);
    const scheduled = await scheduleBufferInstagramPost(postId, locked.caption, locked.rendered_images, slot.toISOString());
    if (scheduled.status !== 'scheduled' || scheduled.schedulingType !== 'automatic') {
      await pauseBufferInstagramPost(postId);
      throw new PromotionError('Buffer nu a confirmat publicarea automată. Verifică tipul contului Instagram.');
    }
    return await finish(db, locked, { status: 'scheduled', last_error: null });
  } catch (error) {
    // Keep the same provider id and reserved week. A later sync resolves timeouts without duplicate posts.
    const latest = await getInstagramPromotion(db, locked.listing_reference);
    if (latest?.needs_reapproval && latest.buffer_post_id) {
      try {
        await stopRemote(latest);
        await finish(db, locked, { status: 'paused', scheduled_for: null, scheduled_week: null, last_error: 'Cazarea s-a modificat. Este necesar un preview și un acord nou.' });
      } catch {
        await finish(db, locked, { last_error: 'Oprirea programării nu a fost confirmată. Verifică imediat calendarul Buffer.' });
      }
    } else {
      await finish(db, locked, { last_error: error instanceof Error ? error.message : 'Programarea nu a fost confirmată.' });
    }
    throw error;
  }
}

export async function estimateInstagramDate(db: Database, source: Source, promotion: InstagramPromotion | null) {
  if (!promotion || promotion.status !== 'approved' || !source.eligible || !sourceMatches(source, promotion)) return null;
  if (promotion.preferred_date) {
    try { return instagramSlotOnDate(promotion.preferred_date).toISOString(); } catch { return null; }
  }
  const [weeksResult, olderResult] = await Promise.all([
    db.from('social_promotions').select('scheduled_week').not('scheduled_week', 'is', null)
      .in('status', ['approved', 'scheduled', 'published', 'error']).neq('id', promotion.id),
    db.from('social_promotions').select('id, listings!inner(is_published)', { count: 'exact', head: true })
      .eq('status', 'approved').eq('needs_reapproval', false).eq('listings.is_published', true)
      .is('scheduled_week', null).lt('approved_at', promotion.approved_at || promotion.created_at),
  ]);
  if (weeksResult.error) throw weeksResult.error;
  if (olderResult.error) throw olderResult.error;
  const weeks = new Set((weeksResult.data || []).map((row) => String(row.scheduled_week)));
  let slot = nextInstagramSlot(weeks);
  for (let index = 0; index < Math.min(olderResult.count || 0, 100); index += 1) {
    weeks.add(promotionWeek(slot)); slot = nextInstagramSlot(weeks);
  }
  return slot.toISOString();
}

export async function processInstagramPromotions(listingId?: string) {
  const config = instagramPromotionConfiguration();
  if (!config.enabled || !config.publishingEnabled || !config.bufferConfigured) return { processed: 0, active: false };
  const db = getSupabaseAdmin();
  const token = randomUUID();
  const now = new Date();
  const { data: lease, error: leaseError } = await db.from('social_promotion_worker').update({
    lock_token: token, lock_until: new Date(now.getTime() + 5 * 60_000).toISOString(),
  }).eq('id', 'instagram').or(`lock_token.is.null,lock_until.lt.${now.toISOString()}`).select('id').maybeSingle();
  if (leaseError) throw leaseError;
  if (!lease) return { processed: 0, active: true };
  let processed = 0;
  const deadline = Date.now() + 90_000;
  try {
    await getBufferInstagramChannel();
    let query = db.from('social_promotions').select('*').neq('status', 'published')
      .not('buffer_post_id', 'is', null)
      .or('status.eq.scheduled,status.eq.approved,needs_reapproval.eq.true,last_error.not.is.null')
      .order('updated_at', { ascending: true }).limit(10);
    if (listingId) query = query.eq('listing_reference', listingId);
    const { data: pendingSync, error: syncError } = await query;
    if (syncError) throw syncError;
    for (const row of (pendingSync || []) as InstagramPromotion[]) {
      if (Date.now() >= deadline) break;
      try { await syncPromotion(db, row); } catch { console.error('[instagram-promotion] Buffer reconciliation needs attention', { promotionId: row.id }); }
    }
    const { count: scheduledCount, error: countError } = await db.from('social_promotions').select('id', { count: 'exact', head: true }).eq('status', 'scheduled');
    if (countError) throw countError;
    const available = Math.max(0, 4 - (scheduledCount || 0));
    let approvedQuery = db.from('social_promotions').select('*, listings!inner(is_published)').eq('status', 'approved')
      .eq('listings.is_published', true).eq('needs_reapproval', false).order('approved_at', { ascending: true }).limit(20);
    if (listingId) approvedQuery = approvedQuery.eq('listing_reference', listingId);
    const { data: approved, error: approvedError } = await approvedQuery;
    if (approvedError) throw approvedError;
    for (const row of (approved || []) as InstagramPromotion[]) {
      if (processed >= available || Date.now() >= deadline) break;
      try { const result = await schedulePromotion(db, row); if (result.status === 'scheduled') processed += 1; }
      catch { console.error('[instagram-promotion] Scheduling needs attention', { promotionId: row.id }); }
    }
    return { processed, active: true };
  } finally {
    await db.from('social_promotion_worker').update({ lock_token: null, lock_until: null }).eq('id', 'instagram').eq('lock_token', token);
  }
}
