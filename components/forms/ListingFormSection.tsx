import React from 'react';

type ListingFormSectionProps = {
  step: string;
  label: string;
  title: string;
  children: React.ReactNode;
  mobileFlat?: boolean;
};

export default function ListingFormSection({ step, label, title, children, mobileFlat = false }: ListingFormSectionProps) {
  const sectionClass = mobileFlat
    ? "relative space-y-5 p-0 sm:rounded-[28px] sm:border sm:border-emerald-100/70 sm:bg-white sm:p-6 sm:shadow-[0_20px_55px_-38px_rgba(15,23,42,0.45)] sm:dark:border-zinc-800 sm:dark:bg-zinc-900"
    : "relative space-y-5 overflow-hidden rounded-[28px] border border-emerald-100/70 bg-white p-6 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.45)] dark:border-zinc-800 dark:bg-zinc-900";

  return (
    <section className={sectionClass}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-[28px] bg-[linear-gradient(180deg,rgba(16,185,129,0.08),transparent)]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700/80 dark:text-emerald-300">{label}</p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-200">
          {step}
        </span>
      </div>
      <div className="relative space-y-4">{children}</div>
    </section>
  );
}
