import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Camera, Globe, Share2, Video, Check, Zap, Target, Users, TrendingUp, MessageSquare } from "lucide-react";
import ContactForm from "@/components/forms/ContactForm";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cabn.ro";

export const metadata: Metadata = {
  title: "Promovare digitala pentru cabane si pensiuni",
  description:
    "Servicii complete de promovare pentru cazari turistice, cabane si pensiuni in Romania: foto-video cinematic, website profesional, social media management. Crestem ocuparea si vizibilitatea.",
  alternates: {
    canonical: "/descoperaCABN",
  },
  openGraph: {
    title: "Promovare digitala pentru cabane si pensiuni",
    description:
      "Promovare digitala pentru cazari turistice si cabane: strategie completa, foto-video cinematic, marketing social. Transformam proprietati in branduri memorabile.",
    url: `${siteUrl}/descoperaCABN`,
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
    title: "Promovare digitala pentru cabane si pensiuni",
    description:
      "Promovare digitala pentru cazari turistice, cabane si pensiuni: foto-video, website SEO, social media management.",
    images: ["/images/logo.svg"],
  },
};

const SERVICES = [
  {
    title: "Foto & Video Cinematic",
    description:
      "Conținut vizual de standarde cinematice realizat cu drone profesionale și camere full-frame. Surprindem emoția și autenticitatea locației tale.",
    Icon: Camera,
  },
  {
    title: "Drone Shots",
    description:
      "Imagini aeriene care atrag priviri în social media și oferă o perspectivă unica proprietății. Oaspeții înțeleg mai bine zona și se simt mai atrage.",
    Icon: Video,
  },
  {
    title: "Website & SEO",
    description:
      "Site-uri rapide, curate și optimizate pentru Google. Oaspeții te găsesc ușor online, iar designul promovează conversii și rezervări.",
    Icon: Globe,
  },
  {
    title: "Social Media Management",
    description:
      "Administrare completă a paginilor tale cu conținut strategic. Construim un brand coerent care atrage publicul potrivit.",
    Icon: Share2,
  },
];

const WHY_CHOOSE = [
  {
    icon: Target,
    title: "Înțelegem piața",
    description: "Știm ce caută oaspeții și cum îi convingem să aleagă proprietatea ta.",
  },
  {
    icon: Zap,
    title: "Experiență multi-disciplinară",
    description: "Marketing, web development, video production - totul sub o umbrelă.",
  },
  {
    icon: Users,
    title: "Partnership cu rezultate",
    description: "Creșterea ocupării și vizibilității tale sunt obiectivele noastre.",
  },
  {
    icon: Camera,
    title: "Echipamente de top",
    description: "Drone profesionale, camere full-frame, și proces de producție premium.",
  },
];

const rawWhatsApp = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "";
const cleanedWhatsApp = rawWhatsApp.replace(/\D+/g, "");
const WHATSAPP_LINK = cleanedWhatsApp ? `https://wa.me/${cleanedWhatsApp}` : null;

export default function DescoperaCabn() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-transparent dark:text-white">
      {/* Hero Section */}
      <section className="relative min-h-[80dvh] overflow-hidden [margin-left:calc(50%-50vw)] [margin-right:calc(50%-50vw)] -mt-6 md:-mt-6">
        <Image
          src="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=2000&q=80"
          alt="Servicii premium de promovare"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/35 to-black/20" />
        <div className="absolute inset-0 bg-black/25" />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-6 text-center text-white gap-2 sm:gap-3 md:gap-6">
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold max-w-3xl leading-tight">
            Transformăm proprietăți unice în branduri memorabile.
          </h1>

          <p className="text-white/90 max-w-2xl text-sm sm:text-base lg:text-lg">
            Video cinematic. Website de conversie. Strategie digitală care aduce oaspeții potriviți.
          </p>

          <div className="text-white/80 text-xs sm:text-sm lg:text-base max-w-2xl">
            Nu suntem o agenție. Suntem partenerii tăi de creștere în turismul alternativ.
          </div>

          <Link
            href="#analiza"
            className="rounded-full bg-amber-500 px-5 sm:px-8 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-black shadow-lg hover:bg-amber-400 transition inline-flex items-center gap-2 mt-2 sm:mt-4"
          >
            Solicită o analiză personalizată
          </Link>
        </div>
      </section>

      {/* Intro Section */}
      {/* Positioning Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="space-y-4 sm:space-y-6 md:space-y-8 text-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">CABN.ro nu este o agentie generala</h2>
            <p className="text-base sm:text-lg md:text-xl text-zinc-700 dark:text-zinc-300 font-semibold text-amber-600 dark:text-amber-400">
              Suntem partener de crestere pentru proprietati din turism alternativ.
            </p>
          </div>
          
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-900/20 p-5 sm:p-6 md:p-8 text-left">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-bold text-base sm:text-lg text-emerald-800 dark:text-emerald-200">
                  Te ajutam daca:
                </h3>
                <span className="text-xs sm:text-sm text-emerald-700/80 dark:text-emerald-200/80">
                  Focus pe crestere sustenabila
                </span>
              </div>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-semibold">
                    ✓
                  </span>
                  <span className="text-sm sm:text-base text-zinc-700 dark:text-zinc-200">
                    Vrei sa cresti rate de ocupare (30-50%+ in 6 luni)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-semibold">
                    ✓
                  </span>
                  <span className="text-sm sm:text-base text-zinc-700 dark:text-zinc-200">
                    Esti serios cu investitia in brand si marketing
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-semibold">
                    ✓
                  </span>
                  <span className="text-sm sm:text-base text-zinc-700 dark:text-zinc-200">
                    Cauti strategie pe termen lung, nu doar promovare punctuala
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section - After Context */}
      <section id="analiza" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="space-y-6 sm:space-y-8 md:space-y-12">
          <div className="text-center space-y-2 sm:space-y-3 md:space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold">Rezultatele pe care le vedem frecvent</h2>
            <p className="text-sm sm:text-base md:text-lg text-zinc-700 dark:text-zinc-300">
              Proprietățile care implementează sistemul nostru complet de promovare observă:
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
              <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                <TrendingUp className="h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0.5 md:mt-1" />
                <div>
                  <p className="font-semibold text-sm sm:text-base md:text-lg text-zinc-900 dark:text-white">Creșteri de 30-60% în cereri directe</p>
                  <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-xs md:text-sm mt-0.5 sm:mt-1">Oaspeții interesați găsesc ușor proprietatea și au fiducia să se gândească serios.</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
              <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                <Users className="h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0.5 md:mt-1" />
                <div>
                  <p className="font-semibold text-sm sm:text-base md:text-lg text-zinc-900 dark:text-white">Oaspeți mai bine potriviți</p>
                  <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-xs md:text-sm mt-0.5 sm:mt-1">Brandingul clar atrage publicul care e pe o lungime de undă cu proprietatea ta.</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
              <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                <Target className="h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0.5 md:mt-1" />
                <div>
                  <p className="font-semibold text-sm sm:text-base md:text-lg text-zinc-900 dark:text-white">Mai puține negocieri de preț</p>
                  <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-xs md:text-sm mt-0.5 sm:mt-1">Autoritatea și premium positioning reduc presiunea pe prețul nopții.</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
              <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                <Zap className="h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0.5 md:mt-1" />
                <div>
                  <p className="font-semibold text-sm sm:text-base md:text-lg text-zinc-900 dark:text-white">Rată mai mare de revenire</p>
                  <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-xs md:text-sm mt-0.5 sm:mt-1">Brandul memorabil creează loialitate. Oaspeții revin și recomandă.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Servicii Section */}
      <section id="servicii" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="space-y-6 sm:space-y-8 md:space-y-12">
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold">Ce include promovarea noastră</h2>
            <p className="text-sm sm:text-base md:text-lg text-zinc-700 dark:text-zinc-300">
              Oferim un pachet complet gândit pentru a crește vizibilitatea și rezervările proprietății tale.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {SERVICES.map(({ title, description, Icon }) => (
              <div key={title} className="rounded-xl border border-zinc-200/70 dark:border-white/10 p-4 sm:p-5 md:p-6 bg-white/50 dark:bg-zinc-900/60 backdrop-blur shadow-sm hover:shadow-md transition space-y-2 sm:space-y-3 md:space-y-4">
                <Icon className="h-6 sm:h-7 md:h-8 w-6 sm:w-7 md:w-8 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <h3 className="font-semibold text-sm sm:text-base md:text-lg text-zinc-900 dark:text-white">{title}</h3>
                <p className="text-xs sm:text-xs md:text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Media Management & Content Strategy */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/60 dark:border-blue-500/20 p-4 sm:p-6 md:p-8 lg:p-12 space-y-6 sm:space-y-8 md:space-y-12">
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 md:gap-4">
              <MessageSquare className="h-6 sm:h-7 md:h-8 w-6 sm:w-7 md:w-8 text-blue-600 dark:text-blue-400 flex-shrink-0" aria-hidden />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Social Media Management & Content Creation</h2>
            </div>
            <p className="text-xs sm:text-sm md:text-base text-zinc-700 dark:text-zinc-300">
              Prezența online merge mult dincolo de website. Social media-ul este locul unde oaspeții tăi caută, se inspiră și iau decizii de rezervare.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {/* Left Side */}
            <div className="space-y-4 sm:space-y-5 md:space-y-6">
              <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                <h3 className="font-bold text-sm sm:text-base md:text-lg text-blue-900 dark:text-blue-100 flex items-start sm:items-center gap-2">
                  <Share2 className="h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 flex-shrink-0" />
                  <span>Strategie de Conținut Personalizată</span>
                </h3>
                <p className="text-xs sm:text-xs md:text-sm text-zinc-700 dark:text-zinc-300">
                  Fiecare proprietate are un stil unic. Creăm o strategie de social media care reflectă identitatea brandului tău și atrage exact tipul de oaspeți pe care îi cauți.
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                <h3 className="font-bold text-sm sm:text-base md:text-lg text-blue-900 dark:text-blue-100 flex items-start sm:items-center gap-2">
                  <TrendingUp className="h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 flex-shrink-0" />
                  <span>Conținut Captivant & Edutainment</span>
                </h3>
                <p className="text-xs sm:text-xs md:text-sm text-zinc-700 dark:text-zinc-300">
                  Nu postez doar poze. Creez conținut care educă și distrează: behind-the-scenes, sfaturi pentru vizitatori, povești ale oaspeților tăi, ghiduri locale.
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                <h3 className="font-bold text-sm sm:text-base md:text-lg text-blue-900 dark:text-blue-100 flex items-start sm:items-center gap-2">
                  <Zap className="h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 flex-shrink-0" />
                  <span>Conținut Optimizat pentru Algoritm</span>
                </h3>
                <p className="text-xs sm:text-xs md:text-sm text-zinc-700 dark:text-zinc-300">
                  Fiecare postare este gândită pentru a performa. Reels optimizate, time-lapse-uri, și stories care țin oaspeții angajați și curiosi.
                </p>
              </div>
            </div>

            {/* Right Side */}
            <div className="space-y-4 sm:space-y-5 md:space-y-6">
              <div className="space-y-3 sm:space-y-4">
                <h3 className="font-bold text-sm sm:text-base md:text-lg text-blue-900 dark:text-blue-100">Management Activ</h3>
                <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
                  <div className="flex items-start gap-2 sm:gap-2.5 md:gap-3">
                    <Check className="h-4 sm:h-4 md:h-5 w-4 sm:w-4 md:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-xs md:text-sm text-zinc-700 dark:text-zinc-300">Răspund la comentarii și mesaje în timp real</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-2.5 md:gap-3">
                    <Check className="h-4 sm:h-4 md:h-5 w-4 sm:w-4 md:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-xs md:text-sm text-zinc-700 dark:text-zinc-300">Construiesc o comunitate engajată în jurul brandului tău</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-2.5 md:gap-3">
                    <Check className="h-4 sm:h-4 md:h-5 w-4 sm:w-4 md:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-xs md:text-sm text-zinc-700 dark:text-zinc-300">Analizez ce funcționează și optimizez continuu</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h3 className="font-bold text-sm sm:text-base md:text-lg text-blue-900 dark:text-blue-100">Canalele Unde Prezenti Ești</h3>
                <div className="grid grid-cols-1 gap-3 sm:gap-3 md:gap-4">
                  <div className="bg-white/30 dark:bg-blue-950/30 rounded-lg p-2.5 sm:p-3 md:p-4 border border-white/40 dark:border-blue-600/20">
                    <p className="font-medium text-xs sm:text-sm text-zinc-800 dark:text-white">Instagram</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">Reels, Stories, Posts cu strategie</p>
                  </div>
                  <div className="bg-white/30 dark:bg-blue-950/30 rounded-lg p-2.5 sm:p-3 md:p-4 border border-white/40 dark:border-blue-600/20">
                    <p className="font-medium text-xs sm:text-sm text-zinc-800 dark:text-white">TikTok</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">Conținut viral și pe punctul și educativ</p>
                  </div>
                  <div className="bg-white/30 dark:bg-blue-950/30 rounded-lg p-2.5 sm:p-3 md:p-4 border border-white/40 dark:border-blue-600/20">
                    <p className="font-medium text-xs sm:text-sm text-zinc-800 dark:text-white">Facebook</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">Comunitate și conversații cu oaspeții</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cum lucrăm */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="space-y-6 sm:space-y-8 md:space-y-12">
          <h2 className="text-2xl sm:text-3xl font-bold">Cum lucrează procesul nostru</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
            {[
              { step: "Analiză", desc: "Povestea și potențialul proprietății" },
              { step: "Strategie", desc: "Conceptul vizual și comunicare" },
              { step: "Producție", desc: "Filmări și fotografii de top" },
              { step: "Editare", desc: "Materiale profesionale și premium" },
              { step: "Livrare", desc: "Conținut optimizat pentru toate platformele" },
            ].map((item, i) => (
              <div key={i} className="text-center space-y-2 sm:space-y-2.5 md:space-y-3">
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 text-white rounded-full w-10 sm:w-11 md:w-12 h-10 sm:h-11 md:h-12 flex items-center justify-center font-bold mx-auto text-xs sm:text-sm md:text-base">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white">{item.step}</h3>
                <p className="text-xs sm:text-xs md:text-sm text-zinc-600 dark:text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* De ce CABN.ro */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="space-y-6 sm:space-y-8 md:space-y-12">
          <h2 className="text-2xl sm:text-3xl font-bold">De ce alegi CABN.ro</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {WHY_CHOOSE.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-3 sm:gap-4 md:gap-5 p-4 sm:p-5 md:p-6 rounded-xl border border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-900/20 space-y-2">
                <Icon className="h-5 sm:h-6 md:h-7 w-5 sm:w-6 md:w-7 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-0.5 md:mt-1" aria-hidden />
                <div className="space-y-1 sm:space-y-1.5 md:space-y-2">
                  <h3 className="font-semibold text-sm sm:text-base md:text-lg text-zinc-900 dark:text-white">{title}</h3>
                  <p className="text-xs sm:text-xs md:text-sm text-zinc-700 dark:text-zinc-300">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Echipa */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="space-y-6 sm:space-y-8 md:space-y-12">
          <h2 className="text-2xl sm:text-3xl font-bold">Cine e în spatele CABN.ro</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center">
            <div className="space-y-3 sm:space-y-4 md:space-y-6 text-zinc-700 dark:text-zinc-300">
              <p className="text-sm sm:text-base md:text-lg">
                O echipă tânără cu <strong>experiență solidă</strong> în marketing digital, social media, web development și producție foto-video profesională.
              </p>
              <p className="text-xs sm:text-sm md:text-base">
                CABN.ro s-a născut din nevoia de a oferi <strong>servicii de promovare digitală de calitate superioară</strong> pentru proprietăți unice din România.
              </p>
              <p className="text-xs sm:text-sm md:text-base">
                Ne dedicăm unui singur lucru: să ajutăm proprietarii să prezinte ofertele la potențialul adevărat și să crească rata de rezervări.
              </p>
              <div className="pt-2 sm:pt-3 md:pt-4 space-y-1.5 sm:space-y-2 md:space-y-3">
                <div className="flex items-start sm:items-center gap-2 sm:gap-2.5 md:gap-3">
                  <Check className="h-4 sm:h-4 md:h-5 w-4 sm:w-4 md:w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-0" aria-hidden />
                  <span className="text-xs sm:text-xs md:text-sm">Echipamente profesionale (drone, camere full-frame)</span>
                </div>
                <div className="flex items-start sm:items-center gap-2 sm:gap-2.5 md:gap-3">
                  <Check className="h-4 sm:h-4 md:h-5 w-4 sm:w-4 md:w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-0" aria-hidden />
                  <span className="text-xs sm:text-xs md:text-sm">Proces organizat și creativ</span>
                </div>
                <div className="flex items-start sm:items-center gap-2 sm:gap-2.5 md:gap-3">
                  <Check className="h-4 sm:h-4 md:h-5 w-4 sm:w-4 md:w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-0" aria-hidden />
                  <span className="text-xs sm:text-xs md:text-sm">Mobilitate națională</span>
                </div>
                <div className="flex items-start sm:items-center gap-2 sm:gap-2.5 md:gap-3">
                  <Check className="h-4 sm:h-4 md:h-5 w-4 sm:w-4 md:w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-0" aria-hidden />
                  <span className="text-xs sm:text-xs md:text-sm">Fiecare proiect e tratat ca brandul nostru</span>
                </div>
              </div>
            </div>
            <Image
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
              alt="Echipa CABN.ro în acțiune"
              width={1200}
              height={900}
              className="w-full h-[240px] sm:h-[280px] md:h-[360px] object-cover rounded-xl border border-zinc-200 dark:border-white/10 shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Valori */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="space-y-6 sm:space-y-8 md:space-y-12">
          <h2 className="text-2xl sm:text-3xl font-bold">Principiile noastre</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <div className="p-4 sm:p-5 md:p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/30 dark:to-blue-900/30 border border-emerald-200/60 dark:border-emerald-500/20 space-y-2 sm:space-y-3 md:space-y-4">
              <h3 className="font-bold text-sm sm:text-base md:text-lg text-emerald-900 dark:text-emerald-100">Calitate Premium</h3>
              <p className="text-xs sm:text-xs md:text-sm text-zinc-700 dark:text-zinc-300">Fiecare detaliu contează. Nu facem compromisuri pe calitate.</p>
            </div>
            <div className="p-4 sm:p-5 md:p-6 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200/60 dark:border-amber-500/20 space-y-2 sm:space-y-3 md:space-y-4">
              <h3 className="font-bold text-sm sm:text-base md:text-lg text-amber-900 dark:text-amber-100">Storytelling Vizual</h3>
              <p className="text-xs sm:text-xs md:text-sm text-zinc-700 dark:text-zinc-300">Fiecare imagine spune o poveste și creează emoție.</p>
            </div>
            <div className="p-4 sm:p-5 md:p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/60 dark:border-blue-500/20 space-y-2 sm:space-y-3 md:space-y-4">
              <h3 className="font-bold text-sm sm:text-base md:text-lg text-blue-900 dark:text-blue-100">Rezultate Măsurabile</h3>
              <p className="text-xs sm:text-xs md:text-sm text-zinc-700 dark:text-zinc-300">Creșterea rezervărilor și a vizibilității sunt obiectivele noastre.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200/60 dark:border-emerald-500/20 p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Gata de schimbare?</h2>
            <p className="text-xs sm:text-sm md:text-base text-zinc-700 dark:text-zinc-300">
              Solicită o ofertă personalizată și descoperă cum putem transforma proprietatea ta într-un brand memorabil.
            </p>
          </div>
          <ContactForm />
          {WHATSAPP_LINK ? (
            <div className="text-center space-y-2 sm:space-y-2.5 md:space-y-3 text-xs sm:text-xs md:text-sm text-zinc-600 dark:text-zinc-400">
              <p>Sau contactează-ne direct:</p>
              <Link className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline inline-block" href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                💬 WhatsApp
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {/* CTA to About */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16 text-center space-y-4 sm:space-y-6 md:space-y-8">
        <div className="space-y-2 sm:space-y-3 md:space-y-4">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold">Vrei să afli mai mult despre CABN.ro?</h3>
          <p className="text-xs sm:text-sm md:text-base text-zinc-600 dark:text-zinc-400">
            Descoperă povestea noastră, valorile și de ce suntem diferite de alții.
          </p>
        </div>
        <Link
          href="/about-us"
          className="inline-flex items-center justify-center rounded-full border-2 border-emerald-600 px-5 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 text-xs sm:text-xs md:text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
        >
          Citește povestea noastră →
        </Link>
      </section>

      {/* SEO Keywords Section - Hidden from view */}
      <div className="hidden">
        <h2>Cazari romanesti si turism alternativ</h2>
        <p>Gaseste produse si servicii similare. Cabana romania munte. Cabana cu ciubar. Cabana. Cabana 2 persoane romania. Cabana munte revelion. Cabana 2 persoane.</p>
        <p>Cazari turistice de calitate premium. Promovare digitala pentru cazari. Website SEO pentru cabane. Social media management cabane Romania.</p>
        <p>Servicii de marketing digital pentru proprietati de turism alternativ, cazari rurale, cabane si pensiuni in Romania.</p>
      </div>
    </div>
  );
}
