const fs = require('node:fs/promises');
const path = require('node:path');
const { Workbook, SpreadsheetFile } = require('@oai/artifact-tool');

const OUTPUT_DIR = path.resolve(
  __dirname,
  '..',
  'outputs',
  '019fb214-2d58-7fc3-b9c0-d5f6971658cb'
);
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'NOVA-PLAN-PROFITABILITATE-B2B-2026.xlsx');
const PREVIEW_DIR = path.join(OUTPUT_DIR, 'workbook-previews');

const COLORS = {
  ink: '#18231F',
  forest: '#2E433B',
  forestDark: '#20322C',
  sage: '#DCE6E0',
  sageLight: '#F2F6F3',
  gold: '#B5A17A',
  goldLight: '#EFE8D9',
  blueInput: '#E8F1FA',
  blueText: '#1D4E89',
  white: '#FFFFFF',
  grid: '#CBD5CF',
  gray: '#5D6B65',
  red: '#B42318',
  redLight: '#FDECEC',
  amber: '#A15C00',
  amberLight: '#FFF2D8',
  green: '#18794E',
  greenLight: '#E6F4EC'
};

const prospects = [
  [1, 'Speedwell', 'Dezvoltare imobiliară', 'A', 9.2, 'București, Sector 1', 'Echipă locală și proiecte multiple; probabil mobilitate frecventă între birou și șantiere.', 'COO / Office Manager / Procurement', 'office@speedwell.be · +40 753 130 352', 'https://www.speedwell.be/were-here/', 'Există 5–30 autoturisme și 2–5 retururi în următoarele 90 zile?', 'Trimite email scurt + apel la 24h', 'Necontactat'],
  [2, 'HILS Development', 'Dezvoltare imobiliară', 'A', 9.0, 'București, Sector 3', 'Portofoliu local mare și echipe de vânzări/șantier; accesibilitate bună pentru pilot.', 'Director operațional / Administrativ / Achiziții', 'vanzari@hils.ro · +40 310 050 806', 'https://hils.ro/', 'Cine gestionează mașinile de management și datele de retur?', 'Cere redirecționare către administrativ', 'Necontactat'],
  [3, 'REDPORT', 'Dezvoltare imobiliară', 'A', 8.9, 'București, Sector 1', 'Dezvoltator antreprenorial local; ciclu de decizie probabil mai scurt decât la corporații.', 'COO / Office Manager / Procurement', 'office@redport.ro · +40 310 052 150', 'https://redport.ro/ro/contact/', 'Ce vehicule ies din leasing în următoarele 3–6 luni?', 'Email cu pilot 3 mașini', 'Necontactat'],
  [4, 'Nusco Imobiliara', 'Dezvoltare imobiliară', 'A', 8.8, 'București, Sector 2', 'Mai multe proiecte și deplasări de management/vânzări în București–Ilfov.', 'Administrativ / Procurement / CFO', 'info@nusco.ro · +40 311 309 748', 'https://nusco.ro/temp/contact-us/', 'Au ghiduri de retur diferite pe lessor sau un singur furnizor?', 'Email + apel de calificare', 'Necontactat'],
  [5, 'IMPACT Developer & Contractor', 'Dezvoltare imobiliară', 'A', 8.7, 'București, Sector 1', 'Dezvoltator listat cu proiecte locale; probabil procese administrative și vehicule de companie.', 'Procurement / Administrativ / Fleet', 'office@impactsa.ro · +40 21 230 7570', 'https://impactsa.ro/contact', 'Câte mașini sunt alocate managementului și echipelor de proiect?', 'Telefon pentru identificarea responsabilului', 'Necontactat'],
  [6, 'Genesis Property', 'Property management', 'A', 8.6, 'București, Sector 6', 'Administrează campusuri de birouri; operațiuni și deplasări locale recurente.', 'COO / Facility / Procurement', 'office@genesisproperty.net · +40 21 539 0107', 'https://www.genesisproperty.net/en/contact/leasing/', 'Există ferestre trimestriale de retur sau înlocuire a mașinilor?', 'Email către office, solicitare administrativ', 'Necontactat'],
  [7, 'Graphein', 'Inginerie / BIM / topografie', 'A', 8.5, 'București, Sector 1', 'Echipă de proiect cu deplasări; profil antreprenorial și accesibil pentru un pilot.', 'COO / Operations / Office Manager', 'office@graphein.ro · +40 742 799 626', 'https://graphein.ro/en/contact/', 'Câte mașini sunt folosite pentru vizite pe teren și când se returnează?', 'Email personalizat pe operațiuni de teren', 'Necontactat'],
  [8, 'Leviatan Design', 'Inginerie / construcții', 'A', 8.4, 'București, Sector 3', 'Companie de proiectare cu echipe de teren și sediu local; potrivire bună pentru pre-retur.', 'Procurement / Operations / Fleet', 'formular +40 21 320 0138', 'https://leviatan.ro/en/home/', 'Care este lessorul și cine aprobă recondiționarea înainte de retur?', 'Apel și cerere Procurement', 'Necontactat'],
  [9, 'Zitec', 'Tehnologie', 'A', 8.2, 'București, Sector 3', 'Companie antreprenorială matură, sediu local și decizie administrativă accesibilă.', 'Office Manager / Finance / Operations', 'contact@zitec.com · +40 31 710 0114', 'https://zitec.com/contact/', 'Există mașini de management sau benefit auto în leasing operațional?', 'Email către contact cu cerere Office Manager', 'Necontactat'],
  [10, 'mindit.io', 'Tehnologie', 'A', 8.1, 'București, Sector 2', 'Companie românească, echipă de management locală și cultură de proiect-pilot.', 'Office Manager / COO / Finance', 'contact@mindit.io', 'https://mindit.io/contact-us/', 'Cine gestionează contractele auto și ce retururi sunt planificate?', 'Mesaj scurt, pilot și întrebare de calificare', 'Necontactat'],
  [11, 'One United Properties', 'Dezvoltare imobiliară', 'B', 8.0, 'București, Sector 1', 'Portofoliu foarte mare și multe deplasări; valoare potențială mare, dar procurement mai lent.', 'Procurement / Administrativ / Fleet', 'office@one.ro · +40 31 225 1000', 'https://www.one.ro/ro/contact/', 'Există o flotă locală sub 30 de autoturisme într-o divizie ce poate pilota?', 'Cere pilot într-o singură entitate/divizie', 'Necontactat'],
  [12, 'Forte Partners', 'Dezvoltare imobiliară', 'B', 7.9, 'București', 'Dezvoltator de birouri cu echipă locală și activitate de proiect.', 'COO / Office Manager / Procurement', 'formular oficial', 'https://www.forte-partners.ro/', 'Cine răspunde de mașinile de management și de retururile de leasing?', 'Contact prin formular + LinkedIn rol companie', 'Necontactat'],
  [13, 'Cordia România', 'Dezvoltare imobiliară', 'B', 7.8, 'București, Sector 1', 'Dezvoltator local, proiecte rezidențiale și echipă de management în București.', 'Administrativ / Operations / CFO', '+40 759 890 890 · formular', 'https://cordia.ro/contact/', 'Câte mașini sunt în leasing și când este următoarea fereastră de retur?', 'Apel pentru responsabil administrativ', 'Necontactat'],
  [14, 'Hagag Development Europe', 'Dezvoltare imobiliară', 'B', 7.7, 'București', 'Portofoliu local premium; aliniere bună cu poziționarea Nova.', 'Office Manager / Procurement / COO', 'formular oficial', 'https://hagag-development-europe.com/', 'Există vehicule premium ce ies din leasing în 90–180 zile?', 'Contact general + cerere administrativ', 'Necontactat'],
  [15, 'Softbinator Technologies', 'Tehnologie', 'B', 7.6, 'București, Sector 5', 'Companie listată, management local și sediu accesibil.', 'Office Manager / Operations / CFO', 'contact@softbinator.com · +40 757 404 781', 'https://softbinator.com/contact/', 'Există flotă/benefit auto pentru management și un calendar de retur?', 'Email personalizat', 'Necontactat'],
  [16, 'Connections Consult', 'Tehnologie', 'B', 7.5, 'București, Sector 1', 'Grup tehnologic românesc cu operațiuni locale și mai multe centre.', 'Administrativ / Procurement / Finance', 'office@connectionsconsult.ro · +40 372 368 332', 'https://connectionsconsult.ro/contact/', 'Cine gestionează vehiculele și relația cu lessorul?', 'Email + apel în 24h', 'Necontactat'],
  [17, 'Trencadis', 'Tehnologie', 'B', 7.4, 'București, Sector 2', 'Companie românească cu birou local; decident operațional identificabil.', 'COO / Administrativ / Procurement', 'office@trencadis.ro · +40 212 112 111', 'https://trencadis.ro/contact-us.html', 'Există 2–5 retururi de leasing în următorul trimestru?', 'Email scurt și apel', 'Necontactat'],
  [18, 'Bittnet Group', 'Tehnologie / training', 'B', 7.3, 'București, Sector 5', 'Grup local, management și mai multe entități în același hub.', 'Administrativ / CFO / Procurement', 'askformore@bittnet.ro · +40 731 700 226', 'https://www.bittnet.ro/despre-noi/contact/', 'Se poate pilota pe o singură entitate din grup?', 'Cere redirecționare spre administrativ', 'Necontactat'],
  [19, 'NNDKP', 'Servicii juridice', 'B', 7.1, 'București, Sector 2', 'Firmă mare de avocatură; probabil vehicule premium de parteneri/management.', 'COO / Office Manager / Administrativ', 'office@nndkp.ro · +40 21 201 1200', 'https://www.nndkp.ro/', 'Există mașini de companie/parteneri în leasing ce necesită retur pregătit?', 'Email către office; fără outreach personal nesolicitat', 'Necontactat'],
  [20, 'Țuca Zbârcea & Asociații', 'Servicii juridice', 'B', 7.0, 'București', 'Firmă antreprenorială mare cu management local.', 'Office Manager / COO / Administrativ', 'formular oficial', 'https://www.tuca.ro/', 'Cine gestionează furnizorii auto și calendarul retururilor?', 'Contact general + cerere Office Manager', 'Necontactat'],
  [21, 'Mușat & Asociații', 'Servicii juridice', 'B', 6.9, 'București, Sector 1', 'Firmă locală mare, sediu și canal general public.', 'Office Manager / Administrativ / COO', 'general@musat.ro · +40 21 202 5900', 'https://www.musat.ro/contact/', 'Există vehicule premium în leasing cu retur în 3–6 luni?', 'Email scurt, orientat pe discreție și documentare', 'Necontactat'],
  [22, 'Filip & Company', 'Servicii juridice', 'B', 6.8, 'București, Sector 2', 'Firmă de business law cu management local și canal general public.', 'COO / Office Manager / Administrativ', 'office@filipandcompany.com · +40 21 527 2000', 'https://filipandcompany.com/', 'Câte autoturisme de management au fereastră de retur în trimestrul următor?', 'Email office, fără contactarea avocaților individuali', 'Necontactat'],
  [23, 'RTPR', 'Servicii juridice', 'B', 6.7, 'București, Sector 1', 'Firmă locală cu parteneri și sediu central; posibil lot mic de vehicule premium.', 'Office Manager / Administrativ / Finance', 'office@rtpr.ro · +40 31 405 7777', 'https://www.rtpr.ro/contact/', 'Există 2–3 mașini care pot fi incluse într-un pilot?', 'Contact office + follow-up telefonic', 'Necontactat'],
  [24, 'PeliPartners', 'Servicii juridice', 'B', 6.6, 'București, Sector 1', 'Firmă antreprenorială de dimensiune medie; potențial decizie mai scurtă.', 'Office Manager / COO / Administrativ', 'office@pelipartners.com · +40 721 540 051', 'https://pelipartners.com/', 'Cine aprobă furnizorii auto și ce retururi urmează?', 'Email către office', 'Necontactat'],
  [25, 'Popovici Nițu Stoica & Asociații', 'Servicii juridice', 'B', 6.5, 'București, Sector 1', 'Firmă locală mare, cu sediu și operațiuni centralizate.', 'Office Manager / Administrativ / COO', 'office@pnsa.ro · +40 21 317 7919', 'https://pnsa.ro/contact.asp', 'Există mașini în leasing operațional ce ies în următoarele 180 zile?', 'Email general orientat pe pilot', 'Necontactat'],
  [26, 'Schoenherr România', 'Servicii juridice', 'C', 6.3, 'București, Sector 1', 'Echipă de 75 avocați; potențial lot premium, dar achiziție corporativă.', 'Office Manager / Procurement / Finance', 'office.romania@schoenherr.eu · +40 21 319 6790', 'https://www.schoenherr.eu/locations/romania', 'Procesul de furnizor este local sau regional?', 'Califică procurement înainte de ofertă', 'Necontactat'],
  [27, 'Wolf Theiss România', 'Servicii juridice', 'C', 6.2, 'București, Sector 1', 'Birou regional mare; potențial bun, dar aprobare posibil regională.', 'Office Manager / Procurement / Finance', 'bucuresti@wolftheiss.com · +40 21 308 8100', 'https://www.wolftheiss.com/countries/romania/', 'Poate biroul din București aproba un pilot local?', 'Email general, calificare proces', 'Necontactat'],
  [28, 'Concelex', 'Construcții', 'C', 6.1, 'București, Sector 1', 'Companie mare cu operațiuni de șantier; flotă probabilă, dar proces mai lung și vehicule diverse.', 'Fleet / Procurement / Operations', 'office@concelex.ro · +40 21 318 5489', 'https://concelex.ro/', 'Se poate izola lotul de autoturisme, separat de utilitare?', 'Cere Fleet/Procurement și pilot pe autoturisme', 'Necontactat'],
  [29, "Bog'Art", 'Construcții', 'C', 6.0, 'București, Sector 1', 'Contractor mare, echipe multiple și Procurement Director public ca rol; valoare mare, ciclu lung.', 'Procurement Director / Fleet / Operations', 'office@bogart.ro · +40 21 310 3238', 'https://www.bogart.ro/contact-us/', 'Ce autoturisme de management pot intra într-un pilot separat de flotă?', 'Cere Procurement, nu ofertă generică', 'Necontactat'],
  [30, 'Reff & Associates', 'Servicii juridice', 'C', 5.9, 'București', 'Firmă mare integrată într-o rețea globală; potențial, dar onboarding furnizor mai lent.', 'Office Manager / Procurement / Administrativ', 'formular oficial', 'https://www.reff-associates.ro/re/en/contact/contact-us.html', 'Achiziția se aprobă local și există vehicule eligibile?', 'Califică procesul înainte de propunere', 'Necontactat']
];

const dailyPlan = [
  ['Ziua 1', 'Ofertă', 'Blochează oferta pilot: 3 mașini, o locație, raport foto 24–48h, remediere separat.', 'Fișă ofertă v1 aprobată', 'Fondator', 'Nu a început'],
  ['Ziua 2', 'Profitabilitate', 'Creează fișa de pontaj pe tehnician, boxă, materiale și rework pentru următoarele 20 lucrări.', '100% lucrări măsurate', 'Fondator + atelier', 'Nu a început'],
  ['Ziua 3', 'Legal/comercial', 'Pregătește ofertă, comandă pilot, termeni, GDPR și disclaimer: raportul nu este evaluare oficială a lessorului.', 'Set documente gata', 'Fondator + avocat/contabil', 'Nu a început'],
  ['Ziua 4', 'Livrare', 'Finalizează șablonul Raport Nova: cadre obligatorii, severitate, recomandare, accept client.', 'Raport pilot v1', 'Atelier', 'Nu a început'],
  ['Ziua 5', 'CRM', 'Importă cei 30 de prospecți, completează rolurile și verifică primele 10 canale oficiale.', '10 conturi validate', 'Fondator', 'Nu a început'],
  ['Ziua 6', 'Prospectare', 'Identifică rolurile-țintă în companiile A și pregătește câte un motiv specific de contact.', '10 mesaje personalizate', 'Fondator', 'Nu a început'],
  ['Ziua 7', 'Mesaj', 'Testează scriptul de email, apel și follow-up cu doi antreprenori cunoscuți; elimină jargonul.', 'Script v2', 'Fondator', 'Nu a început'],
  ['Ziua 8', 'Outbound', 'Trimite primele 10 emailuri pe canale corporate; loghează ora și următorul pas.', '10 atingeri', 'Fondator', 'Nu a început'],
  ['Ziua 9', 'Outbound', 'Sună primele 5 companii și cere doar responsabilul + calendarul retururilor.', '5 apeluri', 'Fondator', 'Nu a început'],
  ['Ziua 10', 'Conținut', 'Publică pagina Companii și un exemplu anonim de structură de raport.', 'Pagină live/local validată', 'Fondator + web', 'Nu a început'],
  ['Ziua 11', 'Outbound', 'Trimite al doilea lot de 10 emailuri; folosește altă ipoteză pe segment.', '20 conturi atinse cumulat', 'Fondator', 'Nu a început'],
  ['Ziua 12', 'Follow-up', 'Follow-up la lotul 1: o întrebare, o dovadă, un CTA de 15 minute.', 'Minim 3 răspunsuri cumulat', 'Fondator', 'Nu a început'],
  ['Ziua 13', 'Discovery', 'Ține primele discuții; colectează număr vehicule, lessor, date retur, durere, aprobator și buget.', '1–2 discovery', 'Fondator', 'Nu a început'],
  ['Ziua 14', 'Propunere', 'Trimite oferta pilot în maximum 2 ore după discovery, cu două ferestre de programare.', '1 ofertă trimisă', 'Fondator', 'Nu a început'],
  ['Ziua 15', 'Review', 'Analizează 50+ atingeri, rata de răspuns și obiecțiile; schimbă segmentul dacă răspunsul este sub 5%.', 'Decizie de optimizare', 'Fondator', 'Nu a început'],
  ['Ziua 16', 'Outbound', 'Abordează următoarele 10 conturi și 5 introduceri calde de la clienți/furnizori.', '15 atingeri', 'Fondator', 'Nu a început'],
  ['Ziua 17', 'Discovery', 'Rulează o simulare de inspecție de 3 mașini și măsoară timpul complet.', 'Timp pilot măsurat', 'Atelier', 'Nu a început'],
  ['Ziua 18', 'Follow-up', 'Follow-up lotul 2 și oferte deschise; cere data exactă a deciziei.', '2 oferte active', 'Fondator', 'Nu a început'],
  ['Ziua 19', 'Pilot', 'Confirmă primul pilot în scris, colectează ghidul lessorului și lista VIN.', 'Pilot programat', 'Fondator', 'Nu a început'],
  ['Ziua 20', 'Pilot', 'Execută inspecțiile, fotografiile și trierea; nu începe remedierea fără acord.', '3 fișe complete', 'Atelier', 'Nu a început'],
  ['Ziua 21', 'Raport', 'Livrează raportul în 24–48h cu opțiuni: acceptabil, de monitorizat, recomandat de remediat.', 'Raport la termen', 'Atelier + fondator', 'Nu a început'],
  ['Ziua 22', 'Upsell', 'Prezintă remedierea separat, cu preț, timp, risc și aprobare pe fiecare vehicul.', 'Decizie pe remediere', 'Fondator', 'Nu a început'],
  ['Ziua 23', 'Dovadă', 'Cere feedback și permisiune pentru studiu de caz anonim; cuantifică timpul și costul evitat doar dacă e verificabil.', 'Testimonial sau feedback', 'Fondator', 'Nu a început'],
  ['Ziua 24', 'Cadru', 'Propune acord 6 luni: audit la retur + SLA + prețuri pe tip de intervenție, fără volum garantat.', 'Propunere cadru', 'Fondator', 'Nu a început'],
  ['Ziua 25', 'Pipeline', 'Completează alte 20 de conturi pentru valul 2 folosind profilul care a răspuns cel mai bine.', '50 conturi în CRM', 'Fondator', 'Nu a început'],
  ['Ziua 26', 'Operațional', 'Finalizează SOP: recepție, fotografii, chei, custodie, aprobare, rework, predare.', 'SOP v1 semnat intern', 'Atelier', 'Nu a început'],
  ['Ziua 27', 'Financiar', 'Calculează marja reală pe pilot, lei/oră tehnician și lei/zi boxă; compară cu retail.', 'Fișă unit economics', 'Fondator', 'Nu a început'],
  ['Ziua 28', 'Închidere', 'Negociază doar pe scop/volum, nu pe standard; cere semnătură și data primei ferestre.', 'Acord verbal sau obiecție finală', 'Fondator', 'Nu a început'],
  ['Ziua 29', 'Administrativ', 'Testează contract, factură, e-Factura, arhivare raport și email de predare.', 'Flux administrativ testat', 'Fondator + contabil', 'Nu a început'],
  ['Ziua 30', 'Gate 30 zile', 'Decide: scalează, ajustează sau oprește ipoteza pe baza KPI-urilor, nu a impresiilor.', '1 pilot + 3 oferte sau pivot', 'Fondator', 'Nu a început']
];

const weeklyPlan = [
  ['S1', 'Oferta și măsurarea', 'Oferta pilot, raportul și time-study sunt gata.', '20 conturi validate; 0 promisiuni neacoperite', 'Nu a început'],
  ['S2', 'Primul outbound', 'Primele două loturi de outreach și scriptul de apel.', '20 conturi; 35–40 atingeri; ≥2 răspunsuri', 'Nu a început'],
  ['S3', 'Discovery', 'Calificare strictă după flotă, retur, lessor și aprobator.', '2–3 discovery; 1 ofertă pilot', 'Nu a început'],
  ['S4', 'Primul pilot', 'Programare și execuție pilot sau decizie de schimbare a segmentului.', '1 pilot programat; ≥80 atingeri cumulat', 'Nu a început'],
  ['S5', 'Dovadă', 'Raport livrat la termen și marjă calculată.', 'SLA 100%; marjă contribuție ≥55%', 'Nu a început'],
  ['S6', 'Al doilea pilot', 'Aplică lecțiile și scurtează timpul fără a reduce standardul.', '2 piloți cumulat; rework <5%', 'Nu a început'],
  ['S7', 'Studiu de caz', 'Caz anonim și oferta cadru 6 luni.', '1 studiu de caz; 1 propunere cadru', 'Nu a început'],
  ['S8', 'Primul acord', 'Închide un acord cu fereastră concretă de lucru.', '1 client cadru semnat', 'Nu a început'],
  ['S9', 'Pipeline 2', 'Extinde la încă 20–30 companii similare contului câștigat.', '60 conturi; 120 atingeri/lună', 'Nu a început'],
  ['S10', 'Recurență', 'Calendar de retururi pe 90 zile și forecast pe capacitate.', '2 luni vizibile în pipeline', 'Nu a început'],
  ['S11', 'Parteneriate', 'Testează introduceri prin brokeri, contabili, administratori și clienți existenți.', '5 introduceri calde', 'Nu a început'],
  ['S12', 'Marjă', 'Reprețuiește orice serviciu sub pragul de contribuție.', 'Nicio ofertă sub 55% contribuție', 'Nu a început'],
  ['S13', 'Gate 90 zile', 'Revizuiește segment, ofertă, cash și capacitate.', '2 clienți activi sau pivot documentat', 'Nu a început']
];

const monthlyPlan = [
  ['Luna 1', 'Validare', '1 pilot plătit, ofertă repetabilă, 20 lucrări măsurate.', '80–120 atingeri; 5 discovery; 3 oferte; 1 pilot', 'Nu angaja și nu cumpăra echipamente mari.'],
  ['Luna 2', 'Dovadă', '2 piloți cumulat și un studiu de caz utilizabil.', 'SLA ≥95%; marjă contribuție ≥55%; rework <5%', 'Dacă nu există piloți, restrânge ICP-ul.'],
  ['Luna 3', 'Primul contract', '1 client cadru și calendar de retururi pe 90 zile.', '1 client activ; B2B ≥10% venit', 'Păstrează doar segmentele cu răspuns.'],
  ['Luna 4', 'Repetabilitate', 'Al doilea client activ și raport standard stabil.', '2 clienți; 3 piloți/lună', 'Nu accepta discount fără volum sau scop redus.'],
  ['Luna 5', 'Capacitate', 'Planificare retail+B2B pe boxă și tehnician.', 'Utilizare 55–65%; rework <4%', 'Protejează sloturile retail profitabile.'],
  ['Luna 6', 'Break-even', 'Rezultat operațional lunar pozitiv în scenariul de bază.', 'Venit net ~50k; rezultat >0; cash pozitiv', 'Dacă bufferul nu e finanțat, limitează investițiile și costul fix.'],
  ['Luna 7', 'Recurență', '3 clienți activi și forecast pe 8 săptămâni.', 'B2B ≥20% venit; churn 0', 'Adaugă SLA doar dacă operațional este susținut.'],
  ['Luna 8', 'Referințe', '2 studii de caz și un mecanism de recomandări.', '5 introduceri calde/lună', 'Nu publica economii nevalidate.'],
  ['Luna 9', 'Scalare controlată', 'Al patrulea client activ; CRM și ofertare disciplinate.', 'Pipeline ponderat ≥2× ținta lunară', 'Nu extinde geografic înainte de densitate locală.'],
  ['Luna 10', 'Eficiență', 'Timp mediu de raport și remediere în scădere.', 'Lei/oră tehnician +10% față de L2', 'Standardizează, nu grăbi etapele de control.'],
  ['Luna 11', 'Portofoliu', 'Renegociază clienții sub marjă și retrage serviciile slabe.', 'Contribuție totală ≥68%', 'Elimină VIP anual în forma veche.'],
  ['Luna 12', 'Profitabilitate', '5 clienți activi, rezultat anual pozitiv și cash buffer refăcut.', 'Venit 12M ~600k; profit operațional >0; cash >45k', 'Aprobă angajarea doar cu cerere contractată.']
];

const sources = [
  ['Fiscal', 'TVA 21% începând cu 1 august 2025', 'ANAF', 'https://static.anaf.ro/static/10/Anaf/AsistentaContribuabili_r/Cotele_de_TVA_09.2025.pdf', 'Modelul este net de TVA; verifică permanent actualizările.'],
  ['Fiscal', 'RO e-Factura: termen de transmitere 5 zile lucrătoare în 2026', 'ANAF', 'https://static.anaf.ro/static/3/Ploiesti/20260115111226_comunicat%20ajfp%20arges%20-%20modificari%20ro%20e-factura%20site.pdf', 'Confirmă fluxul cu contabilul.'],
  ['Registru', 'CAEN Rev.3: corespondența vechiului 4520 către 9531', 'ONRC', 'https://www.onrc.ro/documente/anunturi/Corespondenta-CAEN-Rev.2-CAEN-Rev.3.pdf', 'Verifică obiectul de activitate înainte de contractare.'],
  ['Registru', 'Structura completă CAEN Rev.3', 'ONRC', 'https://www.onrc.ro/documente/caen/CAEN_Rev.3_structura_completa.pdf', 'Referință oficială.'],
  ['Retur leasing', 'Ghid de returnare vehicule flotă', 'Ayvens România', 'https://www.ayvens.com/-/media/ayvens/public/ro/ghid-returnare-vehicule-flota-ex-lp.pdf?rev=-1', 'Raportul Nova este pre-retur, nu evaluare oficială.'],
  ['Retur leasing', 'Proces de returnare și evaluare', 'Business Lease România', 'https://www.businesslease.ro/pentru-clienti/returnarea-masinii', 'Evaluatorul/lessorul decide taxarea finală.'],
  ['Date personale', 'Regulamentul general privind protecția datelor', 'EUR-Lex', 'https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX%3A32016R0679', 'Formularul B2B trebuie să aibă informare și retenție.'],
  ...prospects.map((row) => ['Prospect', `${row[1]} – canal public`, row[1], row[9], 'Flota și retururile nu sunt confirmate public; se califică înainte de ofertă.'])
];

function colName(n) {
  let name = '';
  while (n > 0) {
    n -= 1;
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26);
  }
  return name;
}

function titleBlock(sheet, title, subtitle, lastCol) {
  sheet.showGridLines = false;
  sheet.getRange(`A1:${lastCol}1`).merge();
  sheet.getRange('A1').values = [[title]];
  sheet.getRange(`A2:${lastCol}2`).merge();
  sheet.getRange('A2').values = [[subtitle]];
  sheet.getRange(`A1:${lastCol}1`).format = {
    fill: COLORS.forestDark,
    font: { color: COLORS.white, bold: true, size: 18 },
    verticalAlignment: 'center'
  };
  sheet.getRange(`A2:${lastCol}2`).format = {
    fill: COLORS.sage,
    font: { color: COLORS.forestDark, italic: true, size: 10 },
    verticalAlignment: 'center',
    wrapText: true
  };
  sheet.getRange('1:1').format.rowHeight = 32;
  sheet.getRange('2:2').format.rowHeight = 30;
}

function styleHeader(range) {
  range.format = {
    fill: COLORS.forest,
    font: { color: COLORS.white, bold: true, size: 10 },
    wrapText: true,
    verticalAlignment: 'center',
    horizontalAlignment: 'center',
    borders: { preset: 'all', style: 'thin', color: COLORS.grid }
  };
  range.format.rowHeight = 30;
}

function styleBody(range) {
  range.format = {
    font: { color: COLORS.ink, size: 9 },
    wrapText: true,
    verticalAlignment: 'top',
    borders: { preset: 'all', style: 'thin', color: COLORS.grid }
  };
}

function setWidths(sheet, widths) {
  widths.forEach((width, index) => {
    sheet.getRange(`${colName(index + 1)}:${colName(index + 1)}`).format.columnWidth = width;
  });
}

function addStatusFormatting(range) {
  range.conditionalFormats.add('containsText', {
    text: 'PASS',
    format: { fill: COLORS.greenLight, font: { color: COLORS.green, bold: true } }
  });
  range.conditionalFormats.add('containsText', {
    text: 'OVER',
    format: { fill: COLORS.redLight, font: { color: COLORS.red, bold: true } }
  });
  range.conditionalFormats.add('containsText', {
    text: 'ATENȚIE',
    format: { fill: COLORS.amberLight, font: { color: COLORS.amber, bold: true } }
  });
}

async function buildWorkbook() {
  const wb = Workbook.create();
  const summary = wb.worksheets.add('Rezumat');
  const assumptions = wb.worksheets.add('Ipoteze');
  const model = wb.worksheets.add('Model 12L');
  const funnel = wb.worksheets.add('Funnel Vânzări');
  const prospectSheet = wb.worksheets.add('30 Prospecți');
  const daily = wb.worksheets.add('Plan 30 Zile');
  const weekly = wb.worksheets.add('Plan 13 Săptămâni');
  const monthly = wb.worksheets.add('Plan 12 Luni');
  const kpi = wb.worksheets.add('KPI');
  const checks = wb.worksheets.add('Verificări');
  const sourceSheet = wb.worksheets.add('Surse');

  titleBlock(assumptions, 'NOVA DETAILING · IPOTEZE DE LUCRU', 'Celulele albastre sunt inputuri. Modelul este net de TVA și trebuie înlocuit cu date reale după 20 de lucrări măsurate.', 'D');
  assumptions.getRange('A4:D4').values = [['Categorie', 'Ipoteză', 'Valoare', 'Sursă / motiv']];
  styleHeader(assumptions.getRange('A4:D4'));
  const assumptionRows = [
    ['Fiscal', 'TVA', 0.21, 'ANAF; modelul de profit este net de TVA'],
    ['Cash', 'Cash inițial disponibil', 50000, 'Ipoteză de planificare; confirmă soldul real'],
    ['Capacitate', 'Zile lucrătoare / lună', 22, 'Ipoteză calendar'],
    ['Capacitate', 'Boxe productive', 2, 'Conform planului existent; confirmă fizic'],
    ['Retail', 'Ticket mediu net / lucrare', 2800, 'Ipoteză până la mix real'],
    ['Retail', 'Zile-boxă medii / lucrare', 1.8, 'De măsurat pe 20 lucrări'],
    ['Retail', 'Cost variabil %', 0.27, 'Materiale + consumabile + rework direct'],
    ['B2B pilot', 'Zile-boxă / pilot', 0.15, 'Inspecție preponderent în afara boxei'],
    ['B2B pilot', 'Preț pilot net / 3 mașini', 1500, 'Interval de validare 1.350–1.800 lei + TVA'],
    ['B2B pilot', 'Mașini / pilot', 3, 'Ofertă de intrare'],
    ['B2B pilot', 'Conversie mașini spre remediere', 0.35, 'Ipoteză, nu istoric'],
    ['B2B remediere', 'Ticket mediu net / mașină', 2800, 'Ipoteză până la date reale'],
    ['B2B pilot', 'Cost variabil pilot %', 0.25, 'De măsurat'],
    ['B2B remediere', 'Cost variabil remediere %', 0.32, 'Include consumabile și rework'],
    ['B2B remediere', 'Zile-boxă / remediere', 1.2, 'Ipoteză'],
    ['B2B recurent', 'Venit net / client / lună', 4800, 'Ipoteză: audituri + remedieri aprobate'],
    ['B2B recurent', 'Cost variabil %', 0.30, 'Ipoteză'],
    ['B2B recurent', 'Zile-boxă / client / lună', 1.8, 'Ipoteză'],
    ['Cost fix', 'Remunerație fondator / manager', 7000, 'Cost lunar încărcat'],
    ['Cost fix', '2 tehnicieni – cost total încărcat', 13000, '6.500 lei / tehnician'],
    ['Cost fix', 'Chirie', 5500, 'Ipoteză; înlocuiește cu contractul real'],
    ['Cost fix', 'Utilități și apă', 2500, 'Ipoteză'],
    ['Cost fix', 'Marketing și vânzări', 2500, 'Outbound, conținut, media minimă'],
    ['Cost fix', 'Software, contabilitate, administrativ', 1400, 'Ipoteză'],
    ['Cost fix', 'Asigurări și conformare', 800, 'Ipoteză'],
    ['Cost fix', 'Transport și logistică', 1200, 'Ipoteză'],
    ['Cost fix', 'Mentenanță și diverse', 1200, 'Ipoteză'],
    ['Control', 'Costuri fixe totale', null, 'Formula sumă'],
    ['Control', 'Capacitate utilizabilă țintă', 0.85, 'Păstrează 15% buffer pentru rework și întârzieri'],
    ['Control', 'Buffer minim de cash', 45000, 'Aproximativ 1,3 luni de cost fix'],
    ['Funnel', 'Țintă atingeri / lună', 120, 'Cadru realist owner-led'],
    ['Funnel', 'Țintă discovery / lună', 5, 'Conform obiectivului primului client'],
    ['Funnel', 'Țintă piloți ofertați / lună', 3, 'Conform obiectivului primului client']
  ];
  assumptions.getRange(`A5:D${4 + assumptionRows.length}`).values = assumptionRows;
  assumptions.getRange('C32').formulas = [['=SUM(C23:C31)']];
  styleBody(assumptions.getRange(`A5:D${4 + assumptionRows.length}`));
  assumptions.getRange(`C5:C${4 + assumptionRows.length}`).format.fill = COLORS.blueInput;
  assumptions.getRange(`C5:C${4 + assumptionRows.length}`).format.font = { color: COLORS.blueText, bold: true };
  assumptions.getRange('C32').format.fill = COLORS.goldLight;
  assumptions.getRange('C32').format.font = { color: COLORS.ink, bold: true };
  assumptions.getRange('C5').format.numberFormat = '0%';
  assumptions.getRange('C11').format.numberFormat = '0%';
  assumptions.getRange('C15').format.numberFormat = '0%';
  assumptions.getRange('C17:C18').format.numberFormat = '0%';
  assumptions.getRange('C21').format.numberFormat = '0%';
  assumptions.getRange('C33').format.numberFormat = '0%';
  assumptions.getRange('C6:C37').format.numberFormat = '#,##0.00';
  assumptions.getRange('C5').format.numberFormat = '0%';
  assumptions.getRange('C11').format.numberFormat = '0.00';
  assumptions.getRange('C15').format.numberFormat = '0%';
  assumptions.getRange('C17:C18').format.numberFormat = '0%';
  assumptions.getRange('C21').format.numberFormat = '0%';
  assumptions.getRange('C33').format.numberFormat = '0%';
  setWidths(assumptions, [16, 38, 16, 54]);
  assumptions.freezePanes.freezeRows(4);

  titleBlock(model, 'NOVA DETAILING · MODEL FINANCIAR 12 LUNI', 'Scenariu de bază: august 2026–iulie 2027. Profitabilitatea lunară apare numai dacă oferta B2B se convertește în clienți recurenți.', 'U');
  const modelHeaders = ['Lună', 'Lucrări retail', 'Piloți B2B', 'Contracte noi', 'Clienți activi', 'Remedieri', 'Venit retail', 'Venit pilot', 'Venit remedieri', 'Venit recurent', 'Venit total', 'Cost variabil', 'Contribuție', 'Cost fix', 'Rezultat operațional', 'Rezultat cumulat', 'Cash final', 'Zile-boxă folosite', 'Capacitate utilizabilă', 'Utilizare max.', 'Check capacitate'];
  model.getRange('A4:U4').values = [modelHeaders];
  styleHeader(model.getRange('A4:U4'));
  const months = [
    new Date(2026, 7, 1), new Date(2026, 8, 1), new Date(2026, 9, 1), new Date(2026, 10, 1),
    new Date(2026, 11, 1), new Date(2027, 0, 1), new Date(2027, 1, 1), new Date(2027, 2, 1),
    new Date(2027, 3, 1), new Date(2027, 4, 1), new Date(2027, 5, 1), new Date(2027, 6, 1)
  ];
  const retailJobs = [8, 9, 9, 10, 9, 10, 10, 11, 11, 12, 12, 12];
  const pilots = [1, 2, 2, 3, 2, 3, 3, 3, 3, 3, 4, 4];
  const newContracts = [0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
  const modelInputs = months.map((month, i) => [month, retailJobs[i], pilots[i], newContracts[i]]);
  model.getRange('A5:D16').values = modelInputs;
  for (let row = 5; row <= 16; row += 1) {
    model.getRange(`E${row}:U${row}`).formulas = [[
      `=SUM($D$5:D${row})`,
      `=ROUND(C${row}*Ipoteze!$C$14*Ipoteze!$C$15,0)`,
      `=B${row}*Ipoteze!$C$9`,
      `=C${row}*Ipoteze!$C$13`,
      `=F${row}*Ipoteze!$C$16`,
      `=E${row}*Ipoteze!$C$20`,
      `=SUM(G${row}:J${row})`,
      `=G${row}*Ipoteze!$C$11+H${row}*Ipoteze!$C$17+I${row}*Ipoteze!$C$18+J${row}*Ipoteze!$C$21`,
      `=K${row}-L${row}`,
      '=Ipoteze!$C$32',
      `=M${row}-N${row}`,
      `=SUM($O$5:O${row})`,
      `=Ipoteze!$C$6+P${row}`,
      `=B${row}*Ipoteze!$C$10+C${row}*Ipoteze!$C$12+F${row}*Ipoteze!$C$19+E${row}*Ipoteze!$C$22`,
      '=Ipoteze!$C$7*Ipoteze!$C$8*Ipoteze!$C$33',
      `=R${row}/(Ipoteze!$C$7*Ipoteze!$C$8)`,
      `=IF(R${row}<=S${row},"PASS","OVER")`
    ]];
  }
  styleBody(model.getRange('A5:U16'));
  model.getRange('A5:D16').format.fill = COLORS.blueInput;
  model.getRange('A5:D16').format.font = { color: COLORS.blueText, bold: true };
  model.getRange('A5:A16').format.numberFormat = 'mmm-yy';
  model.getRange('G5:Q16').format.numberFormat = '#,##0 "lei"';
  model.getRange('R5:S16').format.numberFormat = '0.0';
  model.getRange('T5:T16').format.numberFormat = '0%';
  model.getRange('O5:O16').conditionalFormats.add('cellIs', {
    operator: 'lessThan',
    formula: 0,
    format: { fill: COLORS.redLight, font: { color: COLORS.red } }
  });
  model.getRange('O5:O16').conditionalFormats.add('cellIs', {
    operator: 'greaterThanOrEqual',
    formula: 0,
    format: { fill: COLORS.greenLight, font: { color: COLORS.green, bold: true } }
  });
  addStatusFormatting(model.getRange('U5:U16'));
  setWidths(model, [12, 12, 11, 12, 12, 11, 15, 14, 16, 15, 15, 15, 15, 14, 17, 16, 15, 16, 17, 13, 15]);
  model.freezePanes.freezeRows(4);
  model.freezePanes.freezeColumns(1);

  titleBlock(summary, 'NOVA DETAILING · PLAN REALIST DE PROFITABILITATE', 'Versiune 31 iulie 2026 · model net de TVA · interval: august 2026–iulie 2027', 'N');
  summary.getRange('A4:D4').merge();
  summary.getRange('A4').values = [['Decizia executivă']];
  summary.getRange('A4:D4').format = { fill: COLORS.gold, font: { color: COLORS.ink, bold: true, size: 13 } };
  summary.getRange('A5:D8').merge();
  summary.getRange('A5').values = [['Nova poate ajunge la rezultat operațional lunar pozitiv în jurul lunii 6 numai dacă menține retailul profitabil și transformă piloții B2B în minimum 2 clienți recurenți până în luna 5. Primele 90 de zile sunt despre validare și disciplină comercială, nu despre extindere.']];
  summary.getRange('A5:D8').format = { fill: COLORS.sageLight, font: { color: COLORS.ink, size: 11 }, wrapText: true, verticalAlignment: 'center', borders: { preset: 'outside', style: 'thin', color: COLORS.grid } };
  summary.getRange('A10:B10').values = [['Indicator', 'Scenariu de bază']];
  styleHeader(summary.getRange('A10:B10'));
  const summaryLabels = ['Venit net 12 luni', 'Rezultat operațional 12 luni', 'Cash final', 'Cash minim', 'Prima lună profitabilă', 'Clienți B2B activi la final', 'Utilizare maximă boxe', 'Prag minim cash recomandat', 'Capital suplimentar pentru păstrarea bufferului'];
  summary.getRange('A11:A19').values = summaryLabels.map((x) => [x]);
  summary.getRange('B11:B19').formulas = [
    ['=SUM(\'Model 12L\'!$K$5:$K$16)'],
    ['=SUM(\'Model 12L\'!$O$5:$O$16)'],
    ['=\'Model 12L\'!$Q$16'],
    ['=MIN(\'Model 12L\'!$Q$5:$Q$16)'],
    ['=INDEX(\'Model 12L\'!$A$5:$A$16,MATCH(TRUE,\'Model 12L\'!$O$5:$O$16>0,0))'],
    ['=\'Model 12L\'!$E$16'],
    ['=MAX(\'Model 12L\'!$T$5:$T$16)'],
    ['=Ipoteze!$C$34'],
    ['=MAX(0,Ipoteze!$C$34-MIN(\'Model 12L\'!$Q$5:$Q$16))']
  ];
  styleBody(summary.getRange('A11:B19'));
  summary.getRange('B11:B14').format.numberFormat = '#,##0 "lei"';
  summary.getRange('B15').format.numberFormat = 'mmm-yy';
  summary.getRange('B17').format.numberFormat = '0%';
  summary.getRange('B18:B19').format.numberFormat = '#,##0 "lei"';
  summary.getRange('A21:D21').merge();
  summary.getRange('A21').values = [['Praguri de decizie 30 / 60 / 90 zile']];
  summary.getRange('A21:D21').format = { fill: COLORS.forest, font: { color: COLORS.white, bold: true } };
  summary.getRange('A22:D25').values = [
    ['30 zile', '1 pilot plătit sau 3 oferte active', 'Dacă nu: rescrie ICP + mesaj', 'Nu angaja'],
    ['60 zile', '2 piloți și marjă contribuție ≥55%', 'Dacă nu: reprețuire / scop mai mic', 'Nu investi în echipamente'],
    ['90 zile', '1–2 clienți activi, calendar de retururi', 'Dacă nu: pivot de segment', 'Păstrează retailul'],
    ['180 zile', 'Rezultat lunar pozitiv și cash controlat', 'Dacă nu: reducere cost fix', 'Fără expansiune']
  ];
  styleBody(summary.getRange('A22:D25'));
  summary.getRange('J4:L4').values = [['Lună', 'Venit total', 'Rezultat operațional']];
  summary.getRange('J5:J16').values = [['Aug-26'], ['Sep-26'], ['Oct-26'], ['Nov-26'], ['Dec-26'], ['Ian-27'], ['Feb-27'], ['Mar-27'], ['Apr-27'], ['Mai-27'], ['Iun-27'], ['Iul-27']];
  summary.getRange('K5:K16').formulas = Array.from({ length: 12 }, (_, i) => [`='Model 12L'!K${5 + i}`]);
  summary.getRange('L5:L16').formulas = Array.from({ length: 12 }, (_, i) => [`='Model 12L'!O${5 + i}`]);
  summary.getRange('K5:L16').format.numberFormat = '#,##0';
  const chart = summary.charts.add('line', summary.getRange('J4:L16'));
  chart.setPosition('F4', 'N18');
  chart.title = 'Venit și rezultat operațional lunar';
  chart.hasLegend = true;
  setWidths(summary, [29, 20, 26, 20, 3, 12, 12, 12, 3, 12, 16, 18, 12, 12]);
  summary.freezePanes.freezeRows(2);

  titleBlock(funnel, 'NOVA DETAILING · FUNNEL DE VÂNZĂRI B2B', 'Ținte owner-led pentru primul client: 80–120 atingeri, 5 discovery, 3 piloți ofertați, 1–2 executați.', 'H');
  funnel.getRange('A4:H4').values = [['Etapă', 'Țintă / lună', 'Conversie din etapa anterioară', 'Actual', 'Gap', 'Definiție', 'Owner', 'Acțiune următoare']];
  styleHeader(funnel.getRange('A4:H4'));
  const funnelRows = [
    ['Conturi țintă', 40, 1, null, null, 'Companii cu canal public și rol-țintă', 'Fondator', 'Adaugă 10/săptămână'],
    ['Contacte valide', 80, 2, null, null, 'Minimum 2 roluri/canale per cont', 'Fondator', 'Verifică înainte de trimitere'],
    ['Atingeri', 120, 1.5, null, null, 'Email + apel + follow-up', 'Fondator', '30/săptămână'],
    ['Răspunsuri', 12, 0.10, null, null, 'Orice răspuns uman relevant', 'Fondator', 'Optimizează dacă <5%'],
    ['Discovery', 5, 0.42, null, null, 'Flotă, retur, lessor, decident, termen', 'Fondator', '15–20 minute'],
    ['Piloți ofertați', 3, 0.60, null, null, 'Ofertă scrisă cu dată', 'Fondator', 'Trimite în 2 ore'],
    ['Piloți executați', 2, 0.67, null, null, 'Pilot plătit și raport livrat', 'Atelier', 'SLA 24–48h'],
    ['Contracte cadru', 1, 0.50, null, null, 'Acord semnat + fereastră de lucru', 'Fondator', 'Follow-up decizie']
  ];
  funnel.getRange('A5:H12').values = funnelRows;
  funnel.getRange('E5:E12').formulas = Array.from({ length: 8 }, (_, i) => [`=IF(D${5 + i}="","",D${5 + i}-B${5 + i})`]);
  styleBody(funnel.getRange('A5:H12'));
  funnel.getRange('B5:D12').format.fill = COLORS.blueInput;
  funnel.getRange('B5:D12').format.font = { color: COLORS.blueText };
  funnel.getRange('C5:C12').format.numberFormat = '0%';
  funnel.getRange('E5:E12').format.numberFormat = '0';
  setWidths(funnel, [23, 14, 19, 12, 12, 38, 16, 30]);
  funnel.freezePanes.freezeRows(4);

  titleBlock(prospectSheet, 'NOVA DETAILING · 30 PROSPECȚI B2B CALIFICAȚI', 'Canale publice verificate la 31 iulie 2026. Existența flotei și datele de retur sunt ipoteze de calificat, nu fapte publice.', 'M');
  const prospectHeaders = ['Rang', 'Companie', 'Segment', 'Prioritate', 'Scor', 'Locație', 'Motiv de potrivire', 'Rol-țintă', 'Canal public', 'Sursă oficială', 'Întrebare de calificare', 'Primul pas', 'Status'];
  prospectSheet.getRange('A4:M4').values = [prospectHeaders];
  styleHeader(prospectSheet.getRange('A4:M4'));
  prospectSheet.getRange(`A5:M${4 + prospects.length}`).values = prospects;
  styleBody(prospectSheet.getRange(`A5:M${4 + prospects.length}`));
  prospectSheet.getRange(`D5:E${4 + prospects.length}`).format.horizontalAlignment = 'center';
  prospectSheet.getRange(`E5:E${4 + prospects.length}`).format.numberFormat = '0.0';
  prospectSheet.getRange(`M5:M${4 + prospects.length}`).format.fill = COLORS.blueInput;
  prospectSheet.getRange(`M5:M${4 + prospects.length}`).dataValidation = { rule: { type: 'list', values: ['Necontactat', 'Contactat', 'Răspuns', 'Discovery', 'Ofertă', 'Pilot', 'Client', 'Respins'] } };
  prospectSheet.getRange(`D5:D${4 + prospects.length}`).conditionalFormats.add('containsText', { text: 'A', format: { fill: COLORS.greenLight, font: { color: COLORS.green, bold: true } } });
  prospectSheet.getRange(`D5:D${4 + prospects.length}`).conditionalFormats.add('containsText', { text: 'C', format: { fill: COLORS.amberLight, font: { color: COLORS.amber } } });
  setWidths(prospectSheet, [7, 26, 23, 10, 8, 23, 50, 32, 36, 48, 48, 34, 14]);
  prospectSheet.freezePanes.freezeRows(4);
  prospectSheet.freezePanes.freezeColumns(2);

  titleBlock(daily, 'NOVA DETAILING · PLAN PE 30 DE ZILE LUCRĂTOARE', 'Ordinea este intenționată: ofertă → măsurare → outbound → pilot → raport → contract → gate.', 'G');
  daily.getRange('A4:G4').values = [['Zi', 'Temă', 'Lucru concret', 'Rezultat / KPI', 'Owner', 'Data', 'Status']];
  styleHeader(daily.getRange('A4:G4'));
  daily.getRange('A5:E34').values = dailyPlan.map((r) => r.slice(0, 5));
  daily.getRange('G5:G34').values = dailyPlan.map((r) => [r[5]]);
  const start = new Date(2026, 7, 3);
  const businessDates = [];
  let cursor = new Date(start);
  while (businessDates.length < 30) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) businessDates.push([new Date(cursor)]);
    cursor.setDate(cursor.getDate() + 1);
  }
  daily.getRange('F5:F34').values = businessDates;
  styleBody(daily.getRange('A5:G34'));
  daily.getRange('F5:F34').format.numberFormat = 'dd-mmm';
  daily.getRange('G5:G34').format.fill = COLORS.blueInput;
  daily.getRange('G5:G34').dataValidation = { rule: { type: 'list', values: ['Nu a început', 'În lucru', 'Blocat', 'Finalizat'] } };
  setWidths(daily, [10, 18, 72, 34, 22, 13, 15]);
  daily.freezePanes.freezeRows(4);

  titleBlock(weekly, 'NOVA DETAILING · PLAN 13 SĂPTĂMÂNI', 'Fiecare săptămână se închide vineri cu 30 minute de KPI, cash și următorul experiment.', 'E');
  weekly.getRange('A4:E4').values = [['Săptămâna', 'Focus', 'Livrabil', 'Prag măsurabil', 'Status']];
  styleHeader(weekly.getRange('A4:E4'));
  weekly.getRange('A5:E17').values = weeklyPlan;
  styleBody(weekly.getRange('A5:E17'));
  weekly.getRange('E5:E17').format.fill = COLORS.blueInput;
  weekly.getRange('E5:E17').dataValidation = { rule: { type: 'list', values: ['Nu a început', 'În lucru', 'Blocat', 'Finalizat'] } };
  setWidths(weekly, [13, 28, 54, 42, 16]);
  weekly.freezePanes.freezeRows(4);

  titleBlock(monthly, 'NOVA DETAILING · PLAN 12 LUNI', 'Scalarea este condiționată de marjă, cash și capacitate; școala rămâne opțională până la validarea cererii.', 'E');
  monthly.getRange('A4:E4').values = [['Lună', 'Obiectiv', 'Rezultat obligatoriu', 'KPI / prag', 'Regulă de decizie']];
  styleHeader(monthly.getRange('A4:E4'));
  monthly.getRange('A5:E16').values = monthlyPlan;
  styleBody(monthly.getRange('A5:E16'));
  setWidths(monthly, [12, 23, 52, 42, 45]);
  monthly.freezePanes.freezeRows(4);

  titleBlock(kpi, 'NOVA DETAILING · KPI DE CONDUCERE', 'Completează Actual săptămânal/lunar. Nu urmări doar cifra de afaceri: contribuția, cash-ul și utilizarea decid sănătatea modelului.', 'G');
  kpi.getRange('A4:G4').values = [['KPI', 'Frecvență', 'Țintă', 'Actual', 'Gap', 'Sursă', 'Owner']];
  styleHeader(kpi.getRange('A4:G4'));
  const kpiRows = [
    ['Atingeri outbound', 'săptămânal', 30, null, null, 'CRM', 'Fondator'],
    ['Rată răspuns', 'săptămânal', 0.10, null, null, 'CRM', 'Fondator'],
    ['Discovery', 'lunar', 5, null, null, 'CRM', 'Fondator'],
    ['Piloți ofertați', 'lunar', 3, null, null, 'CRM', 'Fondator'],
    ['Piloți executați', 'lunar', 2, null, null, 'Operațional', 'Atelier'],
    ['Marjă contribuție pilot', 'per pilot', 0.55, null, null, 'Fișă cost', 'Fondator'],
    ['SLA raport în 48h', 'lunar', 0.95, null, null, 'Rapoarte', 'Atelier'],
    ['Rework', 'lunar', 0.05, null, null, 'Jobs', 'Atelier'],
    ['Lei / oră tehnician', 'lunar', 180, null, null, 'Time-study', 'Fondator'],
    ['Utilizare max. boxe', 'lunar', 0.70, null, null, 'Calendar', 'Fondator'],
    ['Cash final', 'lunar', 45000, null, null, 'Bancă + cashflow', 'Fondator'],
    ['Clienți B2B activi', 'lunar', 2, null, null, 'Contracte', 'Fondator']
  ];
  kpi.getRange('A5:G16').values = kpiRows;
  kpi.getRange('E5:E16').formulas = Array.from({ length: 12 }, (_, i) => [`=IF(D${5 + i}="","",D${5 + i}-C${5 + i})`]);
  styleBody(kpi.getRange('A5:G16'));
  kpi.getRange('D5:D16').format.fill = COLORS.blueInput;
  kpi.getRange('C6:C6').format.numberFormat = '0%';
  kpi.getRange('C10:C12').format.numberFormat = '0%';
  kpi.getRange('C14').format.numberFormat = '0%';
  kpi.getRange('D6:D6').format.numberFormat = '0%';
  kpi.getRange('D10:D12').format.numberFormat = '0%';
  kpi.getRange('D14').format.numberFormat = '0%';
  setWidths(kpi, [31, 18, 15, 15, 15, 29, 18]);
  kpi.freezePanes.freezeRows(4);

  titleBlock(checks, 'NOVA DETAILING · VERIFICĂRI MODEL', 'Toate verificările trebuie să fie PASS înainte ca scenariul să fie folosit pentru decizii de angajare sau investiții.', 'D');
  checks.getRange('A4:D4').values = [['Control', 'Rezultat', 'Prag', 'Status']];
  styleHeader(checks.getRange('A4:D4'));
  checks.getRange('A5:C12').values = [
    ['Venitul total = suma fluxurilor', null, 0],
    ['Capacitatea nu este depășită', null, 0],
    ['Cash-ul nu devine negativ', null, 0],
    ['Cash-ul final depășește bufferul', null, 0],
    ['Există o lună profitabilă până în luna 6', null, 6],
    ['Lista de prospectare are 30 companii', null, 30],
    ['Costurile fixe sunt integral incluse', null, 35100],
    ['Rezultat anual operațional pozitiv', null, 0]
  ];
  checks.getRange('B5:B12').formulas = [
    ['=SUM(\'Model 12L\'!K5:K16)-SUM(\'Model 12L\'!G5:J16)'],
    ['=COUNTIF(\'Model 12L\'!U5:U16,"OVER")'],
    ['=MIN(\'Model 12L\'!Q5:Q16)'],
    ['=MIN(\'Model 12L\'!Q5:Q16)-Ipoteze!C34'],
    ['=MATCH(TRUE,\'Model 12L\'!O5:O16>0,0)'],
    ['=COUNTA(\'30 Prospecți\'!B5:B34)'],
    ['=Ipoteze!C32'],
    ['=SUM(\'Model 12L\'!O5:O16)']
  ];
  checks.getRange('D5:D12').formulas = [
    ['=IF(ABS(B5)<=0.01,"PASS","ATENȚIE")'],
    ['=IF(B6=0,"PASS","OVER")'],
    ['=IF(B7>=0,"PASS","ATENȚIE")'],
    ['=IF(B8>=0,"PASS","ATENȚIE")'],
    ['=IF(B9<=C9,"PASS","ATENȚIE")'],
    ['=IF(B10=C10,"PASS","ATENȚIE")'],
    ['=IF(B11=C11,"PASS","ATENȚIE")'],
    ['=IF(B12>C12,"PASS","ATENȚIE")']
  ];
  styleBody(checks.getRange('A5:D12'));
  checks.getRange('B5:C12').format.numberFormat = '#,##0.00';
  addStatusFormatting(checks.getRange('D5:D12'));
  setWidths(checks, [48, 20, 18, 15]);
  checks.freezePanes.freezeRows(4);

  titleBlock(sourceSheet, 'NOVA DETAILING · SURSE ȘI LIMITĂRI', 'Sursele sunt publice și verificate la 31 iulie 2026. Informațiile comerciale despre flotă nu sunt publice și trebuie validate direct.', 'E');
  sourceSheet.getRange('A4:E4').values = [['Categorie', 'Afirmație / utilizare', 'Sursă', 'URL', 'Limitare / acțiune']];
  styleHeader(sourceSheet.getRange('A4:E4'));
  sourceSheet.getRange(`A5:E${4 + sources.length}`).values = sources;
  styleBody(sourceSheet.getRange(`A5:E${4 + sources.length}`));
  setWidths(sourceSheet, [18, 46, 30, 72, 50]);
  sourceSheet.freezePanes.freezeRows(4);

  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  const xlsx = await SpreadsheetFile.exportXlsx(wb);
  await xlsx.save(OUTPUT_FILE);

  for (const sheet of wb.worksheets.items) {
    const preview = await wb.render({
      sheetName: sheet.name,
      autoCrop: 'all',
      scale: 0.85,
      format: 'png'
    });
    const bytes = new Uint8Array(await preview.arrayBuffer());
    const safeName = sheet.name.replace(/[^a-zA-Z0-9_-]+/g, '-');
    await fs.writeFile(path.join(PREVIEW_DIR, `${safeName}.png`), bytes);
  }

  const inspection = await wb.inspect({
    kind: 'sheet,formula',
    maxChars: 12000,
    tableMaxRows: 6,
    tableMaxCols: 8,
    options: { maxResults: 200 }
  });
  await fs.writeFile(path.join(OUTPUT_DIR, 'workbook-inspection.ndjson'), inspection.ndjson || String(inspection), 'utf8');

  return { outputFile: OUTPUT_FILE, previewDir: PREVIEW_DIR };
}

buildWorkbook()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
