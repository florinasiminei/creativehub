'use client';

import { LISTING_TYPES } from '@/lib/listingTypes';
import type { ListingFormFields } from '@/lib/listings/listingForm';
import { WIZARD_STEPS } from '@/lib/listings/ownerPropertyForm';

export type PropertySubmissionReviewProps = {
  mode?: 'create' | 'edit';
  formData: ListingFormFields;
  selectedFacilityNames: string[];
  imagesCount: number;
  locationConfirmed: boolean;
  stepCompletion: boolean[];
  locationPending: boolean;
  activeOwnerEmail: string | null;
  activeOwnerConfirmed: boolean;
  showActiveOwnerError: boolean;
  switchingOwnerAccount: boolean;
  ownerAccountActionsDisabled: boolean;
  onEditStep: (index: number) => void;
  onActiveOwnerConfirmedChange: (checked: boolean) => void;
  onSwitchOwnerAccount: () => void;
};

export default function PropertySubmissionReview({
  mode = 'create',
  formData,
  selectedFacilityNames,
  imagesCount,
  locationConfirmed,
  stepCompletion,
  locationPending,
  activeOwnerEmail,
  activeOwnerConfirmed,
  showActiveOwnerError,
  switchingOwnerAccount,
  ownerAccountActionsDisabled,
  onEditStep,
  onActiveOwnerConfirmedChange,
  onSwitchOwnerAccount,
}: PropertySubmissionReviewProps) {
  const typeLabel =
    LISTING_TYPES.find((listingType) => listingType.value === formData.tip)?.singular || formData.tip;
  const locationLabel = [formData.sat, formData.localitate, formData.judet].filter(Boolean).join(', ');
  const reviewItems = [
    {
      label: 'Proprietate',
      value: `${formData.titlu || 'Fără denumire'} · ${typeLabel}`,
      stepIndex: 0,
    },
    {
      label: 'Capacitate și tarif',
      value: `${formData.capacitate || '—'} persoane · ${formData.camere || '0'} camere · ${formData.pret || '—'} lei/noapte`,
      stepIndex: 0,
    },
    {
      label: 'Prezentare',
      value: `${formData.descriere.trim().length} caractere · ${selectedFacilityNames.length} facilități selectate`,
      stepIndex: 0,
    },
    {
      label: 'Localizare',
      value: `${locationLabel || 'Necompletată'} · ${locationPending ? 'se verifică localitatea' : !stepCompletion[1] ? 'verifică localizarea' : locationConfirmed ? 'pin confirmat' : 'pin neconfirmat'}`,
      stepIndex: 1,
    },
    {
      label: 'Galerie',
      value: `${imagesCount} ${imagesCount === 1 ? 'fotografie' : 'fotografii'}`,
      stepIndex: 2,
    },
  ];
  const incompleteSections = WIZARD_STEPS.filter((step, index) => step.id !== 'review' && !stepCompletion[index]);

  return (
    <section
      aria-labelledby="listing-review-title"
      className="space-y-5 border-t border-zinc-200 pt-6 dark:border-zinc-800"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700/80 dark:text-emerald-300">
          Rezumat
        </p>
        <h2 id="listing-review-title" className="mt-1 text-xl font-semibold text-zinc-950 dark:text-white">
          {mode === 'edit' ? 'Verifică modificările înainte de salvare' : 'Verifică informațiile înainte de trimitere'}
        </h2>
      </div>

      {incompleteSections.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{locationPending && incompleteSections.length === 1 && incompleteSections[0].id === 'location' ? 'Verificăm localizarea…' : 'Mai ai informații de completat'}</p>
          <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">Poți reveni direct la secțiunea dorită. Informațiile introduse se păstrează.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {incompleteSections.map((step) => <button key={step.id} type="button" onClick={() => onEditStep(WIZARD_STEPS.indexOf(step))}
              className="inline-flex min-h-11 items-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-emerald-200 dark:hover:bg-emerald-950">
              {step.label}{step.id === 'location' && locationPending ? ' · se verifică' : ''}
            </button>)}
          </div>
        </div>
      )}

      <div className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {reviewItems.map((item) => (
          <article key={item.label} className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                  {item.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-800 dark:text-zinc-200">{item.value}</p>
              </div>
              <button
                type="button"
                aria-label={`Modifică: ${item.label}`}
                onClick={() => onEditStep(item.stepIndex)}
                className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-xs font-semibold text-emerald-700 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-300 dark:hover:text-emerald-200"
              >
                Modifică
              </button>
            </div>
          </article>
        ))}
      </div>

      {activeOwnerEmail ? (
        <div
          className={`rounded-2xl border px-4 py-4 text-sm leading-6 ${
            showActiveOwnerError
              ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/35 dark:text-red-100'
              : 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/35 dark:text-emerald-100'
          }`}
        >
          <p className="break-words font-semibold">{mode === 'edit' ? 'Administrezi cazarea din contul' : 'Cont detectat:'} {activeOwnerEmail}</p>
          {mode === 'create' && <>
          <label className="mt-2 flex items-start gap-2">
            <input
              type="checkbox"
              checked={activeOwnerConfirmed}
              onChange={(event) => onActiveOwnerConfirmedChange(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Confirm că această proprietate va fi administrată din contul de mai sus.</span>
          </label>
          <button
            type="button"
            onClick={onSwitchOwnerAccount}
            disabled={ownerAccountActionsDisabled}
            className="mt-3 text-xs font-semibold underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {switchingOwnerAccount ? 'Se schimbă contul...' : 'Folosește alt email'}
          </button>
          </>}
          {mode === 'edit' && <p className="mt-1">Modificările vor fi salvate pentru cazarea existentă, în același cont.</p>}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/35 dark:text-emerald-100">
          Nu am putut identifica emailul contului. Reconectează-te înainte de a trimite proprietatea.
        </div>
      )}
    </section>
  );
}
