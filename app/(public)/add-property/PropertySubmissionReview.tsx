'use client';

import { LISTING_TYPES } from '@/lib/listingTypes';
import type { ListingFormFields } from '@/lib/listings/listingForm';

export type PropertySubmissionReviewProps = {
  formData: ListingFormFields;
  selectedFacilityNames: string[];
  imagesCount: number;
  locationConfirmed: boolean;
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
  formData,
  selectedFacilityNames,
  imagesCount,
  locationConfirmed,
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
      value: `${locationLabel || 'Necompletată'} · ${locationConfirmed ? 'pin confirmat' : 'pin neconfirmat'}`,
      stepIndex: 1,
    },
    {
      label: 'Galerie',
      value: `${imagesCount} ${imagesCount === 1 ? 'fotografie' : 'fotografii'}`,
      stepIndex: 2,
    },
  ];

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
          Verifică informațiile înainte de trimitere
        </h2>
      </div>

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
                onClick={() => onEditStep(item.stepIndex)}
                className="shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-200"
              >
                Editează
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
          <p className="font-semibold">Cont detectat: {activeOwnerEmail}</p>
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
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/35 dark:text-emerald-100">
          Nu am putut identifica emailul contului. Reconectează-te înainte de a trimite proprietatea.
        </div>
      )}
    </section>
  );
}
