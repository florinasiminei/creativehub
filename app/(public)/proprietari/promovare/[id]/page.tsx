import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { OwnerInstagramPromotion } from '@/components/forms/InstagramPromotionEditor';
import { instagramPromotionEnabled } from '@/lib/server/instagramPromotionConfig';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Promovare Instagram', robots: { index: false, follow: false } };

export default async function InstagramPromotionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ trimis?: string }> }) {
  if (!instagramPromotionEnabled()) notFound();
  const { id } = await params;
  const query = await searchParams;
  return <div className="mx-auto max-w-6xl space-y-5 py-6 sm:py-8">
    {query.trimis === '1' && <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 sm:p-5">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
      <div><p className="font-semibold">Cazarea a fost trimisă spre verificare</p>
        <p className="mt-1 text-sm leading-6">Echipa CABN verifică detaliile. Între timp, poți pregăti promovarea gratuită pe Instagram sau poți reveni mai târziu din contul tău.</p></div>
    </div>}
    <OwnerInstagramPromotion listingId={id} />
  </div>;
}
