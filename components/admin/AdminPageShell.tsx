import type { ReactNode } from "react";

type AdminPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
};

export default function AdminPageShell({
  eyebrow,
  title,
  description,
  actions,
  summary,
  children,
}: AdminPageShellProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-emerald-100/70 bg-[linear-gradient(135deg,rgba(236,253,245,0.9),rgba(255,255,255,0.98)_42%,rgba(240,253,250,0.9))] p-5 shadow-[0_30px_80px_-50px_rgba(4,120,87,0.35)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700/85">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-700 sm:text-base">{description}</p>
          </div>

          {actions && <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[280px]">{actions}</div>}
        </div>

        {summary && <div className="mt-5">{summary}</div>}
      </section>

      <div className="space-y-6">{children}</div>
    </div>
  );
}
