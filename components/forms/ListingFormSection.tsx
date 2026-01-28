import React from 'react';

type ListingFormSectionProps = {
  step: string;
  label: string;
  title: string;
  children: React.ReactNode;
};

export default function ListingFormSection({ step, label, title, children }: ListingFormSectionProps) {
  return (
    <section className="rounded-2xl border bg-white shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">{step}</span>
      </div>
      {children}
    </section>
  );
}
