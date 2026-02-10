import Link from "next/link";
import type { Metadata } from "next";
import { Check, Zap, Target, Users, Camera, Globe } from "lucide-react";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cabn.ro";

export const metadata: Metadata = {
  title: "Despre CABN | Marketing pentru cabane si pensiuni",
  description:
    "Afla cum CABN ajuta cabanele si pensiunile din Romania sa creasca prin strategie digitala, foto-video si SEO.",
  alternates: {
    canonical: "/about-us",
  },
  openGraph: {
    title: "Despre CABN",
    description:
      "Echipa CABN ofera strategie digitala, productie foto-video si branding pentru cabane si pensiuni.",
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
    title: "Despre CABN",
    description: "Afla cum CABN sprijina brandurile de cabane si pensiuni din Romania.",
    images: ["/images/logo.svg"],
  },
};

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
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-12 sm:mb-16 space-y-4 sm:space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600/80 dark:text-emerald-400/90">
            Despre noi
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">Despre CABN</h1>
          
          {/* Clarification - Positioning */}
          <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-900/20 p-4 sm:p-6 my-4 sm:my-6">
            <p className="text-base sm:text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
              🎯 CABN.ro nu este o agentie de social media.
            </p>
            <p className="text-base sm:text-lg text-emerald-800 dark:text-emerald-200">
              Suntem partenerul tau de crestere pentru proprietati din turismul alternativ.
            </p>
          </div>

          <p className="max-w-3xl text-base sm:text-lg text-zinc-600 dark:text-zinc-300">
            Suntem creatori, strategi si tehnicieni care ajuta proprietatile de turism alternativ sa atraga cereri directe prin marketing digital, website si continut foto-video.
          </p>
        </header>

        {/* Cine suntem */}
        <section className="mb-12 sm:mb-16 space-y-6 sm:space-y-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Cine suntem</h2>
            <p className="text-base sm:text-lg text-zinc-700 dark:text-zinc-300">
              Suntem o echipă care combină gândirea analitică a corporativului cu o înțelegere profundă a turismului alternativ. Provenind din medii de marketing performant și producție de conținut, am construit o expertiză unică în prezentarea proprietăților care nu sunt simple cazări — sunt experiențe, reconexiuni, momente memorabile.
            </p>
          </div>

          {/* Why Our Experience Produces Results */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">De ce experiența noastră produce rezultate reale</h2>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
              <div className="rounded-xl border border-zinc-200/70 bg-white/80 p-4 sm:p-6 dark:border-white/10 dark:bg-zinc-900/60">
                <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3 text-emerald-600 dark:text-emerald-400">Background Corporate</h3>
                <p className="text-sm sm:text-base text-zinc-700 dark:text-zinc-300">
                  Înțelegem metricile, KPI-urile și gândirea strategică. Nu facem conținut pentru conținut — totul e legat de obiectivele tale.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200/70 bg-white/80 p-4 sm:p-6 dark:border-white/10 dark:bg-zinc-900/60">
                <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3 text-emerald-600 dark:text-emerald-400">Marketing de Performanță</h3>
                <p className="text-sm sm:text-base text-zinc-700 dark:text-zinc-300">
                  Fiecare proiect e măsurat prin impact real. Focus pe cereri directe, conversii și creșterea ratei de rezervare.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200/70 bg-white/80 p-4 sm:p-6 dark:border-white/10 dark:bg-zinc-900/60">
                <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3 text-emerald-600 dark:text-emerald-400">Storytelling Cinematic</h3>
                <p className="text-sm sm:text-base text-zinc-700 dark:text-zinc-300">
                  Diferențierea vizuală nu e lux — e necesitate. Facem ca proprietatea ta să se uite unic pe o piață plină.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Misiunea noastră</h2>
            <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-4 sm:p-6 dark:border-emerald-500/20 dark:bg-emerald-900/20">
              <p className="text-base sm:text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Ajutăm proprietarii să nu mai depindă doar de platforme de booking, ci să construiască branduri proprii care atrag oaspeți direct. Rolul nostru e să transformăm o proprietate într-o destinație, o cabană în locul unde oamenii îşi imaginează următoarea experiență memorabilă.
              </p>
            </div>
          </div>
        </section>

        {/* Ce facem */}
        <section className="mb-12 sm:mb-16 space-y-6 sm:space-y-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-8">Ce facem (și ce se întâmplă ca urmare)</h2>
            <p className="text-base sm:text-lg text-zinc-700 dark:text-zinc-300 mb-4 sm:mb-8">
              Nu vorbim doar despre servicii — vorbim despre efecte măsurabile. Iată ce realizăm:
            </p>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
              <div className="rounded-xl border border-zinc-200/70 bg-white/80 p-4 sm:p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/60">
                <Camera className="h-6 sm:h-8 w-6 sm:w-8 text-emerald-600 dark:text-emerald-400 mb-3 sm:mb-4" aria-hidden />
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white mb-2">Conținut care face oaspeții să-și imagineze experiența</h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                  Foto și video cinematic realizate cu drone profesionale și camere full-frame. Fiecare imagine invită, nu doar informează.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200/70 bg-white/80 p-4 sm:p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/60">
                <Globe className="h-6 sm:h-8 w-6 sm:w-8 text-emerald-600 dark:text-emerald-400 mb-3 sm:mb-4" aria-hidden />
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white mb-2">Website care crește încrederea și conversiile</h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                  Prezență online care nu doar arată frumos — construiește încredere și conduce la rezervări directe.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200/70 bg-white/80 p-4 sm:p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/60">
                <Users className="h-6 sm:h-8 w-6 sm:w-8 text-emerald-600 dark:text-emerald-400 mb-3 sm:mb-4" aria-hidden />
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white mb-2">Social media care aduce oaspeți potriviți</h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                  Strategie și conținut care atrage exact publicul care caută ce oferi tu — nu doar randări.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Rezultatul final</h3>
            <p className="text-base sm:text-lg text-zinc-700 dark:text-zinc-300 p-4 sm:p-6 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl border border-emerald-200/40 dark:border-emerald-500/20">
              Nu construim conținut — construim sisteme de promovare care generează cereri. Scopul fiecărui proiect e clar: mai multe oaspeți potriviți, rate mai bune de ocupare, brand mai puternic și mai puțină dependență de marketplace-uri.
            </p>
          </div>
        </section>

        {/* Cum lucrăm */}
        <section className="mb-12 sm:mb-16 space-y-6 sm:space-y-8">
          <h2 className="text-2xl sm:text-3xl font-bold">Cum lucrăm</h2>
          <p className="text-base sm:text-lg text-zinc-700 dark:text-zinc-300">
            Procesul nostru e simplu și rezultat-oriented: analizăm, planificăm, producem și optimizăm. Fiecare etapă are un scop clar — transformarea vizibilității în cereri reale.
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
                <div className="pb-6 sm:pb-8">
                  <h3 className="font-semibold text-base sm:text-lg text-zinc-900 dark:text-white">{title}</h3>
                  <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Observations Section */}
        <section className="mb-12 sm:mb-16 space-y-6 sm:space-y-8 bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-900/15 dark:to-emerald-900/15 rounded-2xl border border-blue-200/40 dark:border-blue-500/20 p-4 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold">Ce observăm constant la proprietățile cu care lucrăm</h2>
          <p className="text-base sm:text-lg text-zinc-700 dark:text-zinc-300">
            După lucru cu zeci de proprietăți, anumite rezultate se repetă. Nu sunt coincidențe — sunt consecința unei strategii bine gândite:
          </p>
          <div className="grid gap-3 sm:gap-6 grid-cols-1 md:grid-cols-2">
            <div className="flex gap-3 p-3 sm:p-4 bg-white/80 dark:bg-zinc-900/60 rounded-lg border border-zinc-200/50 dark:border-white/10">
              <Zap className="h-5 sm:h-6 w-5 sm:w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-1" aria-hidden />
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white mb-1">Creștere cereri directe</h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Proprietarii raportează mai multe mesaje și cereri care nu vin prin marketplace-uri.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 sm:p-4 bg-white/80 dark:bg-zinc-900/60 rounded-lg border border-zinc-200/50 dark:border-white/10">
              <Users className="h-5 sm:h-6 w-5 sm:w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-1" aria-hidden />
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white mb-1">Oaspeți mai potriviți</h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Oamenii care vin știu ce să se aștepte — de aceea sunt mai mulțumiți și mai rar negociază preț.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 sm:p-4 bg-white/80 dark:bg-zinc-900/60 rounded-lg border border-zinc-200/50 dark:border-white/10">
              <Target className="h-5 sm:h-6 w-5 sm:w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-1" aria-hidden />
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white mb-1">Mai puține negocieri de preț</h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Când oaspeții resimț valoarea din marketing, nu mai cer reduceri.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 sm:p-4 bg-white/80 dark:bg-zinc-900/60 rounded-lg border border-zinc-200/50 dark:border-white/10">
              <Zap className="h-5 sm:h-6 w-5 sm:w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-1" aria-hidden />
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white mb-1">Brand mai recognoscibil</h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Proprietatea devine un loc despre care oamenii povestesc — și recomandă prietenilor.</p>
              </div>
            </div>
          </div>
        </section>

        {/* De ce CABN.ro */}
        <section className="mb-12 sm:mb-16 space-y-6 sm:space-y-8">
          <h2 className="text-2xl sm:text-3xl font-bold">De ce CABN.ro</h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
            <div className="flex gap-3 sm:gap-4 p-4 sm:p-6 rounded-xl border border-zinc-200/70 bg-white/80 dark:border-white/10 dark:bg-zinc-900/60">
              <Target className="h-5 sm:h-6 w-5 sm:w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-1" aria-hidden />
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white mb-1">Noi înțelegem turismul alternativ</h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Nu e doar cazare — e experiență, reconexiune, momente memorabile. Asta se vede în fiecare proiect.</p>
              </div>
            </div>
            <div className="flex gap-3 sm:gap-4 p-4 sm:p-6 rounded-xl border border-zinc-200/70 bg-white/80 dark:border-white/10 dark:bg-zinc-900/60">
              <Users className="h-5 sm:h-6 w-5 sm:w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-1" aria-hidden />
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white mb-1">Fiecare proiect = strategia noastră</h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Tratăm proprietatea ta ca pe propria noastră afacere. Succesul tău e succesul nostru.</p>
              </div>
            </div>
            <div className="flex gap-3 sm:gap-4 p-4 sm:p-6 rounded-xl border border-zinc-200/70 bg-white/80 dark:border-white/10 dark:bg-zinc-900/60">
              <Zap className="h-5 sm:h-6 w-5 sm:w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-1" aria-hidden />
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white mb-1">Rezultate măsurabile</h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Nu promisiuni — creștere reală de rezervări, rate mai bune de ocupare și brand mai puternic.</p>
              </div>
            </div>
            <div className="flex gap-3 sm:gap-4 p-4 sm:p-6 rounded-xl border border-zinc-200/70 bg-white/80 dark:border-white/10 dark:bg-zinc-900/60">
              <Camera className="h-5 sm:h-6 w-5 sm:w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-1" aria-hidden />
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white mb-1">Calitate premium de producție</h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Drone, camere full-frame, flux de lucru organizat — fiecare pixel e o investiție în succesul tău.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Ce cred noi — valori și emoție */}
        <section className="mb-12 sm:mb-16 space-y-6 sm:space-y-8">
          <h2 className="text-2xl sm:text-3xl font-bold">Ce cred noi</h2>
          
          {/* Emotional Component */}
          <div className="rounded-xl border border-emerald-300/50 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 p-4 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-emerald-900 dark:text-emerald-100">Proprietățile sunt locuri de reconectare</h3>
            <p className="text-base sm:text-lg text-emerald-800 dark:text-emerald-200 leading-relaxed">
              O cabană nu e doar patru pereți și un loc de dormit. E un spațiu unde oamenii se deconectează de zgomotul zilei, se reconnectează cu natura și cu cei dragi. Rolul nostru e să transmitem asta online — emoția, autenticitatea, promisiunea unei experiențe memorabile. Fiecare fotografie, fiecare video, fiecare cuvânt pe care-l scriem trebuie să spună această poveste.
            </p>
          </div>

          {/* Core Values */}
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-2xl border border-emerald-200/40 dark:border-emerald-500/20 p-4 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Valorile care ne ghidează</h3>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <Check className="h-4 sm:h-5 w-4 sm:w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <h4 className="font-semibold text-sm sm:text-base">Calitate Premium</h4>
                </div>
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                  Nu facem compromisuri. Fiecare detaliu e gândit pentru impact.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <Check className="h-4 sm:h-5 w-4 sm:w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <h4 className="font-semibold text-sm sm:text-base">Gândire Strategică</h4>
                </div>
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                  Fiecare acțiune e legată de obiectivele tale — nu facem conținut pentru conținut.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <Check className="h-4 sm:h-5 w-4 sm:w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <h4 className="font-semibold text-sm sm:text-base">Rezultate Concrete</h4>
                </div>
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                  Doar rezultate măsurabile — creșterea rezervărilor și a vizibilității sunt metricile noastre.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mb-12 sm:mb-16 space-y-4 sm:space-y-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">Gata de schimbare?</h2>
          <p className="text-base sm:text-lg text-zinc-700 dark:text-zinc-300 max-w-2xl mx-auto px-2">
            Dacă ai o cabană, o pensiune sau o proprietate specială, te ajutăm să o arăți lumii așa cum merită.
          </p>
          <div className="flex flex-col gap-3 sm:gap-4 justify-center px-4">
            <Link
              href="/descoperaCABN"
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 sm:px-8 py-2.5 sm:py-3 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700 transition"
            >
              Explorează serviciile noastre
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border-2 border-emerald-600 px-6 sm:px-8 py-2.5 sm:py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
            >
              Hai să discutăm
            </Link>
          </div>
        </section>

        {/* Portfolio Link */}
        <section className="text-center py-8 sm:py-12 border-t border-zinc-200 dark:border-white/10">
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mb-3 sm:mb-4 px-4">
            Vrei să vezi ce am realizat deja?
          </p>
          <Link
            href="/descoperaCABN"
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline text-sm sm:text-base inline-block px-4"
          >
            Vizitează portofoliul nostru complet →
          </Link>
        </section>
      </main>
    </div>
  );
}
