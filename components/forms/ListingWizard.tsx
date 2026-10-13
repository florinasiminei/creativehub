"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";

export type ListingWizardStep = {
  id: string;
  label: string;
  description: string;
};

type ListingWizardProgressProps = {
  steps: ListingWizardStep[];
  activeIndex: number;
  furthestIndex: number;
  onStepSelect: (index: number) => void;
};

export function ListingWizardProgress({
  steps,
  activeIndex,
  furthestIndex,
  onStepSelect,
}: ListingWizardProgressProps) {
  const progress = ((activeIndex + 1) / steps.length) * 100;
  const activeStep = steps[activeIndex];

  return (
    <nav
      aria-label="Progres formular proprietate"
      className="border-b border-zinc-200 pb-4 dark:border-zinc-800"
    >
      <div className="flex items-center justify-between gap-4 lg:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
            Pasul {activeIndex + 1} din {steps.length}
          </p>
          <p className="mt-1 font-semibold text-zinc-950 dark:text-white">{activeStep.label}</p>
        </div>
        <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          {Math.round(progress)}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Progres completare formular"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={activeIndex + 1}
        className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-100 lg:hidden dark:bg-zinc-800"
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 dark:bg-emerald-400"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="hidden gap-3 lg:grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => {
          const completed = index < activeIndex || (index < furthestIndex && index !== activeIndex);
          const active = index === activeIndex;
          const available = index <= furthestIndex;

          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onStepSelect(index)}
                disabled={!available}
                aria-current={active ? "step" : undefined}
                className={`group flex w-full flex-col items-center gap-1.5 text-center transition ${
                  active
                    ? "text-emerald-800 dark:text-emerald-200"
                    : available
                      ? "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                      : "cursor-default text-zinc-400 dark:text-zinc-600"
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                    completed
                      ? "bg-emerald-700 text-white dark:bg-emerald-500 dark:text-emerald-950"
                      : active
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-700"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {completed ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                </span>
                <span className="block truncate text-xs font-medium">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type ListingWizardActionsProps = {
  activeIndex: number;
  totalSteps: number;
  loading: boolean;
  uploading: boolean;
  uploadedCount: number;
  totalFiles: number;
  submitLabel: string;
  loadingLabel: string;
  helperText: string;
  onBack: () => void;
  onContinue: () => void;
};

export function ListingWizardActions({
  activeIndex,
  totalSteps,
  loading,
  uploading,
  uploadedCount,
  totalFiles,
  submitLabel,
  loadingLabel,
  helperText,
  onBack,
  onContinue,
}: ListingWizardActionsProps) {
  const isLastStep = activeIndex === totalSteps - 1;

  return (
    <div className="shrink-0 border-t border-zinc-200 bg-white py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <p
          className={`min-w-0 truncate text-sm text-zinc-600 dark:text-zinc-300 ${
            uploading ? "block" : "hidden sm:block"
          }`}
        >
          {uploading ? `Se încarcă imaginile... ${uploadedCount}/${totalFiles}` : helperText}
        </p>

        <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
          {activeIndex > 0 && (
            <button
              type="button"
              onClick={onBack}
              disabled={loading || uploading}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 px-3 text-sm font-semibold text-zinc-700 transition hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none dark:text-zinc-300 dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Înapoi
            </button>
          )}
          <button
            type={isLastStep ? "submit" : "button"}
            onClick={isLastStep ? undefined : (event) => {
              // The next step can turn this same button into a submit button.
              event.preventDefault();
              onContinue();
            }}
            disabled={loading || uploading}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-700 px-6 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {loading ? loadingLabel : isLastStep ? submitLabel : "Continuă"}
            {!loading && !isLastStep && <ChevronRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
}
