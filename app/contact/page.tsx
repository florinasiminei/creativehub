import type { Metadata } from "next";
import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp, FaPhoneAlt, FaEnvelope } from "react-icons/fa";
import ContactForm from "@/components/forms/ContactForm";
import { getCanonicalSiteUrl, toCanonicalUrl } from "@/lib/siteUrl";

const siteUrl = getCanonicalSiteUrl();
const defaultSocialImage = "/images/og-default.png";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Scrie echipei cabn pentru marketing, foto-video și listări de cabane și pensiuni. Răspundem rapid cu o soluție clară.",
  alternates: {
    canonical: toCanonicalUrl("/contact"),
  },
  openGraph: {
    title: "Contact",
    description:
      "Contactează echipa cabn pentru marketing, foto-video și listări de cabane și pensiuni.",
    url: `${siteUrl}/contact`,
    siteName: "cabn",
    locale: "ro_RO",
    type: "website",
    images: [
      {
        url: defaultSocialImage,
        width: 1200,
        height: 630,
        alt: "Contact cabn.ro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact",
    description: "Contactează echipa cabn pentru marketing și listări turistice.",
    images: [defaultSocialImage],
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
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.06),rgba(16,185,129,0.02)_35%,transparent_60%),radial-gradient(circle_at_70%_0%,rgba(16,185,129,0.04),transparent_40%)]"
        style={{ top: "-1.5rem" }}
        aria-hidden="true"
      />
      <main className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-8 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-600/80">
            cabn.ro
          </p>
          <h1 className="text-3xl font-bold tracking-tight leading-tight sm:text-4xl lg:text-5xl">
            Contact cabn.ro
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-base">
            Spune-ne ce vrei să obții cu proprietatea ta. Îți răspundem cu o propunere clară,
            fără promisiuni goale.
          </p>
          <div>
            <a
              href="#contact-form"
              className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-800"
            >
              Solicită o ofertă
            </a>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Răspundem de obicei în 24-48h. Pentru urgențe, preferăm mesaj scris (email sau WhatsApp).
          </p>
          <div>
            <a
              href="/about-us"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200"
            >
              Vezi cine suntem și cum lucrăm →
            </a>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section
            id="contact-form"
            className="scroll-mt-28 rounded-2xl border border-zinc-200/70 bg-white/95 p-6 shadow-[0_10px_25px_-18px_rgba(15,23,42,0.25)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70"
          >
            <h2 className="text-xl font-semibold">Spune-ne ce ai nevoie</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Trimite-ne un mesaj și revenim cu o soluție personalizată. Mesajul ajunge direct la
              marketing@cabn.ro.
            </p>
            <ContactForm />
          </section>

          <aside>
            <section
              aria-labelledby="contact-info"
              className="rounded-2xl border border-zinc-200/70 bg-zinc-50/90 p-6 shadow-[0_10px_25px_-18px_rgba(15,23,42,0.25)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60"
            >
              <h2 id="contact-info" className="text-xl font-semibold">
                Informații utile
              </h2>
              <div className="mt-4 space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600/80">
                    Contact
                  </p>
                  <ul className="mt-3 space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 text-emerald-600 dark:text-emerald-300">
                        <FaEnvelope className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <a
                          href="mailto:marketing@cabn.ro"
                          className="font-semibold text-emerald-700 hover:underline dark:text-emerald-200"
                        >
                          marketing@cabn.ro
                        </a>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Preferăm mesaj scris pentru a-ți răspunde cât mai clar.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 text-emerald-600 dark:text-emerald-300">
                        <FaWhatsapp className="h-3.5 w-3.5" />
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
                          Pentru urgențe, lasă un mesaj scurt și revenim rapid.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 text-emerald-600 dark:text-emerald-300">
                        <FaPhoneAlt className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                          0745 298 008
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Apeluri doar pentru programări stabilite în prealabil.
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="h-px bg-zinc-200/70 dark:bg-zinc-800" />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600/80">
                    Ce urmează
                  </p>
                  <ol className="mt-3 space-y-2">
                    <li>Confirmăm mesajul și înțelegem obiectivele tale.</li>
                    <li>Facem o evaluare rapidă și propunem direcția potrivită.</li>
                    <li>Primești o ofertă clară și pașii următori.</li>
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
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                            <Icon className="h-2.5 w-2.5" />
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
                    Servicii cabn
                  </p>
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    Descoperă pachetele de conținut foto-video, SEO și social media dedicate
                    cabanelor și pensiunilor.
                  </p>
                  <a
                    href="/servicii"
                    className="mt-2 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-200 dark:hover:text-emerald-100"
                  >
                    Vezi serviciile cabn →
                  </a>
                </div>

                <div className="h-px bg-zinc-200/70 dark:bg-zinc-800" />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600/80">
                    Info legal
                  </p>
                  <dl className="mt-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-medium">Denumire firmă</dt>
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


