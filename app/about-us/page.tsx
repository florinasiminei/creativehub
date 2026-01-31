import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Check, Zap, Target, Users, Camera, Globe } from "lucide-react";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cabn.ro";

export const metadata: Metadata = {
  title: "Despre CABN.ro | Promovare Digitală Premium pentru Cabane și Pensiuni",
  description:
    "Descoperă povestea CABN.ro. Transformăm proprietăți unice din România în branduri memorabile prin strategie digitală, foto-video și social media profesionale.",
  alternates: {
    canonical: "/about-us",
  },
  openGraph: {
    title: "Despre CABN.ro",
    description:
      "O echipă tânără cu experiență solidă în marketing digital, web development și producție foto-video. Transformăm proprietăți în branduri memorabile.",
    url: `${siteUrl}/about-us`,
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
  twitter: {
    card: "summary_large_image",
    title: "Despre CABN.ro",
    description:
      "Descoperă echipa CABN.ro și cum transformăm proprietăți în branduri memorabile.",
    images: ["/images/logo.svg"],
  },
};

const WHY_US = [
  {
    icon: Target,
    title: "Înțelegem turismul modern",
    description: "Știm ce caută oaspeții, cum gândesc și ce îi convinge să rezerve.",
  },
  {
    icon: Zap,
    title: "Experiență multi-disciplinară",
    description: "Marketing, creație, web development și producție de conținut de top.",
  },
  {
    icon: Users,
    title: "Fiecare proiect = brandul nostru",
    description: "Tratăm proprietatea ta ca pe propria noastră afacere. Rezultatele tale sunt rezultatele noastre.",
  },
  {
    icon: Camera,
    title: "Echipamente și proces premium",
    description: "Drone profesionale, camere full-frame, și flux de lucru organizat de la concept la livrare.",
  },
];

const SERVICES_OVERVIEW = [
  {
    title: "Content foto-video cinematic",
    description: "Realizat cu drone profesionale și camere full-frame, cu standar de producție premium.",
    icon: Camera,
  },
  {
    title: "Website-uri de conversie",
    description: "Rapide, curate și optimizate pentru rezervări. Fiecare pixel contează.",
    icon: Globe,
  },
  {
    title: "Social media management",
    description: "Creare și administrare pagini cu vizibilitate reală și conținut care atrage publicul potrivit.",
    icon: Users,
  },
];

const PROCESS = [
  { step: 1, title: "Analiză", description: "Analizăm povestea și potențialul proprietății tale." },
  { step: 2, title: "Strategie", description: "Planificăm conceptul vizual și strategia de comunicare." },
  { step: 3, title: "Producție", description: "Filmări și fotografii de înaltă calitate cu echipamente de ultimă generație." },
  { step: 4, title: "Editare", description: "Materiale editate profesional pentru aspect premium și impact maxim." },
  { step: 5, title: "Livrare", description: "Conținut optimizat pentru web, social media și platforme de rezervări." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-transparent dark:text-white">
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-16 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600/80 dark:text-emerald-400/90">
            Despre noi
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">La CABN.ro</h1>
          <p className="max-w-3xl text-lg text-zinc-600 dark:text-zinc-300">
            Suntem o echipă tânără, dar cu o experiență solidă în marketing digital, social media, web development și producție foto-video profesională. Am pornit ca foști corporatiști pasionați de natură și aventură, iar astăzi ne dedicăm unui singur lucru: să transformăm proprietățile unice din România în branduri memorabile.
          </p>
        </header>

        {/* Cine suntem */}
        <section className="mb-16 space-y-8">
          <div>
            <h2 className="text-3xl font-bold mb-4">Cine suntem</h2>
            <p className="text-lg text-zinc-700 dark:text-zinc-300">
              Suntem creatori, strategi și tehnicieni. Combinăm gândirea analitică dobândită în mediul corporate cu un stil vizual modern, cinematografic, construit special pentru piața de turism alternativ — cabane premium, pensiuni, proprietăți boutique și retreat-uri.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold mb-4">Misiune & Viziune</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-6 dark:border-emerald-500/20 dark:bg-emerald-900/20">
                <h3 className="font-bold text-emerald-900 dark:text-emerald-100 mb-2">Misiunea noastră</h3>
                <p className="text-zinc-700 dark:text-zinc-300">
                  Ridicăm la nivel premium prezentarea proprietăților din România, transformând-o în coloană vertebrală a succesului lor comercial.
                </p>
              </div>
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-6 dark:border-amber-500/20 dark:bg-amber-900/20">
                <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-2">Viziunea noastră</h3>
                <p className="text-zinc-700 dark:text-zinc-300">
                  Devenim standardul de excelență în promovarea digitală a cabanelor, pensiunilor și proprietăților unice din România.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Ce facem */}
        <section className="mb-16 space-y-8">
          <div>
            <h2 className="text-3xl font-bold mb-8">Ce facem</h2>
            <p className="text-lg text-zinc-700 dark:text-zinc-300 mb-8">
              CABN.ro oferă servicii complete de promovare digitală, gândite pentru proprietarii care vor mai mult decât simple fotografii.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {SERVICES_OVERVIEW.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-xl border border-zinc-200/70 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/60">
                  <Icon className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-4" aria-hidden />
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">{title}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">Scopul nostru</h3>
            <p className="text-lg text-zinc-700 dark:text-zinc-300 p-6 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl border border-emerald-200/40 dark:border-emerald-500/20">
              Te ajutăm să prezinți proprietatea ta la adevăratul ei potențial. Facem proprietățile vizibile pentru publicul potrivit și creștem rata de rezervare și vizibilitatea online.
            </p>
          </div>
        </section>

        {/* Cum lucrăm */}
        <section className="mb-16 space-y-8">
          <h2 className="text-3xl font-bold">Cum lucrăm</h2>
          <p className="text-lg text-zinc-700 dark:text-zinc-300">
            Procesul nostru este clar, profesionist și eficient. Totul este gândit pentru a transmite emoție, autenticitate și valoare.
          </p>
          <div className="space-y-4">
            {PROCESS.map(({ step, title, description }, index) => (
              <div key={step} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-500 text-white font-bold shadow-lg">
                    {step}
                  </div>
                  {index < PROCESS.length - 1 && (
                    <div className="w-1 h-12 bg-gradient-to-b from-emerald-500 to-emerald-200 dark:from-emerald-400 dark:to-emerald-600" />
                  )}
                </div>
                <div className="pb-8">
                  <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">{title}</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* De ce CABN.ro */}
        <section className="mb-16 space-y-8">
          <h2 className="text-3xl font-bold">De ce CABN.ro</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {WHY_US.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4 p-6 rounded-xl border border-zinc-200/70 bg-white/80 dark:border-white/10 dark:bg-zinc-900/60">
                <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" aria-hidden />
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">{title}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Valorile noastre */}
        <section className="mb-16 space-y-8 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-2xl border border-emerald-200/40 dark:border-emerald-500/20 p-8">
          <h2 className="text-3xl font-bold">Valorile noastre</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <h3 className="font-semibold">Calitate Premium</h3>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Fiecare detaliu contează. Nu facem compromisuri pe calitate.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <h3 className="font-semibold">Storytelling Vizual</h3>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Transformăm fapte în emoții. Fiecare imagine spune o poveste.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <h3 className="font-semibold">Rezultate Măsurabile</h3>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Nu ne mulțumim cu promisiuni. Creșterea rezervărilor este obiectivul nostru.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mb-16 space-y-6 text-center">
          <h2 className="text-3xl font-bold">Gata de schimbare?</h2>
          <p className="text-lg text-zinc-700 dark:text-zinc-300 max-w-2xl mx-auto">
            Dacă ai o cabană, o pensiune sau o proprietate specială, te ajutăm să o arăți lumii așa cum merită.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/descoperaCABN"
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700 transition"
            >
              Explorează serviciile noastre
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border-2 border-emerald-600 px-8 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
            >
              Hai să discutăm
            </Link>
          </div>
        </section>

        {/* Portfolio Link */}
        <section className="text-center py-12 border-t border-zinc-200 dark:border-white/10">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Vrei să vezi ce am realizat deja?
          </p>
          <Link
            href="/descoperaCABN"
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
          >
            Vizitează portofoliul nostru complet →
          </Link>
        </section>
      </main>
    </div>
  );
}
