import Link from "next/link";

const sections = [
  {
    title: "Introducere",
    content:
      "Aceasta politica descrie modul in care cabn.ro colecteaza, foloseste si protejeaza datele personale ale vizitatorilor, partenerilor si clientilor nostri.",
  },
  {
    title: "Ce date colectam",
    items: [
      {
        subtitle: "Informatii furnizate direct",
        text: "Nume, prenume, date de contact, preferinte de cazare sau alte detalii trimise prin formulare de contact, campanii sau conturi create pe platforma.",
      },
      {
        subtitle: "Informatii generate automat",
        text: "Date tehnice precum adresa IP, tipul de dispozitiv, sistemul de operare, statistici de navigare si actiuni efectuate pe site.",
      },
      {
        subtitle: "Date din surse terte",
        text: "Informatii obtinute de la parteneri sau platforme externe atunci cand folosim servicii de analiza, publicitate ori autentificare.",
      },
    ],
  },
  {
    title: "Cum folosim datele",
    content:
      "Folosim datele pentru a furniza si imbunatati serviciile cabn.ro, pentru a raspunde solicitarilor, pentru comunicari comerciale cu acordul tau si pentru a asigura securitatea platformei.",
  },
  {
    title: "Temei legal",
    content:
      "Prelucram datele personale in baza consimtamantului, a executarii unui contract, a obligatiilor legale sau a interesului legitim, dupa caz.",
  },
  {
    title: "Durata stocarii",
    content:
      "Pastram datele numai cat timp este necesar pentru indeplinirea scopurilor descrise sau conform cerintelor legale in vigoare. Ulterior, datele sunt sterse sau anonimizate.",
  },
  {
    title: "Drepturile tale",
    items: [
      {
        subtitle: "Acces si rectificare",
        text: "Ai dreptul sa soliciti detalii despre datele pe care le detinem si sa ceri corectarea informatiilor inexacte.",
      },
      {
        subtitle: "Restrictionare si opozitie",
        text: "Poti cere limitarea prelucrarii sau te poti opune anumitor activitati de prelucrare, inclusiv celor de marketing direct.",
      },
      {
        subtitle: "Portabilitate si stergere",
        text: "Poti solicita transferul datelor catre un alt furnizor sau stergerea lor, in limitele prevazute de lege.",
      },
    ],
  },
  {
    title: "Securitatea datelor",
    content:
      "Implementam masuri tehnice si organizatorice pentru a proteja datele personale impotriva accesului neautorizat, pierderii sau alterarii.",
  },
  {
    title: "Actualizari",
    content:
      "Aceasta politica poate fi actualizata periodic pentru a reflecta modificarile legislative sau operationale. Versiunea curenta se aplica din momentul publicarii pe site.",
  },
  {
    title: "Contact",
    content:
      "Pentru solicitari legate de protectia datelor personale ne poti scrie la privacy@cabn.ro sau ne poti contacta prin formularul de pe site.",
  },
];

export default function PoliticaConfidentialitatePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-300">
          Acasa
        </Link>{" "}
        /{" "}
        <span className="text-zinc-700 dark:text-zinc-200">Politica de confidentialitate</span>
      </nav>

      <header className="mb-10 space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          Politica de confidentialitate
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-300">
          Transparenta in prelucrarea datelor personale este importanta pentru noi. Mai jos gasesti
          informatii detaliate despre modul in care gestionam aceste date pe cabn.ro.
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
