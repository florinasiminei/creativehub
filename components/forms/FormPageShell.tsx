import React from 'react';

type Highlight = {
  label: string;
  value: string;
};

type FormPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  highlights?: Highlight[];
};

export function FormPageState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur">
      <h2 className="text-2xl font-semibold text-emerald-950">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">{description}</p>
    </div>
  );
}

export default function FormPageShell({
  eyebrow,
  title,
  description,
  children,
  highlights = [],
}: FormPageShellProps) {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-emerald-100/80 bg-[linear-gradient(135deg,rgba(236,253,245,0.9),rgba(255,255,255,0.96)_42%,rgba(240,253,250,0.86))] px-4 py-6 shadow-[0_30px_80px_-50px_rgba(4,120,87,0.35)] sm:px-6 sm:py-8 lg:px-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_58%),radial-gradient(circle_at_top_right,rgba(20,184,166,0.12),transparent_42%)]"
        aria-hidden
      />
      <div className="relative space-y-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-700/85">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-700 sm:text-base">{description}</p>
          </div>

          {highlights.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {highlights.map((highlight) => (
                <div
                  key={`${highlight.label}-${highlight.value}`}
                  className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.6)] backdrop-blur"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">
                    {highlight.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-950">{highlight.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
