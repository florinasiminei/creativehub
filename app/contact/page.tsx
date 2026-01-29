import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa";

const SOCIAL_LINKS = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/cabn.ro",
    icon: FaFacebookF,
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/cabn.ro/",
    icon: FaInstagram,
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@cabn.ro",
    icon: FaTiktok,
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-transparent dark:text-white">
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600/80">
            cabn.ro
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Contact</h1>
          <p className="max-w-2xl text-base text-zinc-600 dark:text-zinc-300">
            Urmareste-ne pe social media sau scrie-ne direct pe WhatsApp.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-zinc-200/70 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <h2 className="text-xl font-semibold">Social media</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Descopera cabn.ro pe platformele tale preferate.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {SOCIAL_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-zinc-200/70 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:-translate-y-[1px] hover:border-emerald-200 hover:bg-emerald-50/60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-white dark:bg-emerald-900/30 dark:text-emerald-300">
                      <Icon />
                    </span>
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="contact-card">
            <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6 shadow-[0_28px_60px_-32px_rgba(15,23,42,0.65)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60">
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-emerald-100/40 dark:from-white/10 dark:via-transparent dark:to-emerald-500/10"
                aria-hidden="true"
              />
              <div className="relative flex flex-col gap-6 font-sans">
                <div className="space-y-2 text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600/80 dark:text-emerald-400/90">
                    contact rapid
                  </p>
                  <h2 id="contact-card" className="text-2xl font-bold leading-snug text-gray-900 dark:text-white">
                    Vorbim pe loc
                  </h2>
                  <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300">
                    Scrie-ne pe WhatsApp sau suna direct.
                  </p>
                </div>

                <div className="space-y-3">
                  <a
                    href="tel:0745298008"
                    className="group inline-flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#34D399] via-[#10B981] to-[#047857] px-5 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-[2px] hover:shadow-emerald-500/30 focus-visible:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10B981]"
                  >
                    <span aria-hidden="true" className="text-xl leading-none">
                      📞
                    </span>
                    <span>Suna acum</span>
                  </a>
                  <a
                    href="https://wa.me/40745298008"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex w-full items-center justify-center gap-3 rounded-xl border border-[#25D366] bg-white/40 px-5 py-4 text-base font-semibold text-[#0c4a2f] shadow-sm transition-all duration-300 hover:-translate-y-[2px] hover:bg-[#25D366]/10 hover:shadow-md focus-visible:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] dark:bg-transparent dark:text-[#25D366]"
                  >
                    <span aria-hidden="true" className="text-xl leading-none">
                      💬
                    </span>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366] text-white">
                      <FaWhatsapp className="h-4 w-4" />
                    </span>
                    <span>WhatsApp</span>
                  </a>
                </div>

                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                  0745 298 008 · cabn.ro
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
