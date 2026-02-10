import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Camera,
  Globe,
  Share2,
  Video,
  Check,
  TrendingUp,
  Target,
  Zap,
} from "lucide-react";
import ContactForm from "@/components/forms/ContactForm";
import { getCanonicalSiteUrl, toCanonicalUrl } from "@/lib/siteUrl";

const siteUrl = getCanonicalSiteUrl();

export const metadata: Metadata = {
  title: "Servicii",
  description:
    "Servicii de promovare pentru proprietăți turistice: strategie, foto-video, website, social media, proces clar și CTA direct.",
  alternates: {
    canonical: toCanonicalUrl("/servicii"),
  },
  openGraph: {
    title: "Servicii",
    description:
      "Vezi ce oferim concret: pachete, servicii specifice, proces de lucru și modalități de colaborare.",
    url: `${siteUrl}/servicii`,
    siteName: "cabn.ro",
    locale: "ro_RO",
    type: "website",
    images: [
      {
        url: "/images/logo.svg",
        width: 1200,
        height: 630,
        alt: "cabn.ro",
      },
    ],
  },
};

const SERVICES = [
  {
    title: "Foto & Video Cinematic",
    description:
      "Conținut premium realizat cu drone profesionale și camere full-frame, pentru a evidenția diferențiatorii reali ai proprietății.",
    Icon: Camera,
  },
  {
    title: "Drone Shots",
    description:
      "Cadre aeriene pentru prezentare completă a locației, contextului și accesului, utile atât în social media, cât și în vânzare directă.",
    Icon: Video,
  },
  {
    title: "Website & SEO",
    description:
      "Website rapid, orientat pe conversie, cu structură SEO și mesaje clare pentru rezervări directe.",
    Icon: Globe,
  },
  {
    title: "Social Media Management",
    description:
      "Plan editorial, producție de conținut, publicare și optimizare continuă pentru canalele potrivite brandului tău.",
    Icon: Share2,
  },
];

const PACKAGES = [
  {
    name: "Launch",
    description:
      "Pentru proprietăți care au nevoie de fundație: poziționare, conținut esențial și pagină de prezentare.",
    includes: [
      "Audit de poziționare",
      "Sesiune foto/video scurtă",
      "Pagină de prezentare",
      "Recomandări de comunicare",
    ],
  },
  {
    name: "Growth",
    description:
      "Pentru proprietăți care vor creștere constantă: conținut recurent, website optimizat și execuție multi-canal.",
    includes: [
      "Calendar editorial",
      "Conținut foto/video recurent",
      "Optimizări website & SEO",
      "Raport lunar de performanță",
    ],
  },
  {
    name: "Partnership",
    description:
      "Colaborare extinsă, cu suport strategic și operațional pentru branduri care scalează.",
    includes: [
      "Plan trimestrial de creștere",
      "Producție extinsă și campanii",
      "Suport comercial pe funnel",
      "Revizuire KPI și optimizare",
    ],
  },
];

const rawWhatsApp = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "";
const cleanedWhatsApp = rawWhatsApp.replace(/\D+/g, "");
const whatsappLink = cleanedWhatsApp ? `https://wa.me/${cleanedWhatsApp}` : null;

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-transparent dark:text-white">
      <section className="relative overflow-hidden [margin-left:calc(50%-50vw)] [margin-right:calc(50%-50vw)] -mt-6 md:-mt-6">
        <div className="relative h-[58vh] min-h-[390px]">
          <Image
            src="https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=2200&q=80"
            alt="Servicii cabn"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">
                Servicii cabn
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                Crestere clara pentru proprietati care vor rezultate reale.
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-white/90 sm:text-base">
                Strategie, continut, website si executie comerciala pentru
                rezervari directe si brand puternic.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Solicita o discutie
                </Link>
                <a
                  href="#pachete"
                  className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
                >
                  Vezi pachetele
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="space-y-4 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
            Servicii
          </p>
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Ce oferim concret
          </h2>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-300 sm:text-base">
            Servicii orientate pe rezultat: poziționare, conținut, website și
            comunicare, cu proces clar și pași măsurabili.
          </p>
        </header>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold">Servicii specifice</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map(({ title, description, Icon }) => (
              <article
                key={title}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <Icon className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                <h3 className="mt-3 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="pachete" className="mt-10">
          <h2 className="text-2xl font-semibold">Pachete</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {PACKAGES.map((pkg) => (
              <article
                key={pkg.name}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <h3 className="text-lg font-semibold">{pkg.name}</h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  {pkg.description}
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {pkg.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-2xl font-semibold">Procesul de lucru</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { step: "1", label: "Analiză", desc: "Context, obiective, poziționare." },
              { step: "2", label: "Strategie", desc: "Direcție de comunicare și funnel." },
              { step: "3", label: "Producție", desc: "Execuție foto-video și copy." },
              { step: "4", label: "Implementare", desc: "Website, social media, active digitale." },
              { step: "5", label: "Optimizare", desc: "Măsurare KPI și ajustări." },
            ].map((item) => (
              <article key={item.step} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                  {item.step}
                </p>
                <h3 className="mt-3 font-semibold">{item.label}</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  {item.desc}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold">Exemple de impact</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <h3 className="mt-2 font-semibold">Creștere cereri directe</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Claritate în ofertă și mesaj, cu mai puțină dependență de
                platforme terțe.
              </p>
            </article>
            <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <Target className="h-5 w-5 text-emerald-600" />
              <h3 className="mt-2 font-semibold">Public mai potrivit</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Calibrare mai bună între promisiune, preț și experiența oferită.
              </p>
            </article>
            <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <Zap className="h-5 w-5 text-emerald-600" />
              <h3 className="mt-2 font-semibold">Brand mai puternic</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Identitate vizuală și narativă coerentă, susținută în timp.
              </p>
            </article>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <h2 className="text-2xl font-semibold">Solicită o discuție</h2>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            Spune-ne pe scurt unde ești acum și ce obiectiv ai. Revenim cu o
            recomandare clară de pachet și pași.
          </p>
          <div className="mt-5">
            <ContactForm />
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Mergi la contact
            </Link>
            {whatsappLink ? (
              <Link
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-emerald-300 px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
              >
                Discută pe WhatsApp
              </Link>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
