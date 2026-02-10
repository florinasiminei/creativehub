import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaWhatsapp,
  FaEnvelope,
} from "react-icons/fa";
import {
  HeartHandshake,
  Leaf,
  PenSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { getCanonicalSiteUrl, toCanonicalUrl } from "@/lib/siteUrl";

const siteUrl = getCanonicalSiteUrl();

export const metadata: Metadata = {
  title: "Despre noi",
  description:
    "Cine este echipa cabn, ce face compania, istoricul, misiunea, valorile si datele legale.",
  alternates: {
    canonical: toCanonicalUrl("/about-us"),
  },
  openGraph: {
    title: "Despre noi",
    description:
      "Pagina oficiala despre echipa cabn, activitate, istoric, misiune si contact.",
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
};

const socialLinks = [
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
  {
    name: "WhatsApp",
    href: "https://wa.me/40745298008",
    icon: FaWhatsapp,
  },
];

const discoveryPoints = [
  {
    title: "De ce exista cabn",
    text: "Multe proprietati valoroase raman invizibile sau comunicate generic. Noi construim puntea dintre valoarea reala a unei experiente si perceptia publica.",
    Icon: Sparkles,
  },
  {
    title: "Ce inseamna lux alternativ",
    text: "Luxul alternativ inseamna autenticitate, liniste, context local, atentie la detaliu si experiente care lasa urme bune.",
    Icon: Leaf,
  },
  {
    title: "De ce promovare diferita",
    text: "Nu lucram pe volum si zgomot. Lucram pe claritate, pozitionare si coerenta, astfel incat brandul sa atraga oamenii potriviti.",
    Icon: PenSquare,
  },
  {
    title: "Ce probleme rezolvam",
    text: "Rezolvam comunicarea fragmentata, brandingul inconsistent, dependenta excesiva de platforme terte si lipsa unui sistem de crestere directa.",
    Icon: HeartHandshake,
  },
  {
    title: "Impact social",
    text: "Cand o proprietate creste sanatos, cresc si comunitatile din jur: furnizori locali, experiente regionale si economie locala mai stabila.",
    Icon: Users,
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-transparent dark:text-white">
      <section className="relative overflow-hidden [margin-left:calc(50%-50vw)] [margin-right:calc(50%-50vw)] -mt-6 md:-mt-6">
        <div className="relative h-[62vh] min-h-[420px]">
          <Image
            src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=2000&q=80"
            alt="Descopera cabn"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6 lg:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">
                Descopera cabn
              </p>
              <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                Nu vindem doar servicii.
                <br />
                Construim sens, directie si identitate.
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-white/90 sm:text-base mx-auto">
                Povestea noastra despre de ce facem ce facem si cum vedem
                viitorul turismului alternativ.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
            Cine suntem
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            Despre cabn.ro
          </h2>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-base">
            cabn este o companie specializata in strategie digitala, productie
            foto-video si dezvoltare de prezenta online pentru proprietati din
            turismul alternativ din Romania. Lucram cu proprietari care vor
            crestere sustenabila, standard vizual ridicat si rezervari mai
            predictibile.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/servicii"
              className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Vezi servicii
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Contact direct
            </Link>
          </div>
        </header>

        <section className="grid gap-8 border-t border-zinc-200 py-10 dark:border-zinc-800 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">Echipa</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              Echipa cabn combina competente de marketing, productie vizuala,
              web si strategie comerciala. Lucram interdisciplinar, cu procese
              clare si responsabilitate pe fiecare etapa, de la analiza pana la
              implementare si optimizare.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Ce face compania</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              Construim sisteme de promovare complete: audit de pozitionare,
              productie foto-video, website orientat pe conversie, SEO si
              suport in comunicare. Obiectivul este cresterea cererilor directe
              si consolidarea brandului proprietatii.
            </p>
          </div>
        </section>

        <section className="grid gap-8 border-t border-zinc-200 py-10 dark:border-zinc-800 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">Istoric</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              cabn a aparut din nevoia de a aduce standard profesional intr-o
              piata in care multe proprietati valoroase nu sunt prezentate la
              adevaratul lor potential. Experienta noastra in proiecte digitale
              ne-a aratat ca diferenta reala vine din claritate strategica,
              executie consecventa si masurare continua.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Misiune</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              Misiunea noastra este sa transformam proprietati bune in branduri
              credibile, memorabile si competitive. Ne concentram pe crestere
              sustenabila, nu pe rezultate punctuale fara continuitate.
            </p>
          </div>
        </section>

        <section className="border-t border-zinc-200 py-10 dark:border-zinc-800">
          <h2 className="text-xl font-semibold">Descopera cabn</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Partea de viziune si diferentiere este integrata aici: cum vedem
            turismul alternativ, ce inseamna crestere sanatoasa si de ce lucram
            diferit.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {discoveryPoints.map(({ title, text, Icon }) => (
              <article key={title}>
                <div className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <Icon className="h-4 w-4" />
                  <h3 className="text-base font-semibold">{title}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-t border-zinc-200 py-10 dark:border-zinc-800 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">Integrare si responsabilitate</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              Credem intr-un model de crestere care include si dimensiune
              sociala. In proiectele noastre cautam contexte unde persoane
              vulnerabile pot fi integrate prin colaborari locale, roluri
              adaptate si oportunitati reale de dezvoltare.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Design, estetica, storytelling</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              Felul in care arata un brand influenteaza direct increderea pe
              care o inspira. De aceea lucram cu structura, ritm vizual si
              naratiune: imaginea, textul si experienta digitala trebuie sa
              spuna aceeasi poveste.
            </p>
          </div>
        </section>

        <section className="border-t border-zinc-200 py-10 dark:border-zinc-800">
          <h2 className="text-xl font-semibold">Valori de lucru</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
                Claritate
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Deciziile si recomandarile sunt explicate concret, fara jargon
                inutil.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
                Rigoare
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Lucram pe procese, KPI-uri si standarde de executie stabile.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
                Calitate vizuala
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Fiecare material publicat trebuie sa sustina pozitionarea
                premium a brandului.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
                Responsabilitate
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Ne asumam obiective clare si transparenta pe rezultate.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-8 border-t border-zinc-200 py-10 dark:border-zinc-800 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">Date legale</h2>
            <dl className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium">Denumire</dt>
                <dd>CABN S.R.L.</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium">CUI</dt>
                <dd>52174972</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium">Nr. Reg. Com.</dt>
                <dd>J2025053051007</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium">EUID</dt>
                <dd>ROONRC.J2025053051007</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Contact si social</h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
              Pentru colaborari:{" "}
              <a
                href="mailto:marketing@cabn.ro"
                className="inline-flex items-center gap-2 font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
              >
                <FaEnvelope className="h-3.5 w-3.5" />
                marketing@cabn.ro
              </a>
            </p>

            <div className="mt-5 flex items-center gap-3">
              {socialLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.name}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
