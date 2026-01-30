import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa";
import ContactForm from "@/components/forms/ContactForm";

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
            Suntem aici pentru colaborari de marketing, intrebari despre listari si propuneri de parteneriat.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className="rounded-2xl border border-zinc-200/70 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <h2 className="text-xl font-semibold">Spune-ne ce ai nevoie</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Trimite-ne un mesaj si revenim cu o solutie personalizata. Mesajul ajunge direct la marketing@cabn.ro.
            </p>
            <ContactForm />
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border border-zinc-200/70 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <h2 className="text-xl font-semibold">Social media</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Descopera cabn.ro pe platformele tale preferate.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
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

            <section className="rounded-2xl border border-zinc-200/70 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <h2 className="text-xl font-semibold">Info legal</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Date relevante pentru comunicari oficiale.
              </p>
              <dl className="mt-4 space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-medium">Denumire firma</dt>
                  <dd className="text-zinc-500 dark:text-zinc-400">CABN S.R.L.</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-medium">CUI</dt>
                  <dd className="text-zinc-500 dark:text-zinc-400">52174972</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-medium">Nr. Reg. Com.</dt>
                  <dd className="text-zinc-500 dark:text-zinc-400">J2025053051007</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-medium">EUID</dt>
                  <dd className="text-zinc-500 dark:text-zinc-400">ROONRC.J2025053051007</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-emerald-200/60 bg-emerald-50/60 p-6 text-emerald-900 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-900/20 dark:text-emerald-100">
              <h2 className="text-lg font-semibold">Vrei promovare completa?</h2>
              <p className="mt-2 text-sm text-emerald-700/90 dark:text-emerald-200/90">
                Descopera pachetele de continut foto-video, SEO si social media pentru cabane si pensiuni.
              </p>
              <a
                href="/descoperaCABN"
                className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
              >
                Vezi serviciile CABN
              </a>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
