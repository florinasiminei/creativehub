import Image from "next/image";
import Link from "next/link";
import { Camera, Globe, Share2, Video } from "lucide-react";

const SERVICES = [
  {
    title: "Foto & Video",
    description: "Surprindem emoția locației tale prin conținut vizual care spune o poveste autentică și atrage clienți.",
    Icon: Camera,
  },
  {
    title: "Drone Shots",
    description: "Realizăm imagini din aer care atrag priviri în social media și ajută oaspeții să înțeleagă mai bine zona.",
    Icon: Video,
  },
  {
    title: "Website & SEO",
    description: "Construim site-uri simple de întreținut și ușor de găsit pe Google, ca oaspeții să te descopere de oriunde.",
    Icon: Globe,
  },
  {
    title: "Social Media Management",
    description: "Ne ocupăm de paginile tale, cu postări menite să construiască un brand coerent.",
    Icon: Share2,
  },
];

const rawWhatsApp = process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "";
const cleanedWhatsApp = rawWhatsApp.replace(/\D+/g, "");
const WHATSAPP_LINK = cleanedWhatsApp ? `https://wa.me/${cleanedWhatsApp}` : null;

export default function DescoperaCabn() {
  return (
    <div className="[margin-left:calc(50%-50vw)] [margin-right:calc(50%-50vw)] -mt-6 md:-mt-6 min-h-screen overflow-x-hidden bg-transparent text-black dark:text-white">
      {/* HERO full-bleed, full-screen */}
      <section className="relative min-h-[100dvh] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=2000&q=80"
          alt="Cabn premium"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />

        {/* overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/35 to-black/20" />
        <div className="absolute inset-0 bg-black/25" />

        {/* content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white gap-4 md:gap-6">
          <h1 className="text-3xl md:text-5xl font-bold max-w-3xl">
            Creștem vizibilitatea și gradul de ocupare al locației tale
          </h1>

          <p className="text-white/85 max-w-2xl">
            De la creare de conținut la promovare, ne ocupăm de tot ce ai nevoie pentru mai mulți turiști în cazarea ta.
          </p>

          <Link
            href="#contact"
            className="rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-black shadow hover:bg-amber-400 transition"
          >
            Solicită ofertă
          </Link>
        </div>
      </section>

      <section id="servicii" className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-8">Serviciile noastre</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SERVICES.map(({ title, description, Icon }) => (
            <div key={title} className="rounded-xl border border-zinc-200/70 dark:border-white/10 p-6 bg-transparent shadow-sm">
              <Icon className="h-7 w-7 text-emerald-500 mb-3" aria-hidden />
              <div className="font-semibold text-gray-900 dark:text-white">{title}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-8">Echipa CABN</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="text-gray-700 dark:text-gray-300 space-y-4">
            <p>
              Suntem o echipă de profesioniști în marketing și IT care ajută proprietarii de cazări să-și facă locul vizibil și dorit online. Combinăm creativitatea cu know-how-ul tehnic pentru a transforma fiecare locație într-un brand de încredere. Ne ocupăm de tot, de la conținut la promovare, ca locația ta să atragă mai multe rezervări.
            </p>
            <span className="inline-block bg-amber-500 text-white text-xs px-3 py-1 rounded-full">
              Scrie-ne pe Whatsapp
            </span>
          </div>
          <Image
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
            alt="Echipa cabn"
            width={1200}
            height={900}
            className="w-full h-[260px] object-cover rounded-xl border"
          />
        </div>
      </section>
      <section id="contact" className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-6">Solicită o ofertă</h2>
        <form className="grid grid-cols-1 gap-4">
          <input name="name" className="rounded-lg border border-zinc-200/70 dark:border-white/10 px-4 py-3 bg-white dark:bg-transparent" placeholder="Nume" />
          <input
            name="contact"
            className="rounded-lg border border-zinc-200/70 dark:border-white/10 px-4 py-3 bg-white dark:bg-transparent"
            placeholder="Email / Telefon"
          />
          <textarea
            name="message"
            className="rounded-lg border border-zinc-200/70 dark:border-white/10 px-4 py-3 bg-white dark:bg-transparent"
            rows={5}
            placeholder="Spune-ne mai multe despre locația ta și ce ai nevoie"
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-full font-semibold"
          >
            Trimite
          </button>
        </form>
        {WHATSAPP_LINK ? (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            sau contactează-ne pe WhatsApp:
            <Link className="text-emerald-600 ml-1" href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
              Deschide WhatsApp
            </Link>
          </div>
        ) : (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Adaugă numărul de WhatsApp în fișierul `.env` pentru a afișa aici linkul rapid.
          </div>
        )}
      </section>
    </div>
  );
}
