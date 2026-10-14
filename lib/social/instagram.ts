export const INSTAGRAM_MAX_IMAGES = 5;
export const INSTAGRAM_MAX_CAPTION = 2200;
export const INSTAGRAM_CONSENT_VERSION = 'instagram-v1';
export const INSTAGRAM_CONSENT = 'Aprob publicarea acestei versiuni, cu textul și fotografiile previzualizate, pe contul Instagram cabn.ro. Confirm că am dreptul să folosesc fotografiile pentru această promovare.';
export const PROMOTION_TIMEZONE = 'Europe/Bucharest';

export type PromotionStatus = 'draft' | 'approved' | 'paused' | 'scheduled' | 'published' | 'cancelled' | 'error';
export type CropPosition = 'centre' | 'north' | 'south' | 'east' | 'west';
export type PromotionImage = { imageId: string; position: CropPosition };
export type PromotionSource = {
  id: string;
  ownerId: string;
  title: string;
  location: string;
  capacity: string;
  facilities: string[];
  isPublished: boolean;
  eligible: boolean;
  images: Array<{ id: string; url: string }>;
};
export type InstagramPromotion = {
  id: string;
  listing_id: string | null;
  listing_reference: string;
  owner_id: string;
  platform: 'instagram';
  caption: string;
  images: PromotionImage[];
  rendered_images: string[];
  source_hash: string;
  content_hash: string;
  revision: number;
  status: PromotionStatus;
  approved_at: string | null;
  scheduled_for: string | null;
  scheduled_week: string | null;
  preferred_date: string | null;
  published_at: string | null;
  buffer_post_id: string | null;
  external_url: string | null;
  last_error: string | null;
  needs_reapproval: boolean;
  lock_token: string | null;
  lock_until: string | null;
  created_at: string;
  updated_at: string;
};

export type InstagramPromotionSummary = Pick<InstagramPromotion,
  'status' | 'approved_at' | 'needs_reapproval' | 'scheduled_for' | 'published_at' | 'external_url' | 'last_error'
>;

export function canApproveInstagramPromotion(promotion: InstagramPromotion | null, sourceCurrent = true): boolean {
  return Boolean(promotion && sourceCurrent && !promotion.needs_reapproval
    && ['draft', 'cancelled', 'error'].includes(promotion.status)
    && !(promotion.buffer_post_id && promotion.scheduled_for));
}

export const PROMOTION_STATUS_LABELS: Record<PromotionStatus, string> = {
  draft: 'Așteaptă acordul', approved: 'În coadă', paused: 'În pauză',
  scheduled: 'Programată', published: 'Publicată', cancelled: 'Acord retras', error: 'Necesită atenție',
};

export function buildInstagramCaption(source: PromotionSource) {
  return [
    `${source.title} — o nouă cazare pe cabn.ro.`,
    source.location,
    source.capacity ? `Capacitate: ${source.capacity} persoane.` : '',
    source.facilities.length ? `Facilități: ${source.facilities.slice(0, 3).join(', ')}.` : '',
    'Descoperă cazarea și contactează proprietarul pe cabn.ro.',
    '#cabn #cazari #vacanta',
  ].filter(Boolean).join('\n\n').slice(0, INSTAGRAM_MAX_CAPTION);
}

export function formatPromotionDate(value: string | null) {
  if (!value) return 'După verificarea cazării';
  return new Intl.DateTimeFormat('ro-RO', {
    timeZone: PROMOTION_TIMEZONE, weekday: 'short', day: 'numeric', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function bucharestParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PROMOTION_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute') };
}

// Convert a Romanian wall-clock time to UTC; two passes handle both DST offsets.
function bucharestToUtc(year: number, month: number, day: number, hour: number) {
  const wallTime = Date.UTC(year, month - 1, day, hour);
  let utc = wallTime;
  for (let pass = 0; pass < 2; pass += 1) {
    const p = bucharestParts(new Date(utc));
    const represented = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    utc += wallTime - represented;
  }
  return new Date(utc);
}

export function promotionWeek(date: Date) {
  const p = bucharestParts(date);
  const localDate = new Date(Date.UTC(p.year, p.month - 1, p.day));
  localDate.setUTCDate(localDate.getUTCDate() - (localDate.getUTCDay() + 6) % 7);
  return localDate.toISOString().slice(0, 10);
}

export function nextInstagramSlot(occupiedWeeks: Set<string>, now = new Date()) {
  const p = bucharestParts(now);
  const localDate = new Date(Date.UTC(p.year, p.month - 1, p.day));
  localDate.setUTCDate(localDate.getUTCDate() + (4 - localDate.getUTCDay() + 7) % 7);
  for (let week = 0; week < 104; week += 1) {
    const date = bucharestToUtc(localDate.getUTCFullYear(), localDate.getUTCMonth() + 1, localDate.getUTCDate(), 19);
    if (date.getTime() > now.getTime() + 60 * 60_000 && !occupiedWeeks.has(promotionWeek(date))) return date;
    localDate.setUTCDate(localDate.getUTCDate() + 7);
  }
  throw new Error('Nu există un interval disponibil în calendar.');
}

export function instagramSlotOnDate(value: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Alege o dată validă.');
  const [year, month, day] = value.split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.toISOString().slice(0, 10) !== value || calendarDate.getUTCDay() !== 4) {
    throw new Error('Promovările sunt programate joia, la 19:00, ora României.');
  }
  const date = bucharestToUtc(year, month, day, 19);
  if (date.getTime() <= now.getTime() + 60 * 60_000) throw new Error('Alege un interval cu cel puțin o oră în viitor.');
  return date;
}
