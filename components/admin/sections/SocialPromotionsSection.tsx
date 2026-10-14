'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import InstagramPromotionEditor from '@/components/forms/InstagramPromotionEditor';
import { formatPromotionDate, PROMOTION_STATUS_LABELS, PROMOTION_TIMEZONE, type InstagramPromotion } from '@/lib/social/instagram';

type Promotion = InstagramPromotion & { listings: { title: string; is_published: boolean } | null };
type Configuration = { enabled: boolean; publishingEnabled: boolean; bufferConfigured: boolean; cronConfigured: boolean };
const buttonClass = 'min-h-11 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700';

function localDate(value: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: PROMOTION_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)?.value).join('-');
}

function PromotionCalendar({ promotions, onSelect, disabled }: { promotions: Promotion[]; onSelect: (listingId: string) => void; disabled: boolean }) {
  const [month, setMonth] = useState(() => localDate(new Date().toISOString()).slice(0, 7));
  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - (first.getUTCDay() + 6) % 7);
  function move(direction: number) {
    setMonth(new Date(Date.UTC(year, monthNumber - 1 + direction, 1)).toISOString().slice(0, 7));
  }
  return <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
    <div className="mb-4 flex items-center justify-between gap-2">
      <button type="button" onClick={() => move(-1)} aria-label="Luna anterioară" className={buttonClass}>←</button>
      <h3 className="font-semibold">{new Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first)}</h3>
      <button type="button" onClick={() => move(1)} aria-label="Luna următoare" className={buttonClass}>→</button>
    </div>
    <div className="grid grid-cols-7 gap-1 text-xs">
      {['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'].map((day) => <div key={day} className="p-2 text-center font-semibold">{day}</div>)}
      {Array.from({ length: 42 }, (_, index) => {
        const day = new Date(start); day.setUTCDate(start.getUTCDate() + index);
        const key = day.toISOString().slice(0, 10);
        const items = promotions.filter((promotion) => promotion.scheduled_for && localDate(promotion.scheduled_for) === key);
        return <div key={key} className={`min-h-20 rounded-lg border p-1 sm:p-2 ${key.startsWith(month) ? 'border-zinc-200 dark:border-zinc-700' : 'border-transparent text-zinc-400'}`}>
          <span>{day.getUTCDate()}</span>
          {items.map((promotion) => {
            const confirmed = promotion.status === 'scheduled' || promotion.status === 'published';
            const label = confirmed ? PROMOTION_STATUS_LABELS[promotion.status] : 'Interval în verificare';
            const tone = promotion.status === 'published'
              ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
              : confirmed ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                : 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200';
            return <button key={promotion.id} type="button" disabled={disabled || !promotion.listing_id}
              onClick={() => { if (promotion.listing_id) onSelect(promotion.listing_id); }}
              title={`${promotion.listings?.title || 'Cazare eliminată'} · ${label} · ${formatPromotionDate(promotion.scheduled_for)}`}
              aria-label={`${promotion.listings?.title || 'Cazare eliminată'}, ${label}, ${formatPromotionDate(promotion.scheduled_for)}`}
              className={`mt-1 min-h-11 w-full rounded-lg p-1 text-left text-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:p-2 ${tone}`}>
              <span className="block truncate font-semibold">{promotion.listings?.title || 'Cazare eliminată'}</span>
              <span className="hidden sm:block">{label}</span>
            </button>;
          })}
        </div>;
      })}
    </div><p className="mt-3 text-xs leading-5 text-zinc-500">Calendar Instagram · ora României · joi, 19:00. Verde: programare confirmată. Galben: interval în verificare. Gri: publicată.</p>
  </div>;
}

export default function SocialPromotionsSection() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const [preferredDates, setPreferredDates] = useState<Record<string, string>>({});
  const controller = useRef<AbortController | null>(null);
  const actionInProgress = useRef(false);
  const interactionBusy = busy || editorBusy;

  const load = useCallback(async () => {
    controller.current?.abort();
    const next = new AbortController(); controller.current = next;
    setError(null);
    try {
      const response = await fetch('/api/backoffice/social-promotions', { cache: 'no-store', signal: next.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.code === 'PROMOTION_SETUP_REQUIRED'
        ? 'Structura de date Instagram trebuie pregătită. Instrucțiuni: db/instagram-promotion-setup.md.' : body.error || 'Nu am putut încărca promovările.');
      if (!next.signal.aborted) { setPromotions(body.promotions); setConfiguration(body.configuration); }
    } catch (reason) { if (!next.signal.aborted) setError(reason instanceof Error ? reason.message : 'Nu am putut încărca promovările.'); }
    finally { if (!next.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => { void load(); return () => controller.current?.abort(); }, [load]);

  function selectPromotion(listingId: string | null) {
    if (interactionBusy) return;
    if (listingId === selected) return;
    if (editorDirty && !window.confirm('Ai modificări nesalvate în postare. Vrei să renunți la ele?')) return;
    setEditorDirty(false);
    setSelected(listingId);
  }

  async function action(name: string, promotion?: Promotion) {
    if (actionInProgress.current || editorBusy) return;
    if (editorDirty && name !== 'check-connection') {
      setError('Salvează modificările postării sau închide editorul înainte de a modifica programarea.');
      return;
    }
    actionInProgress.current = true;
    setBusy(true); setNotice(null); setError(null);
    try {
      const response = await fetch(promotion ? `/api/social-promotions/${promotion.listing_reference}` : '/api/backoffice/social-promotions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: name, revision: promotion?.revision, preferredDate: promotion ? preferredDates[promotion.id] : undefined }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Operația nu a fost finalizată.');
      setNotice(name === 'check-connection' ? `Conexiune validă: ${body.name}.`
        : name === 'process' ? body.active ? `Calendar verificat. ${body.processed} campanii programate.` : 'Publicarea automată este încă dezactivată în configurația serverului.' : 'Starea campaniei a fost actualizată.');
      await load();
      if (name !== 'check-connection') setEditorVersion((version) => version + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Operația nu a fost finalizată.'); }
    finally { actionInProgress.current = false; setBusy(false); }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Promovare Instagram</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Preview aprobat de proprietar → cazare activă → calendar → publicare pe cabn.ro.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={interactionBusy || loading} onClick={() => void load()}>Reîncarcă</button>
        <button type="button" className={buttonClass} disabled={interactionBusy || !configuration?.bufferConfigured} onClick={() => void action('check-connection')}>Verifică Buffer</button>
        <button type="button" className={buttonClass} disabled={interactionBusy || editorDirty || !configuration?.publishingEnabled} onClick={() => void action('process')}>{busy ? 'Se verifică...' : 'Sincronizează calendarul'}</button></div></div>
    {configuration && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <p>Interfață: {configuration.enabled ? 'activă' : 'dezactivată'} · Buffer: {configuration.bufferConfigured ? 'configurat' : 'neconfigurat'} · publicare: {configuration.publishingEnabled ? 'activată' : 'dezactivată'} · verificare periodică: {configuration.cronConfigured ? 'secret configurat; verifică jobul periodic' : 'neconfigurată'}.</p>
      <p className="mt-1">Configurare și activare separată: db/instagram-promotion-setup.md. Conținutul modificat de echipă necesită un acord nou.</p>
    </div>}
    {loading && <p role="status">Se încarcă promovările...</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{notice}</p>}
    {configuration && <PromotionCalendar promotions={promotions} onSelect={selectPromotion} disabled={interactionBusy} />}
    {!loading && !error && promotions.length === 0 && <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm dark:border-zinc-700">Nu există campanii încă. Proprietarii pot pregăti promovarea după trimiterea cazării și din contul lor.</p>}
    <div className="space-y-3">{promotions.map((promotion) => <article key={promotion.id} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{promotion.listings?.title || 'Cazare eliminată'}</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{promotion.needs_reapproval ? 'Acord nou necesar' : PROMOTION_STATUS_LABELS[promotion.status]} · {formatPromotionDate(promotion.scheduled_for)}</p>
        {promotion.last_error && <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{promotion.last_error}</p>}
        {promotion.external_url && <a href={promotion.external_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-emerald-700 underline dark:text-emerald-300">Vezi postarea</a>}</div>
        <div className="flex flex-wrap gap-2">{promotion.listing_id && <button type="button" className={buttonClass} disabled={interactionBusy} onClick={() => selectPromotion(selected === promotion.listing_id ? null : promotion.listing_id)}>{selected === promotion.listing_id ? 'Închide editorul' : 'Preview / editare'}</button>}
          {promotion.listing_id && ['approved', 'scheduled', 'error'].includes(promotion.status) && <button type="button" className={buttonClass} disabled={interactionBusy || editorDirty} onClick={() => void action('pause', promotion)}>Pauză</button>}
          {promotion.listing_id && ['paused', 'error'].includes(promotion.status) && promotion.approved_at && !promotion.needs_reapproval && <button type="button" className={buttonClass} disabled={interactionBusy || editorDirty} onClick={() => void action('resume', promotion)}>Reintrodu în coadă</button>}
        </div></div>
      {promotion.listing_id && promotion.approved_at && !promotion.needs_reapproval && promotion.status !== 'published' && <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor={`schedule-${promotion.id}`} className="text-xs text-zinc-600 dark:text-zinc-300">Reprogramare · joi, 19:00</label>
        <input id={`schedule-${promotion.id}`} type="date" disabled={interactionBusy || editorDirty} value={preferredDates[promotion.id] || promotion.preferred_date || ''}
          onChange={(event) => setPreferredDates((current) => ({ ...current, [promotion.id]: event.target.value }))}
          className="rounded-lg border border-zinc-300 bg-transparent p-2 text-sm dark:border-zinc-700" />
        <button type="button" className={buttonClass} disabled={interactionBusy || editorDirty || !preferredDates[promotion.id]} onClick={() => void action('reschedule', promotion)}>Reprogramează</button>
        {promotion.preferred_date && !promotion.scheduled_for && <span className="text-xs">Dată solicitată: {promotion.preferred_date}</span>}
      </div>}
    </article>)}</div>
    {selected && <fieldset disabled={busy} aria-busy={busy} className="min-w-0">
      <legend className="sr-only">Postarea Instagram selectată</legend>
      <InstagramPromotionEditor key={`${selected}:${editorVersion}`} listingId={selected} onDirtyChange={setEditorDirty} onBusyChange={setEditorBusy} onUpdated={() => void load()} />
    </fieldset>}
  </div>;
}
