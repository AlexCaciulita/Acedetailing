/* Admin API. Mounted at /api/admin/* — every route below is behind guard(),
   except login/session which have to be reachable while logged out. */

import * as store from './_store.js';
import { guard, login, endSession, currentSession, isConfigured } from './_auth.js';
import { seedDemo, clearAll, defaultSettings } from './_seed.js';
import { PROSPECTS, prospectToOpportunity } from './_prospects.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const INTERNAL_PLAN_FILES = {
  'business-complete': 'PLAN-BUSINESS-COMPLET-NOVA-2026.html',
  'operational-b2b': 'ANALIZA-OPERATIONAL-B2B-NOVA.html',
  development: 'PLAN-DEZVOLTARE-NOVA.html'
};

function resolveInternalPlan(filename) {
  return [
    path.resolve(process.cwd(), filename),
    path.resolve(moduleDir, '../..', filename)
  ].find((candidate) => fs.existsSync(candidate));
}

const COLLECTION_PREFIX = {
  customers: 'cust',
  vehicles: 'veh',
  jobs: 'job',
  tasks: 'task',
  bookings: 'bkg',
  messages: 'msg',
  enrollments: 'enr',
  inventory: 'inv',
  opportunities: 'opp',
  activities: 'act'
};

export const JOB_STATUSES = ['nou', 'confirmat', 'in_lucru', 'finalizat', 'livrat', 'anulat'];
const OPEN_STATUSES = ['nou', 'confirmat', 'in_lucru'];
export const CRM_STAGES = [
  'de_calificat', 'contactat', 'discovery', 'calificat', 'oferta',
  'pilot_programat', 'pilot_livrat', 'negociere', 'castigat', 'nurture', 'pierdut'
];
const CLOSED_CRM_STAGES = ['castigat', 'pierdut', 'nurture'];
const TOUCH_TYPES = ['apel', 'email', 'linkedin', 'whatsapp', 'discovery', 'oferta', 'follow_up', 'pilot', 'nota'];
const STAGE_PROBABILITY = {
  de_calificat: 10,
  contactat: 15,
  discovery: 25,
  calificat: 40,
  oferta: 55,
  pilot_programat: 70,
  pilot_livrat: 80,
  negociere: 85,
  castigat: 100,
  nurture: 10,
  pierdut: 0
};

/* ── helpers ──────────────────────────────────────────────────────────────── */

const toISODate = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  return toISODate(date);
}

// Local date, never toISOString() — that shifts to UTC and rolls the day over
// for Romanian users after midnight. Same bug class as the booking min-date.
const today = () => toISODate(new Date());

function settings() {
  const stored = store.read('settings');
  return Object.keys(stored).length ? stored : defaultSettings();
}

/** Every calendar day a job occupies, so overlap checks and utilisation agree. */
function jobDays(job) {
  const span = Math.max(1, Number(job.days) || 1);
  return Array.from({ length: span }, (_, i) => addDays(job.start, i));
}

function midPrice(job) {
  const lo = Number(job.priceMin) || 0;
  const hi = Number(job.priceMax) || lo;
  return lo && hi ? (lo + hi) / 2 : lo || hi;
}

/* ── stats ────────────────────────────────────────────────────────────────── */

function buildCrmStats(now) {
  const opportunities = store.list('opportunities');
  const activities = store.list('activities');
  const active = opportunities.filter((o) => !CLOSED_CRM_STAGES.includes(o.stage));
  const won = opportunities.filter((o) => o.stage === 'castigat');
  const lost = opportunities.filter((o) => o.stage === 'pierdut');

  const currentDate = new Date(`${now}T12:00:00`);
  const dow = (currentDate.getDay() + 6) % 7;
  const weekStart = addDays(now, -dow);
  const month = now.slice(0, 7);
  const sevenDaysAgo = addDays(now, -7);

  const value = active.reduce((sum, o) => sum + (Number(o.estimatedValue) || 0), 0);
  const weightedValue = active.reduce(
    (sum, o) => sum + (Number(o.estimatedValue) || 0) * (Number(o.probability) || 0) / 100,
    0
  );

  const activityDate = (a) => String(a.occurredAt || a.createdAt || '').slice(0, 10);
  const touchesThisWeek = activities.filter((a) =>
    a.type !== 'nota' && activityDate(a) >= weekStart && activityDate(a) <= now
  ).length;
  const discoveriesThisMonth = activities.filter(
    (a) => a.type === 'discovery' && activityDate(a).startsWith(month)
  ).length;
  const offersThisMonth = activities.filter(
    (a) => a.type === 'oferta' && activityDate(a).startsWith(month)
  ).length;
  const pilotsThisMonth = activities.filter(
    (a) => a.type === 'pilot' && activityDate(a).startsWith(month)
  ).length;

  const byStage = Object.fromEntries(
    CRM_STAGES.map((stage) => [stage, opportunities.filter((o) => o.stage === stage).length])
  );

  return {
    total: opportunities.length,
    active: active.length,
    won: won.length,
    lost: lost.length,
    value: Math.round(value),
    weightedValue: Math.round(weightedValue),
    overdue: active.filter((o) => o.nextActionDate && o.nextActionDate < now).length,
    dueToday: active.filter((o) => o.nextActionDate === now).length,
    noNextStep: active.filter((o) => !o.nextStep || !o.nextActionDate).length,
    stale: active.filter((o) => {
      const last = String(o.lastActivityAt || o.createdAt || '').slice(0, 10);
      return last && last < sevenDaysAgo;
    }).length,
    touchesThisWeek,
    newAccountsThisWeek: opportunities.filter(
      (o) => String(o.createdAt || '').slice(0, 10) >= weekStart
    ).length,
    discoveriesThisMonth,
    offersThisMonth,
    pilotsThisMonth,
    winRate: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0,
    byStage
  };
}

function buildStats() {
  const jobs = store.list('jobs');
  const cfg = settings();
  const bayCount = (cfg.bays || []).filter((b) => b.active !== false).length || 1;
  const now = today();

  // Monday-anchored week containing today.
  const dow = (new Date(now).getDay() + 6) % 7;
  const weekStart = addDays(now, -dow);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const workingWeek = week.slice(0, 6);            // L–S, closed Sunday

  const active = jobs.filter((j) => j.status !== 'anulat');

  const occupiedThisWeek = active.reduce((sum, job) => {
    return sum + jobDays(job).filter((d) => workingWeek.includes(d)).length;
  }, 0);
  const weekCapacity = bayCount * workingWeek.length;

  const month = now.slice(0, 7);
  const monthJobs = active.filter((j) => (j.start || '').startsWith(month));
  const monthRevenue = monthJobs.reduce((s, j) => s + midPrice(j), 0);
  const monthBayDays = monthJobs.reduce((s, j) => s + (Number(j.days) || 1), 0);

  const byStatus = Object.fromEntries(
    JOB_STATUSES.map((s) => [s, jobs.filter((j) => j.status === s).length])
  );

  // Yield per package — the number that says which work is worth the bay.
  const byPackage = {};
  for (const job of active) {
    const key = job.packageName || 'Nespecificat';
    const entry = byPackage[key] || (byPackage[key] = { count: 0, revenue: 0, days: 0 });
    entry.count += 1;
    entry.revenue += midPrice(job);
    entry.days += Number(job.days) || 1;
  }
  for (const entry of Object.values(byPackage)) {
    entry.perBayDay = entry.days ? Math.round(entry.revenue / entry.days) : 0;
  }

  const tasks = store.list('tasks');
  const crm = buildCrmStats(now);

  return {
    today: now,
    weekStart,
    jobsToday: active.filter((j) => jobDays(j).includes(now)).length,
    jobsOpen: active.filter((j) => OPEN_STATUSES.includes(j.status)).length,
    utilisation: weekCapacity ? Math.round((occupiedThisWeek / weekCapacity) * 100) : 0,
    occupiedThisWeek,
    weekCapacity,
    monthRevenue: Math.round(monthRevenue),
    monthBayDays,
    revenuePerBayDay: monthBayDays ? Math.round(monthRevenue / monthBayDays) : 0,
    byStatus,
    byPackage,
    newBookings: store.list('bookings').filter((b) => b.status !== 'procesat').length,
    unreadMessages: store.list('messages').filter((m) => !m.read).length,
    openTasks: tasks.filter((t) => !t.done).length,
    overdueTasks: tasks.filter((t) => !t.done && t.due && t.due < now).length,
    lowStock: store.list('inventory').filter((i) => Number(i.qty) <= Number(i.minQty)).length,
    customers: store.list('customers').length,
    vehicles: store.list('vehicles').length,
    activePipeline: crm.active,
    overdueFollowups: crm.overdue,
    crm
  };
}

/** Warns when two jobs claim the same bay on the same day. */
function findConflicts() {
  const seen = new Map();
  const conflicts = [];
  for (const job of store.list('jobs')) {
    if (job.status === 'anulat' || !job.bayId || !job.start) continue;
    for (const day of jobDays(job)) {
      const key = `${job.bayId}|${day}`;
      if (seen.has(key)) conflicts.push({ day, bayId: job.bayId, jobs: [seen.get(key), job.id] });
      else seen.set(key, job.id);
    }
  }
  return conflicts;
}

/* ── handler ──────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  const segments = String(req.adminPath || '').split('/').filter(Boolean);
  const [head, param, action] = segments;
  const method = req.method;

  // --- unauthenticated surface -------------------------------------------
  if (head === 'session' && method === 'GET') {
    return res.status(200).json({
      success: true,
      configured: isConfigured(),
      authenticated: Boolean(currentSession(req))
    });
  }

  if (head === 'login' && method === 'POST') {
    const result = login(req, res, req.body?.password);
    return result.ok
      ? res.status(200).json({ success: true })
      : res.status(result.status).json({ success: false, message: result.message });
  }

  if (head === 'logout' && method === 'POST') {
    endSession(req, res);
    return res.status(200).json({ success: true });
  }

  // --- everything below requires a session --------------------------------
  const denied = guard(req);
  if (denied) return res.status(denied.status).json({ success: false, message: denied.message });

  if (head === 'plans' && param && method === 'GET') {
    const filename = INTERNAL_PLAN_FILES[param];
    const filePath = filename ? resolveInternalPlan(filename) : null;
    if (!filePath) return res.status(404).json({ success: false, message: 'Documentul nu există.' });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    return res.status(200).send(fs.readFileSync(filePath, 'utf8'));
  }

  if (head === 'bootstrap' && method === 'GET') {
    const payload = { settings: settings() };
    for (const name of Object.keys(COLLECTION_PREFIX)) payload[name] = store.read(name);
    return res.status(200).json({
      success: true,
      data: payload,
      stats: buildStats(),
      conflicts: findConflicts()
    });
  }

  if (head === 'stats' && method === 'GET') {
    return res.status(200).json({ success: true, stats: buildStats(), conflicts: findConflicts() });
  }

  if (head === 'settings') {
    if (method === 'GET') return res.status(200).json({ success: true, settings: settings() });
    if (method === 'PUT') {
      return res.status(200).json({ success: true, settings: store.write('settings', req.body || {}) });
    }
  }

  if (head === 'seed' && method === 'POST') {
    seedDemo();
    return res.status(200).json({ success: true, stats: buildStats() });
  }

  if (head === 'clear-demo' && method === 'POST') {
    clearAll();
    return res.status(200).json({ success: true, stats: buildStats() });
  }

  if (head === 'import-prospects' && method === 'POST') {
    const existing = store.list('opportunities');
    const companyKeys = new Set(existing.map((o) => String(o.company || '').trim().toLowerCase()));
    const created = [];
    const skipped = [];

    for (const prospect of PROSPECTS) {
      const key = prospect.company.trim().toLowerCase();
      if (companyKeys.has(key)) {
        skipped.push(prospect.company);
        continue;
      }
      const item = store.create('opportunities', 'opp', prospectToOpportunity(prospect));
      created.push(item);
      companyKeys.add(key);
    }

    return res.status(200).json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      items: created
    });
  }

  if (head === 'messages' && param && action === 'to-opportunity' && method === 'POST') {
    const message = store.get('messages', param);
    if (!message) return res.status(404).json({ success: false, message: 'Mesajul nu există.' });

    const existing = store.list('opportunities').find(
      (o) => o.sourceMessageId === message.id || (
        message.qualification?.company &&
        String(o.company || '').toLowerCase() === String(message.qualification.company).toLowerCase()
      )
    );

    if (existing) {
      store.update('messages', message.id, { read: true, convertedOpportunityId: existing.id });
      return res.status(200).json({ success: true, item: existing, alreadyExisted: true });
    }

    const q = message.qualification || {};
    const within90Days = /30|60|90/.test(String(q.returnWindow || ''));
    const fitFleet = /5–10|11–30/.test(String(q.fleetSize || ''));
    const opportunity = store.create('opportunities', 'opp', {
      company: q.company || message.name || 'Companie nespecificată',
      contactName: q.contactName || '',
      contactRole: q.role || '',
      email: q.email || message.email || '',
      phone: q.phone || message.phone || '',
      fleetSize: q.fleetSize || '',
      leaseReturns: q.leaseReturns || '',
      returnWindow: q.returnWindow || '',
      location: q.location || '',
      lessor: q.lessor || '',
      notes: q.notes || message.message || '',
      priority: fitFleet && within90Days ? 'A' : 'B',
      score: fitFleet && within90Days ? 9 : 7,
      source: 'formular-b2b',
      sourceMessageId: message.id,
      stage: 'de_calificat',
      owner: 'Fondator',
      estimatedValue: 1500,
      probability: STAGE_PROBABILITY.de_calificat,
      nextStep: 'Contactează lead-ul și confirmă lessorul, retururile și aprobatorul.',
      nextActionDate: today()
    });

    store.create('activities', 'act', {
      opportunityId: opportunity.id,
      type: 'nota',
      occurredAt: new Date().toISOString(),
      outcome: 'Lead B2B primit din site',
      notes: message.message || ''
    });
    store.update('messages', message.id, {
      read: true,
      convertedOpportunityId: opportunity.id
    });

    return res.status(201).json({ success: true, item: opportunity });
  }

  if (head === 'opportunities' && param && action === 'to-customer' && method === 'POST') {
    const opportunity = store.get('opportunities', param);
    if (!opportunity) return res.status(404).json({ success: false, message: 'Oportunitatea nu există.' });

    if (opportunity.customerId && store.get('customers', opportunity.customerId)) {
      return res.status(200).json({
        success: true,
        item: store.get('customers', opportunity.customerId),
        opportunity
      });
    }

    const customer = store.create('customers', 'cust', {
      name: opportunity.contactName || opportunity.company,
      company: opportunity.company,
      phone: opportunity.phone || '',
      email: opportunity.email || '',
      type: 'firma',
      tags: ['b2b', 'crm'],
      notes: `Creat din CRM. ${opportunity.notes || ''}`.trim()
    });
    const updated = store.update('opportunities', opportunity.id, {
      customerId: customer.id,
      stage: 'castigat',
      probability: 100,
      wonAt: new Date().toISOString(),
      stageChangedAt: new Date().toISOString()
    });
    store.create('activities', 'act', {
      opportunityId: opportunity.id,
      type: 'nota',
      occurredAt: new Date().toISOString(),
      outcome: 'Convertit în client',
      notes: `Fișă client creată: ${customer.id}`
    });
    return res.status(201).json({ success: true, item: customer, opportunity: updated });
  }

  // --- generic collection CRUD --------------------------------------------
  const prefix = COLLECTION_PREFIX[head];
  if (prefix) {
    if (method === 'GET') {
      return res.status(200).json({ success: true, items: store.read(head) });
    }

    if (method === 'POST') {
      const payload = { ...(req.body || {}) };
      if (head === 'jobs') {
        if (!payload.start) return res.status(400).json({ success: false, message: 'Data de început este obligatorie.' });
        if (!JOB_STATUSES.includes(payload.status)) payload.status = 'nou';
      }
      if (head === 'opportunities') {
        if (!String(payload.company || '').trim()) {
          return res.status(400).json({ success: false, message: 'Compania este obligatorie.' });
        }
        if (!CRM_STAGES.includes(payload.stage)) payload.stage = 'de_calificat';
        payload.probability = Number.isFinite(Number(payload.probability))
          ? Math.min(100, Math.max(0, Number(payload.probability)))
          : STAGE_PROBABILITY[payload.stage];
        payload.estimatedValue = Math.max(0, Number(payload.estimatedValue) || 0);
        payload.stageChangedAt = new Date().toISOString();
      }
      if (head === 'activities') {
        if (!store.get('opportunities', payload.opportunityId)) {
          return res.status(400).json({ success: false, message: 'Alege o oportunitate validă.' });
        }
        if (!TOUCH_TYPES.includes(payload.type)) payload.type = 'nota';
        payload.occurredAt = payload.occurredAt || new Date().toISOString();
        const createTask = payload.createTask === true;
        delete payload.createTask;
        const item = store.create(head, prefix, payload);
        const opportunityPatch = {
          lastActivityAt: payload.occurredAt,
          ...(payload.type !== 'nota' ? { lastContactAt: payload.occurredAt } : {}),
          ...(payload.nextActionDate ? { nextActionDate: payload.nextActionDate } : {}),
          ...(payload.nextStep ? { nextStep: payload.nextStep } : {})
        };
        store.update('opportunities', payload.opportunityId, opportunityPatch);
        if (createTask && payload.nextActionDate && payload.nextStep) {
          store.create('tasks', 'task', {
            title: `${payload.nextStep} — ${store.get('opportunities', payload.opportunityId)?.company || 'CRM'}`,
            due: payload.nextActionDate,
            priority: 'ridicat',
            assignee: null,
            done: false,
            opportunityId: payload.opportunityId,
            source: 'crm'
          });
        }
        return res.status(201).json({ success: true, item });
      }
      return res.status(201).json({ success: true, item: store.create(head, prefix, payload) });
    }

    if (method === 'PATCH' && param) {
      if (head === 'jobs' && req.body?.status && !JOB_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Status invalid.' });
      }
      const patch = { ...(req.body || {}) };
      if (head === 'opportunities') {
        const current = store.get('opportunities', param);
        if (!current) return res.status(404).json({ success: false, message: 'Nu există.' });
        if (patch.stage && !CRM_STAGES.includes(patch.stage)) {
          return res.status(400).json({ success: false, message: 'Etapă CRM invalidă.' });
        }
        if (patch.stage && patch.stage !== current.stage) {
          patch.stageChangedAt = new Date().toISOString();
          if (patch.probability === undefined) patch.probability = STAGE_PROBABILITY[patch.stage];
          if (patch.stage === 'castigat') patch.wonAt = new Date().toISOString();
          if (patch.stage === 'pierdut') patch.lostAt = new Date().toISOString();
        }
        if (patch.probability !== undefined) {
          patch.probability = Math.min(100, Math.max(0, Number(patch.probability) || 0));
        }
        if (patch.estimatedValue !== undefined) {
          patch.estimatedValue = Math.max(0, Number(patch.estimatedValue) || 0);
        }
      }
      const item = store.update(head, param, patch);
      return item
        ? res.status(200).json({ success: true, item })
        : res.status(404).json({ success: false, message: 'Nu există.' });
    }

    if (method === 'DELETE' && param) {
      if (head === 'opportunities') {
        for (const activity of store.list('activities').filter((a) => a.opportunityId === param)) {
          store.remove('activities', activity.id);
        }
      }
      return store.remove(head, param)
        ? res.status(200).json({ success: true })
        : res.status(404).json({ success: false, message: 'Nu există.' });
    }
  }

  return res.status(404).json({ success: false, message: 'Rută necunoscută.' });
}
