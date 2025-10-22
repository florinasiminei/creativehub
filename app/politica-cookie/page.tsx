// Next.js
import Link from "next/link";

const sections = [
  {
    title: "Ce sunt cookie-urile?",
    content:
      "Cookie-urile sunt fișiere text de dimensiuni reduse pe care un site le salvează în browserul tău pentru a reține informații despre vizită. Ele fac posibilă recunoașterea dispozitivului, memorarea preferințelor și furnizarea unei experiențe mai bune pe cabn.ro.",
  },
  {
    title: "Tipuri de cookie-uri pe care le folosim",
    items: [
      {
        subtitle: "Cookie-uri strict necesare",
        text: "Asigură funcționarea de bază a site-ului – autentificare, navigare între pagini, acces la zone securizate. Fără acestea, serviciile noastre nu pot funcționa corect.",
      },
      {
        subtitle: "Cookie-uri de performanță și analiză",
        text: "Colectează informații anonime despre modul în care este utilizat site-ul pentru a ne ajuta să îmbunătățim conținutul și structura cabn.ro.",
      },
      {
        subtitle: "Cookie-uri de funcționalitate",
        text: "Rețin preferințele tale (ex. limbă, locație, filtre setate) pentru a-ți oferi o experiență personalizată la vizitele următoare.",
      },
      {
        subtitle: "Cookie-uri de publicitate",
        text: "Pot fi plasate de partenerii noștri pentru a afișa reclame relevante și pentru a măsura eficiența campaniilor.",
      },
    ],
  },
  {
    title: "Cum poți controla cookie-urile",
    content:
      "Poți ajusta din browserul tău setările pentru a refuza sau a șterge cookie-urile oricând. Reține că blocarea cookie-urilor strict necesare poate afecta funcționarea site-ului. Instrucțiuni detaliate găsești în secțiunea de ajutor a browserului tău (Chrome, Firefox, Safari, Edge etc.).",
  },
  {
    title: "Cookie-urile terților",
    content:
      "Unele cookie-uri sunt plasate de servicii externe integrate pe cabn.ro (de exemplu, instrumente de analiză sau platforme de social media). Acestea sunt guvernate de politicile proprii ale furnizorilor respectivi.",
  },
  {
    title: "Actualizări",
    content:
      "Politica noastră de utilizare a cookie-urilor poate fi actualizată periodic pentru a reflecta schimbări legislative sau funcționale. Te încurajăm să revii regulat pentru a fi la curent cu eventualele modificări.",
  },
  {
    title: "Contact",
    content:
      "Pentru întrebări sau solicitări privind cookie-urile, ne poți scrie la adresa de email support@cabn.ro.",
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
          Această pagină explică modul în care cabn.ro folosește cookie-uri pentru a livra o
          experiență rapidă, sigură și personalizată pentru vizitatori și parteneri.
        </p>
      </header>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-zinc-200/70 bg-white/70 p-6 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60">
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
