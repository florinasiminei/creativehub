import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Camera, Globe, Share2, Video, Check, Zap, Target, Users, TrendingUp, MessageSquare } from "lucide-react";
import ContactForm from "@/components/forms/ContactForm";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cabn.ro";

export const metadata: Metadata = {
  title: "Servicii Premium de Promovare Digitală | CABN.ro",
  description:
    "Servicii complete de promovare pentru cabane și pensiuni: foto-video cinematic, website profesional, social media management și strategie digitală. Creștem vizibilitatea și rezervările.",
  alternates: {
    canonical: "/descoperaCABN",
  },
  openGraph: {
    title: "Servicii Premium de Promovare Digitală | CABN.ro",
    description:
      "De la conținut cinematografic la strategie digitală completă. Transformăm proprietăți în branduri memorabile.",
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
    title: "Servicii Premium de Promovare Digitală | CABN.ro",
    description:
      "Servicii complete de promovare pentru cabane și pensiuni: foto-video cinematic, website și social media.",
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

        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white gap-4 md:gap-6">
          <h1 className="text-3xl md:text-5xl font-bold max-w-3xl leading-tight">
            Transformă proprietatea ta în brand memorabil
          </h1>

          <p className="text-white/90 max-w-2xl text-lg">
            Servicii complete de promovare digitală: foto-video cinematic, website profesional, social media management și strategie digitală personalizată.
          </p>

          <Link
            href="#servicii"
            className="rounded-full bg-amber-500 px-8 py-3 text-sm font-semibold text-black shadow-lg hover:bg-amber-400 transition inline-flex items-center gap-2"
          >
            Explorează serviciile
          </Link>
        </div>
      </section>

      {/* Intro Section */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="space-y-6 text-center">
          <h2 className="text-3xl font-bold">De ce ai nevoie de promovare digitală</h2>
          <p className="text-lg text-zinc-700 dark:text-zinc-300">
            Piața turismului alternativ este dinamică și competitive. Proprietățile care nu sunt vizibile online se pierd într-o mulțime de mii de oferte. Tu merești mai bine.
          </p>
          <p className="text-lg text-zinc-700 dark:text-zinc-300">
            La CABN.ro, nu doar facem fotografii frumoase - creăm o identitate digitală completă care transforma oaspeții în clienți loiali și multiplică rata de ocupare.
          </p>
        </div>
      </section>

      {/* Servicii Section */}
      <section id="servicii" className="max-w-6xl mx-auto px-6 py-16">
        <div className="space-y-12">
          <div>
            <h2 className="text-3xl font-bold mb-4">Ce include promovarea noastră</h2>
            <p className="text-zinc-700 dark:text-zinc-300 text-lg mb-8">
              Oferim un pachet complet gândit pentru a crește vizibilitatea și rezervările proprietății tale.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map(({ title, description, Icon }) => (
              <div key={title} className="rounded-xl border border-zinc-200/70 dark:border-white/10 p-6 bg-white/50 dark:bg-zinc-900/60 backdrop-blur shadow-sm hover:shadow-md transition">
                <Icon className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-4" aria-hidden />
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Media Management & Content Strategy */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/60 dark:border-blue-500/20 p-8 md:p-12">
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" aria-hidden />
                <h2 className="text-3xl font-bold">Social Media Management & Content Creation</h2>
              </div>
              <p className="text-lg text-zinc-700 dark:text-zinc-300">
                Prezența online merge mult dincolo de website. Social media-ul este locul unde oaspeții tăi caută, se inspiră și iau decizii de rezervare.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Stânga */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Strategie de Conținut Personalizată
                  </h3>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    Fiecare proprietate are un stil unic. Creăm o strategie de social media care reflectă identitatea brandului tău și atrage exact tipul de oaspeți pe care îi cauți. Analizez audiența, stilul vieții și behav comportamentul tău pentru a crea conținut care rezonează.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Conținut Captivant & Edutainment
                  </h3>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    Nu postez doar poze. Creez conținut care educă și distrează: behind-the-scenes, sfaturi pentru vizitatori, povești ale oaspeților tăi, ghiduri locale, time-lapse-uri și reels optimizate pentru algoritm.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Short-Form Video (Reels, TikTok, Stories)
                  </h3>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    Video-urile scurte sunt cea mai eficientă formă de conținut în 2025. Creez reels captivante care arată proprietatea ta din unghiuri noi, creez challenge-uri și inspirații pe care oaspeții ta doresc să le urmărească și să le distribuie.
                  </p>
                </div>
              </div>

              {/* Dreapta */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Community Engagement & Amplificare
                  </h3>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    Răspund la comentarii și mesaje în timp util, construiesc relații cu oaspeții și influenceri locali, și amplific conținutului tău prin colaborări strategice. Audiența loială = rezervări consistente.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Optimizare Algoritm & SEO Social
                  </h3>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    Fiecare post este optimizat pentru algoritm (hashtag research, timing, format). Conținuturile tale apar în căutări pe Instagram și TikTok, aducând oaspeți organici care caută exact ceea ce oferi.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    Analytics & Raportare Lunară
                  </h3>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    Iau măsuri la fiecare metrice importante: reach, engagement, conversii către booking, growth rate. Raportez lunar și optimizez constant strategia pentru mai bune rezultate și ROI mai mare.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-blue-200 dark:border-blue-500/20 pt-8">
              <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100 mb-4">📊 Frecvența și Canalele Recomandate</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-white/50 dark:bg-zinc-900/50 rounded-lg p-4">
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Instagram & Reels</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">3-5 postări/săptămână. Cel mai bun pentru showcase visual. Algoritmul favorizează reels-urile și stories.</p>
                </div>
                <div className="bg-white/50 dark:bg-zinc-900/50 rounded-lg p-4">
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">TikTok & YouTube Shorts</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">2-3 reels/săptămână. Audiență mai tânără. Viral potential mai mare. Creștere exponențială.</p>
                </div>
                <div className="bg-white/50 dark:bg-zinc-900/50 rounded-lg p-4">
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Facebook & WhatsApp</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">2-3 postări/săptămână. Audiență mai matură. Direct booking link și customer service.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-zinc-900/70 rounded-lg p-6 border border-blue-100 dark:border-blue-500/30">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                <strong>💡 Insight:</strong> Datele arată că oaspeții care au vzut video social media before booking sunt 3x mai fericiți cu alegerea și lăsă review-uri mai bune. Invesmmentul în social media content nu doar crește rezervările - crește și satisfacția oaspeților!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cum lucrăm */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-12">Cum lucrează procesul nostru</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { step: "Analiză", desc: "Povestea și potențialul proprietății" },
            { step: "Strategie", desc: "Conceptul vizual și comunicare" },
            { step: "Producție", desc: "Filmări și fotografii de top" },
            { step: "Editare", desc: "Materiale profesionale și premium" },
            { step: "Livrare", desc: "Conținut optimizat pentru toate platformele" },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold mx-auto mb-3">
                {i + 1}
              </div>
              <h3 className="font-semibold mb-2">{item.step}</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* De ce CABN.ro */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-12">De ce alegi CABN.ro</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {WHY_CHOOSE.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4 p-6 rounded-xl border border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-900/20">
              <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" aria-hidden />
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">{title}</h3>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Echipa */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-8">Cine e în spatele CABN.ro</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4 text-zinc-700 dark:text-zinc-300">
            <p className="text-lg">
              O echipă tânără cu <strong>experiență solidă</strong> în marketing digital, social media, web development și producție foto-video profesională.
            </p>
            <p>
              CABN.ro s-a născut din nevoia de a oferi <strong>servicii de promovare digitală de calitate superioară</strong> pentru proprietăți unice din România. Combinăm <strong>gândirea strategică</strong> din mediul corporate cu <strong>creația vizuală modernă</strong> și <strong>storytelling cinematografic</strong>.
            </p>
            <p>
              Ne dedicăm unui singur lucru: să ajutăm proprietarii de cabane, pensiuni și retreat-uri să-și prezinte ofertele la adevăratul potențial și să crească rata de rezervări.
            </p>
            <div className="pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600" aria-hidden />
                <span>Echipamente profesionale (drone, camere full-frame)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600" aria-hidden />
                <span>Proces organizat și creativ</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600" aria-hidden />
                <span>Mobilitate națională</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600" aria-hidden />
                <span>Fiecare proiect e tratat ca brandul nostru</span>
              </div>
            </div>
          </div>
          <Image
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
            alt="Echipa CABN.ro în acțiune"
            width={1200}
            height={900}
            className="w-full h-[360px] object-cover rounded-xl border border-zinc-200 dark:border-white/10 shadow-lg"
          />
        </div>
      </section>

      {/* Valori */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-8">Principiile noastre</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/30 dark:to-blue-900/30 border border-emerald-200/60 dark:border-emerald-500/20">
            <h3 className="font-bold text-emerald-900 dark:text-emerald-100 mb-2">Calitate Premium</h3>
            <p className="text-zinc-700 dark:text-zinc-300">Fiecare detaliu contează. Nu facem compromisuri pe calitate, indiferent de dimensiunea proiectului.</p>
          </div>
          <div className="p-6 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200/60 dark:border-amber-500/20">
            <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-2">Storytelling Vizual</h3>
            <p className="text-zinc-700 dark:text-zinc-300">Fiecare imagine și video spun o poveste. Transformăm proprietatea în experiență emoțională.</p>
          </div>
          <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/60 dark:border-blue-500/20">
            <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">Rezultate Măsurabile</h3>
            <p className="text-zinc-700 dark:text-zinc-300">Creșterea rezervărilor și a vizibilității online sunt obiectivele noastre. Rezultatele tale sunt rezultatele noastre.</p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200/60 dark:border-emerald-500/20 p-8">
          <h2 className="text-3xl font-bold mb-3">Gata de schimbare?</h2>
          <p className="text-lg text-zinc-700 dark:text-zinc-300 mb-8">
            Solicită o ofertă personalizată și descoperă cum putem transforma proprietatea ta într-un brand memorabil.
          </p>
          <ContactForm />
          {WHATSAPP_LINK ? (
            <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
              <p>Sau contactează-ne direct:</p>
              <Link className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline" href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                💬 WhatsApp
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {/* CTA to About */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h3 className="text-2xl font-bold mb-4">Vrei să afli mai mult despre CABN.ro?</h3>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Descoperă povestea noastră, valorile și de ce suntem diferite de alții.
        </p>
        <Link
          href="/about-us"
          className="inline-flex items-center justify-center rounded-full border-2 border-emerald-600 px-8 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
        >
          Citește povestea noastră →
        </Link>
      </section>
    </div>
  );
}
