import type { Metadata } from "next";
import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp, FaPhoneAlt, FaEnvelope } from "react-icons/fa";
import ContactForm from "@/components/forms/ContactForm";

export const metadata: Metadata = {
  title: "Contact CABN | Cereri pentru cabane si pensiuni",
  description:
    "Scrie echipei CABN pentru marketing, foto-video si listari de cabane si pensiuni. Raspundem rapid cu o solutie clara.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact CABN",
    description:
      "Contacteaza echipa CABN pentru marketing, foto-video si listari de cabane si pensiuni.",
    url: "https://cabn.ro/contact",
    siteName: "cabn.ro",
    locale: "ro_RO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact CABN",
    description: "Contacteaza echipa CABN pentru marketing si listari turistice.",
  },
};

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
    <div className="relative min-h-screen bg-white text-zinc-900 dark:bg-transparent dark:text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_45%),radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.12),transparent_40%)]"
        aria-hidden="true"
      />
      <main className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-600/80">
            cabn.ro
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Contact CABN
          </h1>
          <p className="max-w-2xl text-base text-zinc-600 dark:text-zinc-300">
            Spune-ne ce vrei sa obtii cu proprietatea ta. Iti raspundem cu o propunere clara,
            fara promisiuni goale.
          </p>
          <div>
            <a
              href="#contact-form"
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700"
            >
              Solicita o oferta
            </a>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Raspundem de obicei in 24-48h. Pentru urgente, preferam mesaj scris (email sau WhatsApp).
          </p>
          <div>
            <a
              href="/about-us"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200"
            >
              Vezi cine suntem si cum lucram →
            </a>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section
            id="contact-form"
            className="scroll-mt-28 rounded-2xl border border-zinc-200/70 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70"
          >
            <h2 className="text-xl font-semibold">Spune-ne ce ai nevoie</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Trimite-ne un mesaj si revenim cu o solutie personalizata. Mesajul ajunge direct la
              marketing@cabn.ro.
            </p>
            <ContactForm />
          </section>

          <aside>
            <section
              aria-labelledby="contact-info"
              className="rounded-2xl border border-zinc-200/70 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70"
            >
              <h2 id="contact-info" className="text-xl font-semibold">
                Informatii utile
              </h2>
              <div className="mt-4 space-y-6 text-sm text-zinc-700 dark:text-zinc-300">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600/80">
                    Contact
                  </p>
                  <ul className="mt-3 space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 text-emerald-600 dark:text-emerald-300">
                        <FaEnvelope className="h-4 w-4" />
                      </span>
                      <div>
                        <a
                          href="mailto:marketing@cabn.ro"
                          className="font-semibold text-emerald-700 hover:underline dark:text-emerald-200"
                        >
                          marketing@cabn.ro
                        </a>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Preferam mesaj scris pentru a-ti raspunde cat mai clar.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 text-emerald-600 dark:text-emerald-300">
                        <FaWhatsapp className="h-4 w-4" />
                      </span>
                      <div>
                        <a
                          href="https://wa.me/40745298008"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-emerald-700 hover:underline dark:text-emerald-200"
                        >
                          WhatsApp
                        </a>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Pentru urgente, lasa un mesaj scurt si revenim rapid.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 text-emerald-600 dark:text-emerald-300">
                        <FaPhoneAlt className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                          0745 298 008
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Apeluri doar pentru programari stabilite in prealabil.
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="h-px bg-zinc-200/70 dark:bg-zinc-800" />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600/80">
                    Ce urmeaza
                  </p>
                  <ol className="mt-3 space-y-2">
                    <li>Confirmam mesajul si intelegem obiectivele tale.</li>
                    <li>Facem o evaluare rapida si propunem directia potrivita.</li>
                    <li>Primesti o oferta clara si pasii urmatori.</li>
                  </ol>
                </div>

                <div className="h-px bg-zinc-200/70 dark:bg-zinc-800" />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600/80">
                    Social media
                  </p>
                  <ul className="mt-3 space-y-2">
                    {SOCIAL_LINKS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.name}>
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-200 dark:hover:text-emerald-100"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                              <Icon className="h-3 w-3" />
                            </span>
                            {item.name}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="h-px bg-zinc-200/70 dark:bg-zinc-800" />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600/80">
                    Servicii CABN
                  </p>
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    Descopera pachetele de continut foto-video, SEO si social media dedicate
                    cabanelor si pensiunilor.
                  </p>
                  <a
                    href="/descoperaCABN"
                    className="mt-2 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-200 dark:hover:text-emerald-100"
                  >
                    Vezi serviciile CABN →
                  </a>
                </div>

                <div className="h-px bg-zinc-200/70 dark:bg-zinc-800" />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600/80">
                    Info legal
                  </p>
                  <dl className="mt-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-medium">Denumire firma</dt>
                      <dd>CABN S.R.L.</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-medium">CUI</dt>
                      <dd>52174972</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-medium">Nr. Reg. Com.</dt>
                      <dd>J2025053051007</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-medium">EUID</dt>
                      <dd>ROONRC.J2025053051007</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
