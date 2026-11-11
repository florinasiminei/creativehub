'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, Share2, Loader2, Pencil, RotateCcw, ShieldCheck, X } from 'lucide-react';
import OwnerOtpGate from '@/components/forms/OwnerOtpGate';
import InstagramPostPreview from '@/components/social/InstagramPostPreview';
import PromotionPhotoGallery from '@/components/forms/PromotionPhotoGallery';
import { useInstagramPromotion, type InstagramPromotionData, type PromotionAction } from '@/hooks/useInstagramPromotion';
import {
  buildInstagramCaption, canApproveInstagramPromotion, formatPromotionDate, INSTAGRAM_CONSENT,
  INSTAGRAM_MAX_CAPTION, INSTAGRAM_MAX_IMAGES, PROMOTION_STATUS_LABELS,
  type PromotionImage,
} from '@/lib/social/instagram';

type Props = { listingId: string; ownerId?: string; onUpdated?: () => void; onDirtyChange?: (dirty: boolean) => void; onBusyChange?: (busy: boolean) => void };
const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800';
const primaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-offset-zinc-900';

export function OwnerInstagramPromotion({ listingId }: { listingId: string }) {
  return <OwnerOtpGate purpose="promotion">{({ session }) => <InstagramPromotionEditor key={session.user.id} listingId={listingId} ownerId={session.user.id} />}</OwnerOtpGate>;
}

export default function InstagramPromotionEditor({ listingId, ownerId, onUpdated, onDirtyChange, onBusyChange }: Props) {
  const controller = useInstagramPromotion(listingId, ownerId, onUpdated);
  const dirty = useRef(false);
  const busyCallback = useRef(onBusyChange);
  busyCallback.current = onBusyChange;
  const busy = controller.action !== null;
  useEffect(() => { busyCallback.current?.(busy); }, [busy]);
  useEffect(() => () => { busyCallback.current?.(false); }, []);
  function reload() {
    if (busy) return;
    if (dirty.current && !window.confirm('Ai modificări nesalvate. Reîncarci versiunea salvată și renunți la modificări?')) return;
    controller.reload();
  }

  if (controller.loading) return <div role="status" className="space-y-5 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
    <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Pregătim postarea pentru cazarea ta…</p>
    <div aria-hidden="true" className="grid animate-pulse gap-6 lg:grid-cols-2"><div className="space-y-4"><div className="h-8 w-2/3 rounded-xl bg-zinc-100 dark:bg-zinc-800" /><div className="h-48 rounded-2xl bg-zinc-100 dark:bg-zinc-800" /><div className="h-28 rounded-2xl bg-zinc-100 dark:bg-zinc-800" /></div><div className="mx-auto aspect-[4/5] w-full max-w-sm rounded-3xl bg-zinc-100 dark:bg-zinc-800" /></div>
  </div>;

  if (!controller.data) return <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
    <AlertCircle aria-hidden="true" className="mb-3 h-7 w-7 text-amber-600" /><h2 className="text-xl font-semibold">Nu am putut deschide promovarea</h2>
    <p role="alert" className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{controller.error}</p>
    <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={reload} className={primaryButton}><RotateCcw aria-hidden="true" className="h-4 w-4" />Reîncearcă</button><Link href="/proprietari" className={secondaryButton}>Înapoi la proprietăți</Link></div>
  </div>;

  return <div className="space-y-4">
    {controller.notice && <div role={controller.notice.tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6 ${controller.notice.tone === 'error' ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200' : 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'}`}>
      {controller.notice.tone === 'error' ? <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />}
      <div className="min-w-0 flex-1"><p>{controller.notice.text}</p>{controller.notice.conflict && <button type="button" onClick={reload} className="mt-2 font-semibold underline underline-offset-4">Reîncarcă versiunea salvată</button>}</div>
      <button type="button" onClick={controller.clearNotice} aria-label="Închide mesajul" className="-mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"><X aria-hidden="true" className="h-4 w-4" /></button>
    </div>}
    <PromotionForm key={`${listingId}:${controller.data.promotion?.revision || 0}`} data={controller.data} owner={Boolean(ownerId)} action={controller.action}
      submit={controller.submit} clearNotice={controller.clearNotice} reload={reload} onDirtyChange={(next) => { dirty.current = next; onDirtyChange?.(next); }} />
  </div>;
}

function PromotionForm({ data, owner, action, submit, clearNotice, reload, onDirtyChange }: {
  data: InstagramPromotionData; owner: boolean; action: PromotionAction | null;
  submit: (action: PromotionAction, payload: Record<string, unknown>) => Promise<InstagramPromotionData | null>;
  clearNotice: () => void; reload: () => void; onDirtyChange: (dirty: boolean) => void;
}) {
  const { source, promotion } = data;
  const initialImages = promotion?.images || source.images.slice(0, INSTAGRAM_MAX_IMAGES).map((image) => ({ imageId: image.id, position: 'centre' as const }));
  const initialCaption = promotion?.caption || buildInstagramCaption(source);
  const [caption, setCaption] = useState(initialCaption);
  const [images, setImages] = useState<PromotionImage[]>(initialImages);
  const [index, setIndex] = useState(0);
  const [consent, setConsent] = useState(false);
  const [editing, setEditing] = useState(!promotion?.approved_at && promotion?.status !== 'published');
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>(promotion?.rendered_images.length ? 'preview' : 'edit');
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const dirtyCallback = useRef(onDirtyChange);
  dirtyCallback.current = onDirtyChange;
  const busy = action !== null;
  const dirty = caption !== initialCaption || JSON.stringify(images) !== JSON.stringify(initialImages);
  const published = promotion?.status === 'published';
  const publishingAvailable = data.publishingAvailable === true;
  const sourceChanged = Boolean(!published && promotion && (promotion.needs_reapproval || data.sourceCurrent === false));
  const finalPreview = Boolean(promotion?.rendered_images.length) && !dirty && !sourceChanged;
  const canApprove = owner && finalPreview && canApproveInstagramPromotion(promotion, data.sourceCurrent !== false);
  const missingImages = images.some((image) => !source.images.some((original) => original.id === image.imageId));
  const canSave = !published && Boolean(caption.trim()) && images.length > 0 && !missingImages && (dirty || !promotion?.rendered_images.length || sourceChanged);
  const currentIndex = Math.min(index, Math.max(0, images.length - 1));
  const statusLabel = published ? PROMOTION_STATUS_LABELS.published : sourceChanged ? 'Necesită actualizare' : promotion ? PROMOTION_STATUS_LABELS[promotion.status] : 'Postare de pregătit';
  const statusNeedsAttention = sourceChanged || promotion?.status === 'error';
  const Title = owner ? 'h1' : 'h2';

  useEffect(() => {
    dirtyCallback.current(dirty);
  }, [dirty]);
  useEffect(() => {
    if (!dirty && !busy) return;
    let allowConfirmedUnload = false;
    let resetConfirmedUnload: number | undefined;
    function preventLoss(event: BeforeUnloadEvent) {
      if (allowConfirmedUnload) return;
      event.preventDefault();
      event.returnValue = '';
    }
    function guardLinkNavigation(event: globalThis.MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || link.hasAttribute('download') || (link.target && link.target.toLowerCase() !== '_self')) return;
      let destination: URL;
      try { destination = new URL(link.href, window.location.href); } catch { return; }
      if (!['http:', 'https:'].includes(destination.protocol)) return;
      if (destination.origin === window.location.origin && destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      if (busy || !window.confirm('Ai modificări nesalvate. Vrei să pleci fără să le salvezi?')) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      allowConfirmedUnload = true;
      resetConfirmedUnload = window.setTimeout(() => { allowConfirmedUnload = false; }, 0);
    }
    window.addEventListener('beforeunload', preventLoss);
    document.addEventListener('click', guardLinkNavigation, true);
    return () => {
      window.removeEventListener('beforeunload', preventLoss);
      document.removeEventListener('click', guardLinkNavigation, true);
      window.clearTimeout(resetConfirmedUnload);
    };
  }, [dirty, busy]);
  useEffect(() => () => { dirtyCallback.current(false); }, []);

  function changed() { setConsent(false); clearNotice(); }
  function leave(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented) return;
    if (busy) event.preventDefault();
  }
  function showPreview() {
    setMobileView('preview');
    window.requestAnimationFrame(() => previewHeading.current?.focus());
  }
  async function save() {
    if (!canSave || busy) return;
    if (promotion?.approved_at && !window.confirm('Salvarea modificărilor oprește programarea actuală. Va fi nevoie de un acord nou pentru această versiune. Continui?')) return;
    const next = await submit('save', { caption, images, revision: promotion?.revision || 0 });
    if (next?.promotion) {
      if (next.promotion.revision === (promotion?.revision || 0)) {
        setCaption(next.promotion.caption);
        setImages(next.promotion.images);
        setConsent(false);
        setMobileView('preview');
        setIndex(0);
      }
      window.requestAnimationFrame(() => document.getElementById(`preview-${source.id}`)?.focus());
    }
  }
  async function approve() {
    if (!canApprove || !consent || busy) return;
    const next = await submit('approve', { revision: promotion?.revision || 0, consent: true, contentHash: promotion?.content_hash });
    if (next) { setConsent(false); setEditing(false); setMobileView('preview'); }
  }
  async function withdraw() {
    if (busy || !window.confirm('Retragi acordul pentru această postare? Programarea va fi oprită.')) return;
    const next = await submit('withdraw', { revision: promotion?.revision || 0 });
    if (next) { setConsent(false); setEditing(false); }
  }
  function startEditing() { setEditing(true); setMobileView('edit'); clearNotice(); }
  function discard() {
    if (dirty && !window.confirm('Renunți la modificările nesalvate și revii la versiunea salvată?')) return;
    setCaption(initialCaption); setImages(initialImages); setConsent(false); setEditing(false); setMobileView('preview');
  }

  return <section className="rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900" aria-labelledby={`promotion-${source.id}`}>
    <div className="border-b border-zinc-100 p-5 dark:border-zinc-800 sm:p-7">
      {owner && <Link href="/proprietari" onClick={leave} className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-300"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Proprietățile mele</Link>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-300"><Share2 aria-hidden="true" className="h-4 w-4" />Promovare social media</p>
          <Title id={`promotion-${source.id}`} className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{source.title}</Title>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">Personalizează postarea pentru contul Instagram cabn.ro. Tu alegi dacă aprobi textul și fotografiile salvate.</p></div>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Opțional · gratuit</span>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${statusNeedsAttention ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200' : promotion?.approved_at || published ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>
          {statusNeedsAttention ? <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" /> : promotion?.approved_at || published ? <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> : <Pencil aria-hidden="true" className="h-3.5 w-3.5" />}{statusLabel}
        </span>
        <span aria-live="polite" className={dirty ? 'text-amber-800 dark:text-amber-300' : 'text-zinc-500 dark:text-zinc-400'}>{busy ? 'Se salvează…' : dirty ? 'Modificări nesalvate' : promotion ? 'Versiune salvată' : 'Text și fotografii precompletate'}</span>
        {promotion && ['approved', 'scheduled', 'paused', 'error'].includes(promotion.status) && <button type="button" onClick={reload} disabled={busy} className={`${secondaryButton} ml-auto`}><RotateCcw aria-hidden="true" className="h-4 w-4" />Actualizează starea</button>}
      </div>
    </div>

    <div className="space-y-5 p-5 sm:p-7">
      {owner && !publishingAvailable && !published && promotion?.status !== 'scheduled' && <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300">
        <p className="font-semibold">Publicarea automată nu este activă momentan</p>
        <p className="mt-1">Poți salva postarea și îți poți da acordul. Data publicării va apărea aici după confirmarea programării.</p>
      </div>}
      {(sourceChanged || promotion?.status === 'error') && <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"><AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">{sourceChanged ? 'Cazarea sau fotografiile s-au schimbat' : 'Promovarea are nevoie de atenție'}</p><p>{sourceChanged ? 'Actualizează postarea și verifică previzualizarea. Pentru noua versiune va fi nevoie de un acord nou.' : owner ? 'Nu am putut confirma programarea. Echipa CABN poate verifica situația; acordul tău rămâne vizibil mai jos.' : promotion?.last_error || 'Verifică starea promovării înainte de a continua.'}</p></div></div>}

      <div className="sticky top-3 z-10 space-y-2 rounded-2xl bg-white/95 pb-2 backdrop-blur dark:bg-zinc-900/95 lg:static lg:hidden">
        <div className="flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-950" aria-label="Afișarea postării">
          <button type="button" aria-pressed={mobileView === 'edit'} aria-controls={`edit-${source.id}`} onClick={() => setMobileView('edit')} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${mobileView === 'edit' ? 'bg-white text-emerald-800 shadow-sm dark:bg-zinc-800 dark:text-emerald-200' : 'text-zinc-600 dark:text-zinc-400'}`}><Pencil aria-hidden="true" className="h-4 w-4" />{editing ? 'Editează' : 'Detalii'}</button>
          <button type="button" aria-pressed={mobileView === 'preview'} aria-controls={`preview-panel-${source.id}`} onClick={showPreview} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${mobileView === 'preview' ? 'bg-white text-emerald-800 shadow-sm dark:bg-zinc-800 dark:text-emerald-200' : 'text-zinc-600 dark:text-zinc-400'}`}><Eye aria-hidden="true" className="h-4 w-4" />Previzualizare</button>
        </div>
        {editing && mobileView === 'edit' && canSave && <button type="button" disabled={busy} onClick={() => void save()} className={`${primaryButton} w-full`}>{action === 'save' && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{action === 'save' ? 'Salvăm postarea…' : promotion ? 'Salvează modificările' : 'Salvează postarea'}</button>}
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(310px,0.9fr)] lg:gap-10">
        <div id={`edit-${source.id}`} className={`min-w-0 space-y-6 ${mobileView === 'preview' ? 'hidden lg:block' : ''}`}>
          {editing && !published ? <>
            <fieldset disabled={busy} className="min-w-0 space-y-6">
              <legend className="sr-only">Personalizează postarea</legend>
              <div><div className="flex items-baseline justify-between gap-3"><label htmlFor={`caption-${source.id}`} className="text-base font-semibold">Textul postării</label><span className="text-xs text-zinc-500 dark:text-zinc-400">{caption.length}/{INSTAGRAM_MAX_CAPTION}</span></div>
                <p id={`caption-hint-${source.id}`} className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Textul pornește de la detaliile cazării. Verifică informațiile și personalizează-l înainte de salvare.</p>
                <textarea id={`caption-${source.id}`} value={caption} maxLength={INSTAGRAM_MAX_CAPTION} rows={8} aria-describedby={`caption-hint-${source.id}`} onChange={(event) => { changed(); setCaption(event.target.value); }}
                  className="mt-3 w-full resize-y rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 text-base leading-7 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950/40 sm:text-sm" />
                {!caption.trim() && <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">Adaugă un text pentru a putea salva postarea.</p>}
              </div>
              <div className="space-y-3">
                <PromotionPhotoGallery availableImages={source.images} images={images} selectedIndex={currentIndex} disabled={busy} onSelect={setIndex}
                  onChange={(nextImages) => { if (busy) return; changed(); setImages(nextImages); setIndex(0); }} />
                {missingImages && <p className="text-sm text-amber-800 dark:text-amber-300">O fotografie selectată nu mai este în galerie. Elimin-o sau înlocuiește-o înainte de salvare.</p>}
              </div>
            </fieldset>
            {promotion?.approved_at && <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">Acordul existent este pentru versiunea salvată. Salvarea modificărilor va opri programarea și va cere un acord nou.</p>}
            <div className="flex flex-wrap gap-3"><button type="button" disabled={busy || !canSave} onClick={() => void save()} className={primaryButton}>{action === 'save' ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Check aria-hidden="true" className="h-4 w-4" />}{action === 'save' ? 'Salvăm postarea…' : promotion ? 'Salvează modificările' : 'Salvează postarea'}</button>
              {promotion && <button type="button" disabled={busy} onClick={discard} className={secondaryButton}>{dirty ? 'Renunță la modificări' : 'Închide editarea'}</button>}
            </div>
          </> : <div className="space-y-5 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><ShieldCheck aria-hidden="true" className="h-6 w-6" /></div>
            <div><h3 className="text-lg font-semibold">{published ? 'Postarea ta este publicată' : promotion?.approved_at ? 'Acordul tău este înregistrat' : 'Versiunea salvată'}</h3><p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{published ? 'Poți vedea postarea pe contul Instagram cabn.ro.' : promotion?.approved_at ? 'Ai aprobat textul și fotografiile salvate. Urmărește aici data și starea promovării.' : 'Poți revizui postarea, o poți edita sau îți poți da acordul pentru publicare.'}</p></div>
            <dl className="space-y-3 text-sm"><div className="flex items-start justify-between gap-4"><dt className="text-zinc-500 dark:text-zinc-400">Cont</dt><dd className="font-medium">Instagram · cabn.ro</dd></div><div className="flex items-start justify-between gap-4"><dt className="text-zinc-500 dark:text-zinc-400">Fotografii</dt><dd className="font-medium">{images.length}</dd></div>{promotion?.approved_at && <div className="flex items-start justify-between gap-4"><dt className="text-zinc-500 dark:text-zinc-400">Acord</dt><dd className="text-right font-medium">{formatPromotionDate(promotion.approved_at)}</dd></div>}</dl>
            {!published && <button type="button" disabled={busy} onClick={startEditing} className={secondaryButton}><Pencil aria-hidden="true" className="h-4 w-4" />Modifică postarea</button>}
            {published && promotion?.external_url && <a href={promotion.external_url} target="_blank" rel="noopener noreferrer" className={primaryButton}>Vezi pe Instagram<ArrowRight aria-hidden="true" className="h-4 w-4" /></a>}
          </div>}
          {promotion?.approved_at && !published && <div className="rounded-2xl bg-zinc-50 p-4 text-sm leading-6 dark:bg-zinc-950/50"><p className="font-semibold">{promotion.status === 'scheduled' ? 'Publicare programată' : promotion.status === 'paused' ? 'Promovarea este în pauză' : 'Ce urmează'}</p>
            {promotion.scheduled_for && <p className="mt-1">{promotion.status === 'scheduled' ? '' : 'Interval rezervat, încă neconfirmat: '}{formatPromotionDate(promotion.scheduled_for)} · ora României</p>}
            {publishingAvailable && !promotion.scheduled_for && data.estimatedFor && <p className="mt-1">Estimare: {formatPromotionDate(data.estimatedFor)}. Data se confirmă la programare.</p>}
            {promotion.status === 'approved' && <p className="mt-1 text-zinc-600 dark:text-zinc-300">{!publishingAvailable ? 'Acordul tău este salvat. Programarea va putea fi confirmată după activarea publicării automate.' : source.isPublished ? 'Postarea așteaptă confirmarea unui interval disponibil în calendar.' : 'Cazarea trebuie verificată înainte ca postarea să intre în calendar.'} Promovăm cel mult o proprietate pe săptămână.</p>}
          </div>}
        </div>

        <div id={`preview-panel-${source.id}`} className={`min-w-0 space-y-4 lg:sticky lg:top-6 ${mobileView === 'edit' ? 'hidden lg:block' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 ref={previewHeading} tabIndex={-1} id={`preview-${source.id}`} className="text-base font-semibold outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-emerald-500">Previzualizarea postării</h3><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${finalPreview ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300'}`}>{finalPreview ? 'Versiune salvată' : 'Variantă de lucru'}</span></div>
          <InstagramPostPreview source={source} images={images} caption={caption} renderedImages={promotion?.rendered_images} final={finalPreview} index={currentIndex} onIndexChange={setIndex} />
          {editing && !finalPreview && <button type="button" disabled={busy || !canSave} onClick={() => void save()} className={`${primaryButton} w-full lg:hidden`}>{action === 'save' && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{action === 'save' ? 'Salvăm postarea…' : promotion ? 'Salvează modificările' : 'Salvează postarea'}</button>}
        </div>
      </div>

      {owner && !published && <div className="scroll-mt-6 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
        <div className="flex items-start gap-3"><ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" /><div><h3 className="font-semibold">{promotion?.approved_at && !sourceChanged ? 'Tu controlezi publicarea' : 'Acordul tău pentru publicare'}</h3><p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{promotion?.approved_at && !sourceChanged ? 'Poți retrage acordul înainte de publicare. Modificarea postării va necesita un acord nou.' : 'Nu publicăm fără acordul tău pentru versiunea finală.'}</p></div></div>
        {canApprove ? <><label className="flex cursor-pointer items-start gap-3 text-sm leading-6"><input type="checkbox" checked={consent} disabled={busy} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 rounded accent-emerald-700" /><span>{INSTAGRAM_CONSENT}</span></label>
          <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={busy || !consent} onClick={() => void approve()} className={primaryButton}>{action === 'approve' ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <CheckCircle2 aria-hidden="true" className="h-4 w-4" />}{action === 'approve' ? 'Salvăm acordul…' : 'Aprobă postarea pentru Instagram'}</button><button type="button" onClick={showPreview} className={secondaryButton}><Eye aria-hidden="true" className="h-4 w-4" />Verifică previzualizarea</button></div></>
          : !promotion?.approved_at && <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{dirty ? 'Salvează modificările și verifică previzualizarea pentru a putea aproba postarea.' : sourceChanged ? 'Actualizează postarea cu informațiile curente ale cazării.' : 'Salvează postarea și verifică previzualizarea pentru a-ți da acordul.'}</p>}
        {promotion?.approved_at && <button type="button" disabled={busy} onClick={() => void withdraw()} className="inline-flex min-h-11 items-center text-sm font-medium text-zinc-600 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-40 dark:text-zinc-300">{action === 'withdraw' ? 'Retragem acordul…' : 'Retrage acordul și oprește programarea'}</button>}
      </div>}
      {!owner && <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200">Editările echipei cer un acord nou din contul proprietarului. Echipa CABN nu poate aproba în numele acestuia.</p>}
      {published && <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">Pentru eliminarea unei postări deja publicate, <Link href="/contact" className="font-medium text-emerald-700 underline dark:text-emerald-300">contactează echipa CABN</Link>.</p>}
      {owner && <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800"><Link href="/proprietari" onClick={leave} className="inline-flex min-h-11 items-center text-zinc-500 underline underline-offset-4 dark:text-zinc-400">{promotion?.approved_at || published ? 'Înapoi la proprietăți' : 'Revin mai târziu'}</Link><span className="text-right text-xs text-zinc-400">Instagram · cabn.ro</span></div>}
    </div>
  </section>;
}
