type Faq = { q: string; a: string };
type FaqData = {
  [locationSlug: string]: {
    [typeSlug: string]: Faq[];
  };
};

const faqData: FaqData = {
  apuseni: {
    cabane: [
      {
        q: 'Când este cel mai bun sezon pentru cazare în Apuseni?',
        a: 'Sezonul de vară, din iunie până în septembrie, este ideal pentru drumeții și explorarea peșterilor. Iarna, zona este populară pentru peisajele de poveste și sporturile de iarnă, deși accesul poate fi mai dificil.',
      },
      {
        q: 'Există cabane pet-friendly în Apuseni?',
        a: 'Da, multe cabane din Apuseni acceptă animale de companie. Vă recomandăm să verificați politica fiecărei proprietăți în parte înainte de a rezerva pentru a confirma disponibilitatea și eventualele costuri suplimentare.',
      },
      {
        q: 'Ce activități sunt disponibile în zona Apuseni?',
        a: 'Apuseni oferă o gamă largă de activități în natură, inclusiv drumeții montane, vizitarea peșterilor (precum Peștera Urșilor sau Peștera Scărișoara), ciclism montan, și explorarea satelor tradiționale moțești.',
      },
    ],
  },
  maramures: {
    cabane: [
        {
            q: 'Care este specificul cabanelor din Maramureș?',
            a: 'Cabanele din Maramureș sunt adesea construite în stil tradițional, din lemn, cu porți sculptate și elemente arhitecturale specifice zonei. Ele oferă o experiență autentică, combinând rusticul cu confortul modern.'
        },
        {
            q: 'Ce pot vizita în Maramureș?',
            a: 'Maramureșul este renumit pentru bisericile de lemn (patrimoniu UNESCO), Cimitirul Vesel de la Săpânța, Mocănița de pe Valea Vaserului și satele tradiționale unde meșteșugurile sunt încă vii.'
        }
    ]
  }
};

export const getFaqs = (locationSlug: string, typeSlug: string): Faq[] => {
  return faqData[locationSlug]?.[typeSlug] || [];
};
