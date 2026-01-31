import Link from "next/link";

const sections = [
  {
    title: "Ce sunt cookie-urile?",
    content:
      "Cookie-urile sunt fișiere mici de tip text salvate în browserul tău atunci când vizitezi un site. Ele ajută la funcționarea corectă a site-ului, la memorarea preferințelor și la îmbunătățirea experienței de navigare.",
  },
  {
    title: "Cine plasează cookie-urile",
    content:
      "Cookie-urile pot fi plasate de cabn.ro (first-party) sau de terți ale căror servicii sunt integrate în site (third-party).",
  },
  {
    title: "Tipuri de cookie-uri utilizate",
    items: [
      {
        subtitle: "Strict necesare",
        text: "Permit funcționarea site-ului (navigare, securitate, formulare). Nu pot fi dezactivate fără a afecta funcționalitatea.",
      },
      {
        subtitle: "Funcționale",
        text: "Rețin preferințe precum limba, filtrele selectate și setările utilizatorului.",
      },
      {
        subtitle: "Analitice",
        text: "Ne ajută să înțelegem utilizarea site-ului pentru a îmbunătăți conținutul și performanța. Sunt utilizate doar cu consimțământ, dacă mecanismul de consimțământ este activ.",
      },
      {
        subtitle: "Marketing",
        text: "Pot fi folosite pentru măsurarea eficienței campaniilor sau afișarea de conținut relevant. Sunt utilizate doar cu consimțământ.",
      },
    ],
  },
  {
    title: "Temei legal",
    content:
      "Cookie-urile strict necesare sunt utilizate în baza interesului legitim. Celelalte tipuri de cookie-uri sunt utilizate doar în baza consimțământului, atunci când este solicitat.",
  },
  {
    title: "Durata de viață a cookie-urilor",
    content:
      "Unele cookie-uri sunt de sesiune și se șterg la închiderea browserului. Altele sunt persistente și rămân active pentru o perioadă definită.",
  },
  {
    title: "Cum poți controla cookie-urile",
    content:
      "Poți modifica setările browserului pentru a bloca sau șterge cookie-urile. Dacă dezactivezi cookie-urile strict necesare, anumite funcții ale site-ului pot să nu mai funcționeze corect.",
  },
  {
    title: "Cookie-uri de la terți",
    content:
      "Anumite funcții (ex. hărți, rețele sociale, analytics) pot seta cookie-uri proprii. Acestea sunt reglementate de politicile furnizorilor respectivi.",
  },
  {
    title: "Actualizări",
    content:
      "Putem actualiza periodic această politică. Ultima actualizare: 30 ianuarie 2026.",
  },
  {
    title: "Contact",
    content:
      "Pentru întrebări legate de cookie-uri ne poți scrie la support@cabn.ro.",
  },
];

export default function PoliticaCookiePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-300">
          Acasă
        </Link>{" "}
        / <span className="text-zinc-700 dark:text-zinc-200">Politica de utilizare cookie-uri</span>
      </nav>

      <header className="mb-10 space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          Politica de utilizare cookie-uri
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-300">
          Acest document explică modul în care cabn.ro folosește cookie-uri și opțiunile tale de control.
        </p>
      </header>

      <div className="space-y-8">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-zinc-200/70 bg-white/70 p-6 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60"
          >
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">{section.title}</h2>
            {"content" in section ? (
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {section.content}
              </p>
            ) : (
              <ul className="mt-4 space-y-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {section.items.map((item) => (
                  <li key={item.subtitle}>
                    <p className="font-medium text-zinc-800 dark:text-zinc-100">{item.subtitle}</p>
                    <p className="mt-1">{item.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
