import Link from "next/link";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cabn.ro";

export const metadata: Metadata = {
  title: "Atractii",
  description:
    "Atractii si experiente locale langa cabane si pensiuni. In curand, lista completa.",
  alternates: {
    canonical: "/atractii",
  },
  openGraph: {
    title: "Atractii",
    description: "Atractii si experiente locale langa cabane si pensiuni.",
    url: `${siteUrl}/atractii`,
    siteName: "cabn.ro",
    locale: "ro_RO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Atractii",
    description: "Atractii si experiente locale langa cabane si pensiuni.",
  },
};

export default function AtractiiPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-transparent dark:text-white">
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600/80">
            cabn.ro
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Atractii</h1>
          <p className="max-w-2xl text-base text-zinc-600 dark:text-zinc-300">
            Pregatim ghidul cu atractii, trasee si experiente locale. Va fi locul unde
            descoperi ce merita vazut langa fiecare cazare.
          </p>
        </header>

        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 text-emerald-900 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-900/20 dark:text-emerald-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 text-emerald-700 shadow-sm dark:bg-white/10 dark:text-emerald-200">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
                <path
                  d="M12 3l7 3v6c0 5-4 8-7 9-3-1-7-4-7-9V6l7-3z"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.5 12.5l1.6 1.6L15 10.2"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Inca nu exista atractii listate</h2>
              <p className="text-sm text-emerald-900/80 dark:text-emerald-100/80">
                Lucram la primele recomandari. Revino curand sau scrie-ne ce zona vrei sa
                acoperim.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
            >
              Spune-ne ce cauti
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-emerald-200 px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100/70 dark:border-emerald-500/30 dark:text-emerald-100 dark:hover:bg-emerald-500/10"
            >
              Vezi cazari
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
