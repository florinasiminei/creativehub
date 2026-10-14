# Promovare Instagram — configurare și activare

Implementarea folosește Next.js, Supabase, R2 și `sharp` deja existente, plus API-ul Buffer Free. Nu adaugă pachete sau abonamente. Costul efectiv rămâne dependent de consumul și limitele infrastructurii existente.

**Starea actuală (13 octombrie 2026):** schema a fost aplicată în proiectul Supabase `cabnNEW` (`wqogynlfehnwdlbvquos`), prin migrarea `20261013183057_instagram_property_promotions`. Interfața pentru proprietari este disponibilă implicit în dezvoltarea locală și dezactivată implicit în producție; `INSTAGRAM_PROMOTION_ENABLED` poate suprascrie explicit acest comportament. Programările externe sunt dezactivate implicit și au o opțiune separată. Nu sunt necesare Facebook sau TikTok pentru această etapă.

## 1. Structura de date

Conținutul `db/instagram-promotion-schema.sql` a fost aplicat o singură dată, într-o tranzacție, prin instrumentul Supabase `apply_migration`, la cererea explicită a utilizatorului. Migrarea este înregistrată în istoricul proiectului; nu rula din nou scriptul în `cabnNEW`. Fișierul păstrează SQL-ul aplicat pentru revizuire și pentru configurarea separată a altor medii cu schema existentă a portalului proprietarilor.

Scriptul creează:

- `social_promotions`: o campanie Instagram per cazare, conținutul curent, versiunea, acordul, starea și identificatorul Buffer.
- `social_promotion_events`: istoricul versiunilor și acordurilor, cu textul și imaginile exacte.
- `social_promotion_worker`: blocarea comună pentru procesări concurente.
- Indici pentru coadă și o constrângere unică pentru săptămâna publicării.
- Triggere care marchează un acord ca necesitând reverificare dacă se schimbă datele, proprietarul sau galeria/facilitățile cazării.

Tabelele au RLS activ și nu permit acces direct browserelor. API-urile folosesc clienții existenți și verifică proprietarul sau rolul backoffice. Proprietarul este singurul care poate da acordul. Ștergerea unei cazări păstrează campania pentru oprirea programării externe.

## 2. Configurarea serverului

Configurează valorile prin mecanismul de secrete al găzduirii. Nu introduce cheia în cod, în variabile `NEXT_PUBLIC_*` sau în conversație. Fișierele `.env*` nu au fost citite sau modificate.

| Variabilă nouă | Rol |
| --- | --- |
| `INSTAGRAM_PROMOTION_ENABLED` | `true` afișează interfața și permite generarea/aprobarea preview-urilor; `false` o dezactivează explicit. Dacă lipsește, interfața este activă în dezvoltarea locală și dezactivată în producție. |
| `BUFFER_API_KEY` | Cheie personală generată în Buffer → Settings → API. |
| `BUFFER_INSTAGRAM_CHANNEL_ID` | Identificatorul canalului Instagram `cabn.ro`, preluat prin API Explorer Buffer. |
| `INSTAGRAM_PROMOTION_PUBLISHING_ENABLED` | `true` permite trimiterea și programarea în Buffer. Păstrează dezactivată până la validarea pilotului. |
| `INSTAGRAM_PROMOTION_CRON_SECRET` | Secret aleatoriu de cel puțin 32 de caractere pentru verificarea periodică. |

Se reutilizează configurația Supabase și R2 deja folosită de website. Preview-urile finale sunt JPEG 1080×1350 și se păstrează în R2 sub `social/instagram/`, cu URL-uri unice. Fotografiile sursă sunt acceptate numai din R2 sau din stocarea publică Supabase configurată.

În Buffer Free păstrează Instagram ca un canal conectat. Contul trebuie să fie Creator/Business și să permită publicare automată. Verificarea din backoffice validează că acel canal este `cabn.ro`, conectat, deblocat și cu coada activă.

## 3. Verificarea interfeței, cu publicarea dezactivată

După configurarea bazei, interfața este disponibilă implicit pe serverul local de dezvoltare. Pentru alte medii de verificare, activează `INSTAGRAM_PROMOTION_ENABLED=true`. Lasă publicarea externă dezactivată.

1. Trimite o cazare completă: pagina confirmă trimiterea și deschide pasul opțional Instagram. Acesta este disponibil și din contul proprietarului.
2. Verifică textul automat, selectează 1–5 fotografii, schimbă ordinea și decupajul.
3. Apasă „Generează și salvează preview-ul final”. Prima imagine este coperta cabn; verifică toate JPEG-urile, inclusiv titlurile lungi și diacriticele. Salvarea se face explicit prin acest buton în această versiune.
4. Aprobă versiunea finală prin checkbox și buton. Campania rămâne în coadă; nu pleacă spre Buffer cu publicarea dezactivată.
5. Deschide Backoffice → Promovare. Verifică preview-ul, starea acordului și calendarul.
6. Verifică faptul că un alt proprietar nu poate accesa cazarea și că personalul nu poate aproba în locul proprietarului.

## 4. Pilotul și activarea publicării

Migrarea bazei live este finalizată. Activarea publicării și prima publicare reală rămân pași separați, cu acordul utilizatorului. Nu publica date demonstrative ca proprietate reală.

După validarea manuală a interfeței, configurează cheia/canalul și folosește „Verifică Buffer”. Activează programarea într-un mediu și cu un conținut aprobat pentru pilot; verifică cererile API reale înainte de a considera integrarea validată.

Fluxul verifică: acordul pentru versiunea curentă, proprietarul, datele și fotografiile cazării, starea publicată și perioada de valabilitate. Creează mai întâi un draft Buffer și salvează identificatorul lui; abia apoi îl programează. O întrerupere poate lăsa un draft nepublicat, iar reluările folosesc același identificator pentru a preveni publicările duplicate.

Programul inițial este **joi, 19:00, Europe/Bucharest**, cu minimum o oră înainte de publicare. Ora de vară este calculată separat pentru fiecare dată. Este o ipoteză de pornire, nu o oră optimă demonstrată. Se programează cel mult patru campanii în avans, sub limita Buffer Free. Backoffice permite pauză, reintroducere în coadă și alegerea altei zile de joi. Un conținut editat de personal cere acord nou; schimbarea exclusivă a datei păstrează acordul.

## 5. Verificarea periodică

După activarea publicării, configurează separat în **Supabase Cron → Create job → HTTP request** un apel zilnic:

- Metodă: `GET`.
- URL: `https://www.cabn.ro/api/social-promotions/process` (folosește domeniul mediului care găzduiește configurația validată).
- Header: `Authorization: Bearer <valoarea INSTAGRAM_PROMOTION_CRON_SECRET>`.
- Interval inițial: zilnic la 05:00 UTC, cu timeout HTTP suficient pentru funcția de maximum 180 de secunde.

Verifică disponibilitatea Cron/HTTP, limitele planului și istoricul execuțiilor din proiectul existent înainte de activare. Un secret prezent pe server nu confirmă că jobul periodic a fost creat. Nu s-au creat joburi sau modificat configurații de deployment în această implementare.

Schimbările de cazare și galerie solicită și o verificare după răspunsul API, prin `after()` din Next.js; jobul periodic recuperează verificările ratate. Postările trimise sunt confirmate din Buffer, nu doar marcate local ca publicate. Erorile apar în backoffice; această versiune nu trimite emailuri sau notificări externe.

Verifică periodic modificările și anulările în Buffer. O anulare este confirmată local doar după ce Buffer a mutat postarea în draft. O publicare deja trimisă sau aflată în procesare necesită gestionare separată. Modificările făcute direct în Buffer pot afecta programul; gestionează campaniile CABN din backoffice.

## 6. Verificări înainte de lansare

- Cazare nepublicată + acord: rămâne în coadă.
- Cazare publicată fără acord: nu se programează.
- Două campanii eligibile: primesc săptămâni diferite.
- Retragerea acordului/pauza: postarea Buffer devine draft înainte de confirmarea locală.
- Editarea textului/imaginilor: acordul vechi rămâne în istoric și se cere unul nou.
- Modificarea/ștergerea cazării sau a unei imagini: verificarea oprește programarea și afișează dacă este necesar acord nou.
- Reprogramare într-o săptămână ocupată, într-o altă zi sau prea aproape de ora curentă: este refuzată.
- Timeout după crearea draftului sau după programare: se verifică identificatorul existent, fără o nouă publicare.
- Trecerea la ora de iarnă/vară: ora afișată rămâne 19:00 în România.
- Publicare reușită: starea și linkul Instagram sunt actualizate la verificarea următoare.

### Verificare efectuată la 13 octombrie 2026

La cererea utilizatorului au fost executate verificările locale:

- `npm run build` s-a încheiat cu codul 0, inclusiv compilarea, lint, verificarea tipurilor și generarea paginilor.
- 14 scenarii izolate pentru calendar și text au trecut: ora de vară/iarnă, schimbarea anului, săptămâni ocupate, limita de o oră, date invalide și limita textului. Nu au folosit rețeaua sau scrieri în baza de date.
- Serverul local de producție a returnat `401` fără autentificare pentru API-urile proprietarului, backoffice-ului și workerului; un identificator invalid a primit `400`. Toate aceste răspunsuri au avut `Cache-Control: private, no-store`.
- Pagina de promovare a afișat autentificarea proprietarului în browser, fără erori sau avertismente în consolă. Interfața a fost activată numai în procesul local de verificare, cu publicarea dezactivată.
- Inspecția read-only inițială a proiectului Supabase conectat, `cabnNEW`, a confirmat lipsa tabelelor de promovare înainte de migrare și prezența coloanelor existente ale cazărilor și galeriei folosite de implementare.

### Migrare aplicată și verificată la 13 octombrie 2026

- Istoricul Supabase confirmă versiunea `20261013183057`, nume `instagram_property_promotions`.
- Cele trei tabele au RLS activ. Accesul direct pentru `anon` și `authenticated` este revocat; `service_role` are accesul necesar, inclusiv la secvența istoricului.
- Toate cele cinci triggere sunt active. Cele trei funcții folosesc `SECURITY INVOKER`, cu `search_path` fixat și execuție restricționată.
- Verificarea tranzacțională sub `service_role` a confirmat salvarea draftului, înregistrarea aprobării și a necesității unui acord nou, istoricul reviziilor, excluderea blocărilor interne din snapshot-uri, respingerea unei săptămâni duplicate și respingerea programării fără acord. Tranzacția de verificare a fost anulată integral prin `ROLLBACK`; nu s-au modificat cazări existente sau apelat servicii externe.
- Verificarea finală confirmă zero campanii și zero evenimente persistente, plus workerul Instagram inițializat și deblocat.
- Supabase Advisors raportează pentru tabelele noi doar informația [RLS activ fără politici](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), intenționată pentru accesul exclusiv prin server. Permisiunile browserului au fost verificate separat ca fiind revocate.

### Refactor UX și verificare autentificată — 13 octombrie 2026

- Contul proprietarului are un antet compact, carduri cu starea cazării și a promovării, plus revendicare discretă, închisă implicit. Linkurile `listing`/`claim` pot deschide direct formularul de acces existent.
- Instagram folosește un singur editor: text, fotografii numerotate/copertă, încadrare, preview și acord. Pe mobil există comutatorul „Editează / Preview”; pe desktop preview-ul rămâne vizibil lângă editare.
- Mesajele de salvare persistă la schimbarea versiunii. Modificările nesalvate și operațiile în curs sunt protejate la navigare, iar stările pot fi reîncărcate explicit. În backoffice, editarea și modificarea programării se blochează reciproc pe durata operațiilor.
- Salvarea unei versiuni identice nu regenerează imaginile și nu retrage acordul. Confirmarea acordului răspunde imediat; programarea Buffer continuă prin callbackul existent, cu opțiunea separată de publicare.
- Au trecut 26 de scenarii offline pentru contractele API, estimarea indisponibilă, versiuni concurente, salvarea identică, eligibilitatea aprobării și izolarea datelor proprietarului. Au folosit numai date fictive și mocks în memorie.
- Browserul local autentificat a confirmat revendicarea restrânsă, navigarea din cont în editor, generarea și salvarea preview-ului real și sincronizarea corectă după o editare numai cu spații. Au fost verificate layouturile la 390 px și 1280 px.
- Cazarea de test are un draft Instagram cu cinci imagini finale, versiunea 1. Verificarea read-only confirmă că acordul nu este dat, iar campania nu este trimisă către Buffer sau programată.

**Pilotul Buffer rămâne necesar înaintea activării publicării.** Structura bazei, interfața autentificată și salvarea preview-ului sunt verificate. Nu s-au citit fișiere cu secrete sau trimis cereri către Buffer.

Fișierele refactorului: `app/(public)/proprietari/page.tsx`, `components/owner/OwnerListingCard.tsx`, `components/owner/OwnerClaimSection.tsx`, `lib/ownerPortal.ts`, `components/forms/OwnerOtpGate.tsx`, `app/(public)/proprietari/promovare/[id]/page.tsx`, `components/forms/InstagramPromotionEditor.tsx`, `components/social/InstagramPostPreview.tsx`, `hooks/useInstagramPromotion.ts`, `lib/social/instagram.ts`, `lib/server/instagramPromotions.ts`, `app/api/social-promotions/[listingId]/route.ts`, `app/api/owner/route.ts`, `components/admin/sections/SocialPromotionsSection.tsx` și acest ghid.

## Oprire și limite

`INSTAGRAM_PROMOTION_PUBLISHING_ENABLED=false` oprește programările noi și workerul; nu anulează postările deja programate în Buffer. Pentru oprire completă, pune mai întâi campaniile în pauză din backoffice sau oprește coada Instagram direct în Buffer și verifică rezultatul.

Păstrează imaginile asociate acordurilor/publicărilor. Un preview regenerat primește alte URL-uri; randările întrerupte pot lăsa fișiere neasociate. Curățarea și retenția lor nu sunt automatizate în această etapă. Feature-ul este numai pentru Instagram; video, Facebook, TikTok, autosave și optimizarea automată a orelor rămân etape ulterioare.

Referințe: [Buffer API](https://developers.buffer.com/), [Buffer Free](https://buffer.com/pricing), [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart), [Next.js after](https://nextjs.org/docs/app/api-reference/functions/after).

## Fișierele acestei implementări

Fișiere noi:

- `app/(public)/proprietari/promovare/[id]/page.tsx`
- `app/api/social-promotions/[listingId]/route.ts`
- `app/api/social-promotions/process/route.ts`
- `app/api/backoffice/social-promotions/route.ts`
- `components/forms/InstagramPromotionEditor.tsx`
- `components/admin/sections/SocialPromotionsSection.tsx`
- `lib/social/instagram.ts`
- `lib/server/bufferInstagram.ts`
- `lib/server/instagramMedia.ts`
- `lib/server/instagramPromotionConfig.ts`
- `lib/server/instagramPromotionHttp.ts`
- `lib/server/instagramPromotions.ts`
- `db/instagram-promotion-schema.sql`
- `db/instagram-promotion-setup.md`

Fișiere existente modificate punctual:

- `app/(public)/add-property/page.tsx`
- `app/(public)/add-property/add-property-client.tsx`
- `app/(public)/proprietari/page.tsx`
- `app/(backoffice)/drafts/drafts-client.tsx`
- `app/api/owner/route.ts`
- `app/api/listing-update/route.ts`
- `app/api/listing-delete/route.ts`
- `app/api/listing-images/delete/route.ts`
- `app/api/listing-images/reorder/route.ts`
- `app/api/listing-upload-file/route.ts`
- `components/admin/BackofficeSidebar.tsx`
- `components/admin/BackofficeMobileDrawer.tsx`
- `lib/admin/draftsDashboard.ts`
