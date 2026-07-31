/* Entry point: session gate, shell, hash router. */

import { state, api, refresh, el, esc, toast } from './core.js';
import { renderOverview } from './views/overview.js';
import { renderCalendar } from './views/calendar.js';
import { renderJobs } from './views/jobs.js';
import { renderBookings } from './views/bookings.js';
import { renderCustomers } from './views/customers.js';
import { renderTasks } from './views/tasks.js';
import { renderMessages } from './views/messages.js';
import { renderInventory } from './views/inventory.js';
import { renderAnalytics } from './views/analytics.js';
import { renderSettings } from './views/settings.js';
import { renderPipeline } from './views/pipeline.js';
import { renderCrm } from './views/crm.js';
import { renderPlans } from './views/plans.js';

const app = document.getElementById('app');

const ROUTES = [
  { group: 'Operațiuni' },
  { id: 'overview',  label: 'Sumar',      icon: '◆', render: renderOverview },
  { id: 'calendar',  label: 'Calendar',   icon: '▤', render: renderCalendar },
  { id: 'jobs',      label: 'Lucrări',    icon: '⬢', render: renderJobs },
  { id: 'tasks',     label: 'Sarcini',    icon: '✓', render: renderTasks, badge: 'overdueTasks', danger: true },
  { group: 'Intrări' },
  { id: 'bookings',  label: 'Rezervări',  icon: '⇩', render: renderBookings, badge: 'newBookings' },
  { id: 'messages',  label: 'Mesaje',     icon: '✉', render: renderMessages, badge: 'unreadMessages' },
  { group: 'Vânzări B2B' },
  { id: 'pipeline',  label: 'Pipeline',   icon: '▥', render: renderPipeline, badge: 'activePipeline' },
  { id: 'crm',       label: 'CRM',        icon: '◎', render: renderCrm, badge: 'overdueFollowups', danger: true },
  { group: 'Business' },
  { id: 'customers', label: 'Clienți',    icon: '☺', render: renderCustomers },
  { id: 'inventory', label: 'Stocuri',    icon: '▦', render: renderInventory, badge: 'lowStock', danger: true },
  { id: 'analytics', label: 'Analiză',    icon: '◱', render: renderAnalytics },
  { id: 'plans',     label: 'Planuri',     icon: '▣', render: renderPlans },
  { group: 'Sistem' },
  { id: 'settings',  label: 'Setări',     icon: '⚙', render: renderSettings }
];

const views = ROUTES.filter((r) => r.id);

/* ── login ────────────────────────────────────────────────────────────────── */

function renderLogin(message) {
  app.className = '';
  app.innerHTML = '';

  const box = el(`
    <div class="login"><div class="login__box">
      <div class="login__mark">Nova Detailing</div>
      <h1>Panou de administrare</h1>
      <p>Acces restricționat. Datele clienților sunt confidențiale.</p>
      <form>
        <label for="pw">Parolă</label>
        <input id="pw" class="inp" type="password" autocomplete="current-password" required autofocus>
        <button class="btn--pri" type="submit">Autentificare</button>
      </form>
      ${message ? `<div class="login__err">${esc(message)}</div>` : ''}
      ${state.configured ? '' : `
        <div class="login__hint">
          Serverul nu are încă o parolă configurată.<br>
          Rulează <b>node scripts/admin-password.js</b>, pune valoarea în .env și repornește.
        </div>`}
    </div></div>`);

  const form = box.querySelector('form');
  const input = box.querySelector('#pw');
  const button = box.querySelector('button');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    button.disabled = true;
    button.textContent = 'Se verifică…';
    try {
      await api.login(input.value);
      state.authed = true;
      await boot();
    } catch (err) {
      renderLogin(err.message);
    }
  });

  app.appendChild(box);
}

/* ── shell ────────────────────────────────────────────────────────────────── */

function renderShell() {
  app.className = '';
  app.innerHTML = '';

  const side = el('<aside class="side"><div class="side__brand">Nova · Panou</div></aside>');

  for (const entry of ROUTES) {
    if (entry.group) {
      side.appendChild(el(`<div class="side__group">${esc(entry.group)}</div>`));
      continue;
    }
    const count = entry.badge ? Number(state.stats[entry.badge]) || 0 : 0;
    const button = el(`
      <button class="nav" data-route="${entry.id}">
        <span class="nav__ico">${entry.icon}</span>
        <span>${esc(entry.label)}</span>
        ${count ? `<span class="nav__badge${entry.danger ? ' nav__badge--red' : ''}">${count}</span>` : ''}
      </button>`);
    button.addEventListener('click', () => { location.hash = entry.id; });
    side.appendChild(button);
  }

  const foot = el('<div class="side__foot"><button class="nav" type="button"><span class="nav__ico">⏻</span><span>Ieșire</span></button></div>');
  foot.querySelector('button').addEventListener('click', async () => {
    await api.logout();
    state.authed = false;
    renderLogin();
  });
  side.appendChild(foot);

  const main = el('<main class="main" id="main"></main>');
  app.appendChild(el('<div class="shell"></div>'));
  app.firstElementChild.append(side, main);
}

function paint() {
  const id = (location.hash || '#overview').slice(1) || 'overview';
  const view = views.find((v) => v.id === id) || views[0];
  state.route = view.id;

  document.querySelectorAll('.nav[data-route]').forEach((n) =>
    n.classList.toggle('is-on', n.dataset.route === view.id));

  const main = document.getElementById('main');
  if (!main) return;
  main.innerHTML = '';
  try {
    main.appendChild(view.render());
  } catch (err) {
    console.error(err);
    main.appendChild(el(`<div class="panel"><p class="muted">Eroare la randarea secțiunii: ${esc(err.message)}</p></div>`));
  }
  main.scrollTop = 0;
}

/** Re-fetch everything, then repaint — used after any mutation. */
export async function reload() {
  await refresh();
  renderShell();
  paint();
}

async function boot() {
  try {
    await refresh();
  } catch (err) {
    return renderLogin(err.message);
  }
  renderShell();
  paint();
}

window.addEventListener('hashchange', paint);
window.addEventListener('nova:unauthorised', () => {
  if (state.authed) {
    state.authed = false;
    renderLogin('Sesiune expirată. Autentifică-te din nou.');
  }
});

(async function start() {
  try {
    const session = await api.session();
    state.configured = session.configured;
    state.authed = session.authenticated;
  } catch {
    return renderLogin('Serverul nu răspunde.');
  }
  state.authed ? boot() : renderLogin();
})();

// Views mutate then call reload(); exposing it avoids threading a callback
// through every view module.
window.novaReload = reload;
window.novaToast = toast;
