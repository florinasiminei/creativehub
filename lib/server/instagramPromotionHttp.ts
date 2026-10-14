import 'server-only';
import { NextResponse } from 'next/server';
import { OwnerAuthUnavailableError } from '@/lib/server/ownerAuth';
import { PromotionError } from '@/lib/server/instagramPromotions';
import { BufferRequestError } from '@/lib/server/bufferInstagram';

export function promotionJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export function promotionFailure(error: unknown) {
  if (error instanceof PromotionError) return promotionJson({ error: error.message }, error.status);
  if (error instanceof OwnerAuthUnavailableError) return promotionJson({ error: error.message }, 503);
  if (error instanceof BufferRequestError) return promotionJson({ error: error.message }, 502);
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (['42P01', '42703', 'PGRST204', 'PGRST205'].includes(code)) {
    return promotionJson({ code: 'PROMOTION_SETUP_REQUIRED', error: 'Promovarea Instagram nu este încă disponibilă. Poți reveni din contul de proprietar.' }, 503);
  }
  console.error('[instagram-promotion] Request failed', { code: code || 'unknown' });
  return promotionJson({ error: 'Operația nu a putut fi finalizată. Reîncarcă starea înainte de reluare.' }, 500);
}

export async function readPromotionBody(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new PromotionError('Originea cererii nu este permisă.', 403);
  const text = await request.text();
  if (text.length > 16_000) throw new PromotionError('Cererea este prea mare.', 413);
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new PromotionError('Cerere invalidă.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PromotionError('Cerere invalidă.');
  return value as Record<string, unknown>;
}
