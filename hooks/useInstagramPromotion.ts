'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchOwnerApi } from '@/lib/api/ownerSession';
import type { InstagramPromotion, PromotionSource } from '@/lib/social/instagram';

export type InstagramPromotionData = {
  source: PromotionSource;
  promotion: InstagramPromotion | null;
  sourceCurrent?: boolean;
  estimatedFor?: string | null;
};
export type PromotionAction = 'save' | 'approve' | 'withdraw';
export type PromotionNotice = { text: string; tone: 'success' | 'error'; conflict?: boolean };

const successMessages: Record<PromotionAction, string> = {
  save: 'Preview-ul final este salvat. Verifică imaginile și textul înainte de a-ți da acordul.',
  approve: 'Acordul tău a fost salvat. Poți urmări mai jos starea promovării.',
  withdraw: 'Acordul a fost retras și programarea a fost oprită.',
};

export function useInstagramPromotion(listingId: string, ownerId?: string, onUpdated?: () => void) {
  const [data, setData] = useState<InstagramPromotionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<PromotionNotice | null>(null);
  const [action, setAction] = useState<PromotionAction | null>(null);
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(false);
  const generation = useRef(0);
  const submitting = useRef(false);
  const request = useCallback((init?: RequestInit) => ownerId
    ? fetchOwnerApi(ownerId, `/api/social-promotions/${listingId}`, init)
    : fetch(`/api/social-promotions/${listingId}`, { ...init, cache: 'no-store' }), [listingId, ownerId]);

  useEffect(() => {
    mounted.current = true;
    generation.current += 1;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setNotice(null);
    setAction(null);
    setData(null);
    void request({ signal: controller.signal }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Promovarea nu a putut fi încărcată.');
      if (!controller.signal.aborted) setData(body);
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Promovarea nu a putut fi încărcată.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => { mounted.current = false; controller.abort(); };
  }, [request, attempt]);

  const submit = useCallback(async (nextAction: PromotionAction, payload: Record<string, unknown>) => {
    if (submitting.current) return null;
    submitting.current = true;
    const requestGeneration = generation.current;
    setAction(nextAction);
    setNotice(null);
    try {
      const response = await request({
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, action: nextAction }),
      });
      const body = await response.json();
      if (!mounted.current || generation.current !== requestGeneration) return null;
      if (!response.ok) {
        setNotice({ text: body.error || 'Modificarea nu a putut fi salvată. Reîncearcă.', tone: 'error', conflict: response.status === 409 });
        return null;
      }
      const next = body as InstagramPromotionData;
      setData(next);
      setNotice({ text: successMessages[nextAction], tone: 'success' });
      onUpdated?.();
      return next;
    } catch {
      if (mounted.current && generation.current === requestGeneration) {
        setNotice({ text: 'Nu am putut confirma salvarea. Verifică conexiunea și reîncarcă starea înainte de a încerca din nou.', tone: 'error', conflict: true });
      }
      return null;
    } finally {
      submitting.current = false;
      if (mounted.current && generation.current === requestGeneration) setAction(null);
    }
  }, [request, onUpdated]);

  return {
    data, loading, error, notice, action, submit,
    clearNotice: () => setNotice(null),
    reload: () => setAttempt((current) => current + 1),
  };
}
