import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politica de confidentialitate",
  robots: { index: false, follow: false },
};

const sections = [
  {
    title: "Cine suntem (operatorul datelor)",
    content:
      "Operatorul datelor este CABN S.R.L., identificat prin CUI 52174972, Nr. Reg. Com. J2025053051007, EUID ROONRC.J2025053051007. Pentru solicitări privind datele personale ne poți scrie la privacy@cabn.ro.",
  },
  {
    title: "Domeniul de aplicare",
    content:
      "Această politică se aplică prelucrărilor de date personale realizate în legătură cu website-ul cabn.ro, formularele de contact, colaborările și serviciile oferite.",
  },
  {
    title: "Categorii de date prelucrate",
    items: [
      {
        subtitle: "Date furnizate direct",
        text: "Nume, prenume, email/telefon, mesajele transmise, detalii despre locație/servicii solicitate și orice alte informații transmise voluntar.",
      },
      {
        subtitle: "Date tehnice",
        text: "Adresă IP, tip dispozitiv, sistem de operare, browser, pagini vizitate, acțiuni în site, identificatori prin cookie-uri, loguri de securitate.",
      },
      {
        subtitle: "Date contractuale",
        text: "Date necesare facturării și gestionării relației contractuale (acolo unde este cazul).",
      },
      {
        subtitle: "Date din surse terțe",
        text: "În măsura existenței unor parteneriate, putem primi date strict necesare desfășurării colaborării.",
      },
    ],
  },
  {
    title: "Scopuri și temeiuri legale",
    items: [
      {
        subtitle: "Răspuns la solicitări și ofertare",
        text: "Interes legitim sau demersuri precontractuale la cererea ta.",
      },
      {
        subtitle: "Prestarea serviciilor",
        text: "Executarea contractului și comunicări operaționale.",
      },
      {
        subtitle: "Marketing",
        text: "Consimțământ (când este solicitat), cu posibilitatea de retragere oricând.",
      },
      {
        subtitle: "Securitate și prevenirea fraudelor",
        text: "Interes legitim pentru protecția platformei și a utilizatorilor.",
      },
      {
        subtitle: "Obligații legale",
        text: "Respectarea obligațiilor legale aplicabile.",
      },
    ],
  },
  {
    title: "Destinatari ai datelor",
    content:
      "Datele pot fi transmise furnizorilor de servicii IT (hosting, mentenanță, email), servicii de analiză, servicii de hărți și altor furnizori implicați în operarea platformei, pe baza unor contracte și garanții adecvate. Datele pot fi divulgate autorităților publice atunci când există o obligație legală.",
  },
  {
    title: "Transferuri internaționale",
    content:
      "Dacă anumite servicii implică transferul datelor în afara Spațiului Economic European, ne asigurăm existența unor garanții adecvate (ex. clauze contractuale standard).",
  },
  {
    title: "Durata stocării",
    content:
      "Păstrăm datele doar cât este necesar pentru scopurile declarate, pe durata relației contractuale și ulterior conform cerințelor legale. Datele sunt șterse sau anonimizate când nu mai sunt necesare.",
  },
  {
    title: "Drepturile persoanei vizate",
    items: [
      {
        subtitle: "Acces și rectificare",
        text: "Poți solicita confirmarea prelucrării și corectarea datelor inexacte.",
      },
      {
        subtitle: "Ștergere și restricționare",
        text: "Poți solicita ștergerea datelor sau limitarea prelucrării, în condițiile legii.",
      },
      {
        subtitle: "Portabilitate",
        text: "Poți solicita transmiterea datelor către un alt operator, în format structurat.",
      },
      {
        subtitle: "Opoziție",
        text: "Te poți opune prelucrărilor bazate pe interes legitim, inclusiv marketing direct.",
      },
      {
        subtitle: "Retragerea consimțământului",
        text: "Îți poți retrage oricând consimțământul fără a afecta legalitatea prelucrărilor anterioare.",
      },
    ],
  },
  {
    title: "Plângeri",
    content:
      "Dacă consideri că drepturile tale au fost încălcate, poți depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP).",
  },
  {
    title: "Securitatea datelor",
    content:
      "Aplicăm măsuri tehnice și organizatorice pentru a proteja datele împotriva accesului neautorizat, pierderii sau divulgării.",
  },
  {
    title: "Minorii",
    content:
      "Serviciile cabn.ro nu sunt destinate persoanelor sub 18 ani. Nu colectăm cu bună știință datele minorilor.",
  },
  {
    title: "Automatizare și profilare",
    content:
      "Nu utilizăm decizii bazate exclusiv pe prelucrare automată care să producă efecte juridice asupra ta.",
  },
  {
    title: "Actualizări",
    content:
      "Putem actualiza periodic această politică. Ultima actualizare: 30 ianuarie 2026.",
  },
  {
    title: "Contact",
    content:
      "Pentru întrebări legate de protecția datelor personale ne poți scrie la privacy@cabn.ro.",
  },
];

export default function PoliticaConfidentialitatePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-300">
          Acasă
        </Link>{" "}
        /{" "}
        <span className="text-zinc-700 dark:text-zinc-200">Politica de confidențialitate</span>
      </nav>

      <header className="mb-10 space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          Politica de confidențialitate
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-300">
          Documentul descrie practicile de prelucrare a datelor personale pe cabn.ro și drepturile tale conform legislației aplicabile.
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
