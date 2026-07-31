/* Shared plumbing: API client, in-memory state, formatting, tiny DOM helpers. */

export const state = {
  authed: false,
  configured: true,
  data: {},
  stats: {},
  conflicts: [],
  route: 'overview'
};

/* ── api ──────────────────────────────────────────────────────────────────── */

async function request(path, options = {}) {
  const res = await fetch(`/api/admin/${path}`, {
    credentials: 'same-origin',
    headers: options.body ? { 'Content-Type': 'application/json' } : {},
    ...options
  });

  let payload = {};
  try { payload = await res.json(); } catch { /* empty body is fine */ }

  if (res.status === 401) {
    state.authed = false;
    window.dispatchEvent(new CustomEvent('nova:unauthorised'));
  }
  if (!res.ok) throw new Error(payload.message || `Eroare ${res.status}`);
  return payload;
}

export const api = {
  session: () => request('session'),
  login: (password) => request('login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request('logout', { method: 'POST' }),
  bootstrap: () => request('bootstrap'),
  stats: () => request('stats'),
  create: (col, item) => request(col, { method: 'POST', body: JSON.stringify(item) }),
  update: (col, id, patch) => request(`${col}/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: (col, id) => request(`${col}/${id}`, { method: 'DELETE' }),
  importProspects: () => request('import-prospects', { method: 'POST' }),
  messageToOpportunity: (id) => request(`messages/${id}/to-opportunity`, { method: 'POST' }),
  opportunityToCustomer: (id) => request(`opportunities/${id}/to-customer`, { method: 'POST' }),
  saveSettings: (s) => request('settings', { method: 'PUT', body: JSON.stringify(s) }),
  seed: () => request('seed', { method: 'POST' }),
  clearDemo: () => request('clear-demo', { method: 'POST' })
};

export async function refresh() {
  const res = await api.bootstrap();
  state.data = res.data;
  state.stats = res.stats;
  state.conflicts = res.conflicts || [];
  return res;
}

/* ── collections ──────────────────────────────────────────────────────────── */

export const all = (col) => Object.values(state.data[col] || {});
export const byId = (col, id) => (state.data[col] || {})[id] || null;

export function customerName(id) {
  return byId('customers', id)?.name || '—';
}

export function vehicleLabel(id) {
  const v = byId('vehicles', id);
  if (!v) return '—';
  return `${v.make} ${v.model}${v.plate ? ` · ${v.plate}` : ''}`;
}

export function technicianName(id) {
  return (state.data.settings?.technicians || []).find((t) => t.id === id)?.name || '—';
}

export function bayName(id) {
  return (state.data.settings?.bays || []).find((b) => b.id === id)?.name || '—';
}

/* ── dates ────────────────────────────────────────────────────────────────── */

const pad = (n) => String(n).padStart(2, '0');

// Always local parts. toISOString() would roll the date back for RO users after
// midnight — the same bug that was in the booking form's min-date.
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDate(new Date(y, m - 1, d + n));
}

export function mondayOf(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return addDays(iso, -((date.getDay() + 6) % 7));
}

const RO_DAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
const RO_MONTHS = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function dayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return { name: RO_DAYS[(date.getDay() + 6) % 7], num: `${d} ${RO_MONTHS[m - 1]}` };
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y) return String(iso);
  return `${d} ${RO_MONTHS[m - 1]} ${y}`;
}

export const fmtMoney = (n) => `${new Intl.NumberFormat('ro-RO').format(Math.round(Number(n) || 0))} lei`;

export function jobDays(job) {
  const span = Math.max(1, Number(job.days) || 1);
  return Array.from({ length: span }, (_, i) => addDays(job.start, i));
}

export function jobPriceMid(job) {
  const lo = Number(job.priceMin) || 0;
  const hi = Number(job.priceMax) || lo;
  return lo && hi ? (lo + hi) / 2 : lo || hi;
}

export const STATUS_LABEL = {
  nou: 'Nou', confirmat: 'Confirmat', in_lucru: 'În lucru',
  finalizat: 'Finalizat', livrat: 'Livrat', anulat: 'Anulat'
};

export const CRM_STAGES = [
  { id: 'de_calificat', label: 'De calificat', probability: 10 },
  { id: 'contactat', label: 'Contactat', probability: 15 },
  { id: 'discovery', label: 'Discovery', probability: 25 },
  { id: 'calificat', label: 'Calificat', probability: 40 },
  { id: 'oferta', label: 'Ofertă', probability: 55 },
  { id: 'pilot_programat', label: 'Pilot programat', probability: 70 },
  { id: 'pilot_livrat', label: 'Pilot livrat', probability: 80 },
  { id: 'negociere', label: 'Negociere', probability: 85 },
  { id: 'castigat', label: 'Câștigat', probability: 100 },
  { id: 'nurture', label: 'Nurture', probability: 10 },
  { id: 'pierdut', label: 'Pierdut', probability: 0 }
];

export const CRM_STAGE_LABEL = Object.fromEntries(CRM_STAGES.map((stage) => [stage.id, stage.label]));

export const CRM_ACTIVITY_TYPES = [
  { id: 'apel', label: 'Apel' },
  { id: 'email', label: 'Email' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'oferta', label: 'Ofertă' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'pilot', label: 'Pilot' },
  { id: 'nota', label: 'Notă' }
];

export const CRM_ACTIVITY_LABEL = Object.fromEntries(CRM_ACTIVITY_TYPES.map((type) => [type.id, type.label]));

/* ── dom ──────────────────────────────────────────────────────────────────── */

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// Everything user-entered goes through this before reaching innerHTML.
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer = null;
export function toast(message, isError = false) {
  document.querySelector('.toast')?.remove();
  const node = el(`<div class="toast${isError ? ' toast--err' : ''}">${esc(message)}</div>`);
  document.body.appendChild(node);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.remove(), 3200);
}

export function closeDrawer() {
  document.querySelector('.drawer')?.remove();
  document.querySelector('.scrim')?.remove();
}

export function openDrawer(node) {
  closeDrawer();
  const scrim = el('<div class="scrim"></div>');
  scrim.addEventListener('click', closeDrawer);
  document.body.append(scrim, node);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDrawer();
});
