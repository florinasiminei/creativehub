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
    <div className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80">
      <h2 className="text-2xl font-semibold text-emerald-950 dark:text-emerald-300">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">{description}</p>
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
    <div className="overflow-hidden rounded-[30px] border border-emerald-100 bg-white shadow-[0_24px_60px_-48px_rgba(15,23,42,0.35)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_24px_60px_-48px_rgba(0,0,0,0.8)]">
      <div className="border-b border-emerald-100 bg-[linear-gradient(135deg,rgba(220,252,231,0.7),rgba(255,255,255,0.98)_58%,rgba(236,253,245,0.92))] px-5 py-6 sm:px-7 sm:py-8 lg:px-9 dark:border-zinc-800 dark:bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,23,42,0.96)_58%,rgba(15,23,42,0.92))]">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-700/85 dark:text-emerald-200">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl dark:text-emerald-200">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-700 sm:text-base dark:text-gray-300">{description}</p>
        </div>
      </div>

      <div className="space-y-5 px-5 py-6 sm:px-7 sm:py-7 lg:px-9">
        {highlights.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {highlights.map((highlight) => (
              <div
                key={`${highlight.label}-${highlight.value}`}
                className="rounded-2xl border border-white/80 bg-white/78 px-4 py-3 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.6)] backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/70 dark:shadow-[0_16px_36px_-28px_rgba(0,0,0,0.75)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                  {highlight.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-950 dark:text-emerald-300">{highlight.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-5">{children}</div>
      </div>
    </div>
  );
}
