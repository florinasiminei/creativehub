import React from 'react';

type ListingFormSectionProps = {
  step: string;
  label: string;
  title: string;
  children: React.ReactNode;
};

export default function ListingFormSection({ step, label, title, children }: ListingFormSectionProps) {
  return (
    <section className="rounded-2xl border bg-white shadow-sm p-6 space-y-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
          {step}
        </span>
      </div>
      {children}
    </section>
  );
}
