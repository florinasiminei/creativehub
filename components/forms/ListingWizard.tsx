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
  completedSteps: boolean[];
  pendingSteps?: boolean[];
  disabled?: boolean;
  onStepSelect: (index: number) => void;
};

export function ListingWizardProgress({
  steps,
  activeIndex,
  completedSteps,
  pendingSteps = [],
  disabled = false,
  onStepSelect,
}: ListingWizardProgressProps) {
  const completedCount = steps.filter((_, index) => completedSteps[index] && !pendingSteps[index]).length;
  const hasPendingSteps = steps.some((_, index) => pendingSteps[index]);
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;
  const activeStep = steps[activeIndex];

  return (
    <nav
      aria-label="Progres formular proprietate"
      className="border-b border-zinc-200 pb-4 dark:border-zinc-800"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
            Pasul {activeIndex + 1} din {steps.length}
          </p>
          <p className="mt-1 font-semibold text-zinc-950 dark:text-white">{activeStep.label}</p>
        </div>
        <span aria-live="polite" className="text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 sm:text-sm">
          {completedCount} din {steps.length} completate
          {hasPendingSteps && <span className="mt-1 block text-[10px] font-normal sm:text-xs">Verificăm datele…</span>}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Progres completare formular"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={completedCount}
        aria-valuetext={`${completedCount} din ${steps.length} secțiuni completate${hasPendingSteps ? '. Unele date se verifică.' : ''}`}
        className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 dark:bg-emerald-400"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="mt-4 grid gap-1 sm:gap-3" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => {
          const pending = pendingSteps[index] === true;
          const completed = !pending && completedSteps[index] === true;
          const active = index === activeIndex;
          const stateLabel = pending ? "Se verifică" : completed ? "Completat" : "De completat";

          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onStepSelect(index)}
                disabled={disabled}
                aria-current={active ? "step" : undefined}
                aria-label={`${step.label}: ${stateLabel.toLowerCase()}`}
                className={`group flex min-h-20 w-full min-w-0 flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50 dark:focus-visible:ring-offset-zinc-950 ${
                  active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "border-transparent text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
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
                <span className="block w-full break-words text-[11px] font-semibold leading-4 sm:text-xs">{step.label}</span>
                <span className={`text-[10px] leading-4 sm:text-xs ${completed ? "text-emerald-700 dark:text-emerald-300" : "text-zinc-500 dark:text-zinc-400"}`}>
                  {stateLabel}
                </span>
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
