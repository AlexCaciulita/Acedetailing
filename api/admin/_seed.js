/* Default settings + demo data.

   Demo rows all carry `demo: true` so "Șterge datele demo" can remove exactly
   them and nothing a real user entered. Dates are generated relative to today,
   so the calendar is never empty regardless of when this is first opened. */

import * as store from './_store.js';
import { packages, addons, maintenancePlans, sizeMultipliers } from '../../public/services-data.js';

const pad = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function relDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toISODate(d);
}

export function defaultSettings() {
  return {
    bays: [
      { id: 'bay1', name: 'Boxa 1 — Corecție', active: true },
      { id: 'bay2', name: 'Boxa 2 — Interior', active: true },
      { id: 'bay3', name: 'Priză & uscare', active: true, curing: true }
    ],
    technicians: [
      { id: 'teh1', name: 'Vicențiu C.', initials: 'VC', color: '#2e433b', active: true },
      { id: 'teh2', name: 'Andrei M.', initials: 'AM', color: '#826c3e', active: true },
      { id: 'teh3', name: 'Radu P.', initials: 'RP', color: '#5c6b8a', active: true }
    ],
    // Mirrors public/services-data.js so the dashboard and the site can never
    // disagree on what a package is called or costs.
    services: packages.map((p) => ({
      id: p.id,
      name: p.name,
      priceMin: p.priceRange.min,
      priceMax: p.priceRange.max,
      duration: p.duration,
      days: Number(String(p.duration).match(/\d+/g)?.slice(-1)[0]) || 2
    })),
    addons: addons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
    plans: maintenancePlans.map((p) => ({ id: p.id, name: p.name, min: p.priceRange.min, max: p.priceRange.max })),
    vehicleClasses: Object.entries(sizeMultipliers).map(([id, v]) => ({ id, label: v.label })),
    workDays: [1, 2, 3, 4, 5, 6],
    depositPercent: 30,
    crmTargets: {
      weeklyTouches: 30,
      weeklyNewAccounts: 10,
      monthlyDiscoveries: 5,
      monthlyOffers: 3,
      monthlyPilots: 1,
      minimumContribution: 55,
      firstClientDays: 45
    }
  };
}

const DEMO_CUSTOMERS = [
  { key: 'c1', name: 'Andrei Munteanu', phone: '+40 721 118 204', email: 'andrei.munteanu@example.ro', type: 'persoana', tags: ['abonat'] },
  { key: 'c2', name: 'Elena Predescu', phone: '+40 733 902 551', email: 'elena.predescu@example.ro', type: 'persoana', tags: [] },
  { key: 'c3', name: 'Cristian Dobre', phone: '+40 745 330 118', email: 'cristian.dobre@example.ro', type: 'persoana', tags: ['custodie'] },
  { key: 'c4', name: 'Nordis Fleet SRL', phone: '+40 312 445 900', email: 'flota@nordisfleet.example.ro', type: 'firma', company: 'Nordis Fleet SRL', cui: 'RO12345678', tags: ['b2b', 'leasing'] },
  { key: 'c5', name: 'Maria Șerban', phone: '+40 727 664 018', email: 'maria.serban@example.ro', type: 'persoana', tags: [] }
];

const DEMO_VEHICLES = [
  { key: 'v1', cust: 'c1', make: 'BMW', model: 'Seria 5 530d xDrive', year: 2023, plate: 'B 220 NVA', class: 'mare', color: 'Carbon Black', recordCode: 'NV-7K2M-4Q8P' },
  { key: 'v2', cust: 'c2', make: 'Mercedes-Benz', model: 'GLC 300 4MATIC', year: 2022, plate: 'B 88 ELP', class: 'suv', color: 'Obsidian' },
  { key: 'v3', cust: 'c3', make: 'Porsche', model: '911 Carrera S', year: 2021, plate: 'B 911 CDO', class: 'medie', color: 'GT Silver' },
  { key: 'v4', cust: 'c3', make: 'Range Rover', model: 'Sport P400', year: 2024, plate: 'B 41 CDO', class: 'suv', color: 'Santorini Black' },
  { key: 'v5', cust: 'c4', make: 'Škoda', model: 'Superb 2.0 TDI', year: 2021, plate: 'B 512 NFL', class: 'mare', color: 'Business Grey' },
  { key: 'v6', cust: 'c5', make: 'Audi', model: 'A6 45 TFSI', year: 2022, plate: 'IF 09 MSB', class: 'mare', color: 'Daytona' }
];

export function seedDemo() {
  clearAll();

  if (!Object.keys(store.read('settings')).length) store.write('settings', defaultSettings());
  const cfg = store.read('settings');
  const svc = Object.fromEntries(cfg.services.map((s) => [s.id, s]));

  const custIds = {};
  for (const c of DEMO_CUSTOMERS) {
    const { key, ...rest } = c;
    custIds[key] = store.create('customers', 'cust', { ...rest, demo: true }).id;
  }

  const vehIds = {};
  for (const v of DEMO_VEHICLES) {
    const { key, cust, ...rest } = v;
    vehIds[key] = store.create('vehicles', 'veh', { ...rest, customerId: custIds[cust], demo: true }).id;
  }

  const jobSpecs = [
    { veh: 'v1', cust: 'c1', pkg: 'signature-full',     start: relDate(0),  days: 3, bay: 'bay1', teh: 'teh1', status: 'in_lucru',   deposit: 1800, depositPaid: true },
    { veh: 'v2', cust: 'c2', pkg: 'detailing-interior', start: relDate(0),  days: 2, bay: 'bay2', teh: 'teh3', status: 'in_lucru',   deposit: 660,  depositPaid: true },
    { veh: 'v3', cust: 'c3', pkg: 'corectie-lac',       start: relDate(3),  days: 3, bay: 'bay1', teh: 'teh2', status: 'confirmat',  deposit: 855,  depositPaid: true },
    { veh: 'v6', cust: 'c5', pkg: 'premium-complet',    start: relDate(2),  days: 2, bay: 'bay2', teh: 'teh3', status: 'confirmat',  deposit: 900,  depositPaid: false },
    { veh: 'v5', cust: 'c4', pkg: 'detailing-interior', start: relDate(6),  days: 2, bay: 'bay2', teh: 'teh2', status: 'nou',        deposit: 0,    depositPaid: false, notes: 'Pregătire pentru retur leasing. Fișă de finisaj obligatorie la predare.' },
    { veh: 'v4', cust: 'c3', pkg: 'premium-complet',    start: relDate(-6), days: 2, bay: 'bay1', teh: 'teh1', status: 'livrat',     deposit: 1050, depositPaid: true },
    { veh: 'v1', cust: 'c1', pkg: 'premium-complet',    start: relDate(-20), days: 2, bay: 'bay1', teh: 'teh1', status: 'livrat',    deposit: 900,  depositPaid: true }
  ];

  const CHECKLIST = [
    'Inspecție inițială și fotografii',
    'Măsurare grosime lac',
    'Spălare în doi pași și decontaminare',
    'Corecție / tratament conform pachetului',
    'Aplicare protecție',
    'Control final sub lampă',
    'Fișă de finisaj emisă'
  ];

  for (const spec of jobSpecs) {
    const s = svc[spec.pkg];
    store.create('jobs', 'job', {
      customerId: custIds[spec.cust],
      vehicleId: vehIds[spec.veh],
      packageId: spec.pkg,
      packageName: s.name,
      priceMin: s.priceMin,
      priceMax: s.priceMax,
      addons: [],
      start: spec.start,
      days: spec.days,
      bayId: spec.bay,
      technicianId: spec.teh,
      status: spec.status,
      deposit: spec.deposit,
      depositPaid: spec.depositPaid,
      notes: spec.notes || '',
      checklist: CHECKLIST.map((label, i) => ({
        id: `c${i}`,
        label,
        done: spec.status === 'livrat' || (spec.status === 'in_lucru' && i < 3)
      })),
      source: 'demo',
      demo: true
    });
  }

  const taskSpecs = [
    { title: 'Comandă folie PPF pentru Range Rover', due: relDate(1), priority: 'ridicat', assignee: 'teh1' },
    { title: 'Sună Nordis Fleet pentru contract cadru', due: relDate(2), priority: 'ridicat', assignee: 'teh1' },
    { title: 'Recalibrare aparat grosime lac', due: relDate(-2), priority: 'normal', assignee: 'teh2' },
    { title: 'Pregătește oferta „Armură de iarnă”', due: relDate(14), priority: 'normal', assignee: 'teh1' },
    { title: 'Verificare stoc consumabile ceramică', due: relDate(4), priority: 'scăzut', assignee: 'teh3' }
  ];
  for (const t of taskSpecs) store.create('tasks', 'task', { ...t, done: false, demo: true });

  const inventorySpecs = [
    { name: 'Gtechniq Crystal Serum Ultra', unit: 'set', qty: 3, minQty: 2, costPerUnit: 640 },
    { name: 'Zvizzer Pad-uri polish 150mm', unit: 'buc', qty: 8, minQty: 12, costPerUnit: 38 },
    { name: 'Șampon pH neutru 5L', unit: 'bidon', qty: 2, minQty: 3, costPerUnit: 145 },
    { name: 'Microfibre 40x40', unit: 'buc', qty: 60, minQty: 30, costPerUnit: 12 },
    { name: 'Soluție decontaminare feroasă 5L', unit: 'bidon', qty: 4, minQty: 2, costPerUnit: 190 },
    { name: 'Folie PPF 152cm (rolă)', unit: 'm', qty: 0, minQty: 10, costPerUnit: 210 }
  ];
  for (const i of inventorySpecs) store.create('inventory', 'inv', { ...i, demo: true });

  store.create('bookings', 'bkg', {
    packageName: 'SIGNATURE Full', sizeLabel: 'SUV (BMW X5, Mercedes GLE)',
    conditionLabel: 'Medie (murdarie vizibila, cateva luni)', carModel: 'BMW X5 40d',
    name: 'Tudor Ionescu', phone: '+40 726 550 991', email: 'tudor.ionescu@example.ro',
    date: relDate(9), timeSlot: '09:00', addonNames: ['Curatare compartiment motor'],
    priceText: '5.400 - 7.200 RON', notes: 'Mașina e în garanție, atenție la senzori.',
    status: 'nou', demo: true
  });

  store.create('messages', 'msg', {
    name: 'Bogdan Vasilescu', email: 'bogdan.v@example.ro', phone: '+40 740 221 663',
    subject: 'pret', message: 'Bună ziua, aș dori o ofertă pentru PPF față complet la un Tesla Model 3.',
    read: false, demo: true
  });

  const demoOpportunity = store.create('opportunities', 'opp', {
    company: 'Nordis Fleet SRL',
    contactName: 'Roxana Dima',
    contactRole: 'Office Manager',
    email: 'flota@nordisfleet.example.ro',
    phone: '+40 312 445 900',
    segment: 'Servicii profesionale',
    priority: 'A',
    score: 9,
    location: 'București',
    fleetSize: '11–30 autoturisme',
    leaseReturns: '2–5 autoturisme',
    returnWindow: 'În 31–60 de zile',
    lessor: 'Lessor de confirmat',
    source: 'recomandare',
    stage: 'discovery',
    owner: 'Fondator',
    estimatedValue: 4800,
    probability: 25,
    nextStep: 'Confirmă data celor 3 retururi și trimite oferta pilot.',
    nextActionDate: relDate(2),
    lastActivityAt: new Date().toISOString(),
    lastContactAt: new Date().toISOString(),
    notes: 'Lot pilot posibil la sediul clientului.',
    demo: true
  });

  store.create('activities', 'act', {
    opportunityId: demoOpportunity.id,
    type: 'discovery',
    occurredAt: new Date().toISOString(),
    outcome: 'Există interes pentru pilot; calendarul retururilor se confirmă.',
    notes: 'Decident: Office Manager. Lessor și VIN-uri încă neconfirmate.',
    nextStep: 'Confirmă data celor 3 retururi și trimite oferta pilot.',
    nextActionDate: relDate(2),
    demo: true
  });

  return true;
}

const TRANSACTIONAL = [
  'customers', 'vehicles', 'jobs', 'tasks', 'bookings', 'messages',
  'enrollments', 'inventory', 'opportunities', 'activities'
];

export function clearAll() {
  for (const name of TRANSACTIONAL) store.write(name, {});
}
