import {
  state, all, byId, el, esc, fmtDate, fmtMoney, isoDate,
  CRM_STAGES, CRM_STAGE_LABEL, CRM_ACTIVITY_LABEL
} from '../core.js';
import {
  openOpportunity, openOpportunityEditor, opportunityActivities, opportunityWeightedValue
} from './crm-shared.js';

let query = '';
let stageFilter = 'toate';
let priorityFilter = 'toate';
let followupFilter = 'toate';

export function renderCrm() {
  const wrap = el('<div></div>');
  const stats = state.stats.crm || {};
  const targets = state.data.settings?.crmTargets || {
    weeklyTouches: 30, weeklyNewAccounts: 10, monthlyDiscoveries: 5, monthlyOffers: 3, monthlyPilots: 1
  };

  const head = el(`
    <div class="head">
      <div>
        <h1>CRM B2B</h1>
        <p>Conturi, contacte, calificare, activități și follow-up într-un singur loc.</p>
      </div>
      <div class="head__act"><button class="btn btn--pri" data-add>+ Cont B2B</button></div>
    </div>`);
  head.querySelector('[data-add]').addEventListener('click', () => openOpportunityEditor());
  wrap.appendChild(head);

  wrap.appendChild(targetKpis(stats, targets));

  if (stats.overdue || stats.noNextStep || stats.stale) {
    wrap.appendChild(el(`
      <div class="crm-alerts">
        ${stats.overdue ? `<button data-filter="overdue"><b>${stats.overdue}</b><span>follow-up întârziat</span></button>` : ''}
        ${stats.noNextStep ? `<button data-filter="missing"><b>${stats.noNextStep}</b><span>fără next step</span></button>` : ''}
        ${stats.stale ? `<button data-filter="stale"><b>${stats.stale}</b><span>fără activitate de 7+ zile</span></button>` : ''}
      </div>`));
    wrap.querySelectorAll('.crm-alerts button').forEach((button) => {
      button.addEventListener('click', () => {
        followupFilter = button.dataset.filter;
        repaint();
      });
    });
  }

  const filters = el(`
    <div class="filters crm-filters">
      <input class="inp" data-query placeholder="Companie, contact, email, lessor…" value="${esc(query)}">
      <select class="inp" data-stage>
        <option value="toate">Toate etapele</option>
        ${CRM_STAGES.map((stage) => `<option value="${stage.id}"${stageFilter === stage.id ? ' selected' : ''}>${esc(stage.label)}</option>`).join('')}
      </select>
      <select class="inp" data-priority>
        <option value="toate">Toate prioritățile</option>
        ${['A', 'B', 'C'].map((priority) => `<option value="${priority}"${priorityFilter === priority ? ' selected' : ''}>Prioritate ${priority}</option>`).join('')}
      </select>
      <select class="inp" data-followup>
        <option value="toate">Orice follow-up</option>
        <option value="today"${followupFilter === 'today' ? ' selected' : ''}>Scad astăzi</option>
        <option value="overdue"${followupFilter === 'overdue' ? ' selected' : ''}>Întârziate</option>
        <option value="missing"${followupFilter === 'missing' ? ' selected' : ''}>Fără next step</option>
        <option value="stale"${followupFilter === 'stale' ? ' selected' : ''}>Inactive 7+ zile</option>
      </select>
    </div>`);
  filters.querySelector('[data-query]').addEventListener('input', (event) => {
    query = event.target.value;
    repaint();
  });
  filters.querySelector('[data-stage]').addEventListener('change', (event) => {
    stageFilter = event.target.value;
    repaint();
  });
  filters.querySelector('[data-priority]').addEventListener('change', (event) => {
    priorityFilter = event.target.value;
    repaint();
  });
  filters.querySelector('[data-followup]').addEventListener('change', (event) => {
    followupFilter = event.target.value;
    repaint();
  });
  wrap.appendChild(filters);

  const opportunities = filterOpportunities();
  const accounts = el(`<div class="panel"><div class="panel__t">Conturi <span class="faint mono">${opportunities.length}</span></div></div>`);
  if (!opportunities.length) {
    accounts.appendChild(el('<div class="empty">Niciun cont nu corespunde filtrelor.</div>'));
  } else {
    const tableWrap = el('<div class="table-scroll"></div>');
    const table = el(`<table><thead><tr>
      <th>Companie / contact</th><th>Calificare</th><th>Etapă</th>
      <th>Următorul pas</th><th class="num">Valoare</th><th class="num">Ponderat</th>
    </tr></thead><tbody></tbody></table>`);
    for (const opportunity of opportunities) {
      const overdue = opportunity.nextActionDate && opportunity.nextActionDate < isoDate()
        && !['castigat', 'pierdut', 'nurture'].includes(opportunity.stage);
      const row = el(`<tr class="clickable">
        <td><b>${esc(opportunity.company)}</b>
          <div class="faint">${esc(opportunity.contactName || opportunity.targetRole || 'Contact neidentificat')}</div>
          <div class="mono faint">${esc(opportunity.email || opportunity.phone || opportunity.contactChannel || '')}</div>
        </td>
        <td><span class="crm-priority crm-priority--${esc(String(opportunity.priority || 'B').toLowerCase())}">${esc(opportunity.priority || 'B')}</span>
          <span class="muted">${esc(opportunity.fleetSize || 'Flotă ?')} · ${esc(opportunity.returnWindow || 'Retur ?')}</span>
        </td>
        <td><span class="tag crm-stage crm-stage--${esc(opportunity.stage)}">${esc(CRM_STAGE_LABEL[opportunity.stage] || opportunity.stage)}</span></td>
        <td class="${overdue ? 'crm-overdue-text' : ''}">${esc(opportunity.nextStep || 'Fără next step')}
          <div class="mono faint">${opportunity.nextActionDate ? esc(fmtDate(opportunity.nextActionDate)) : 'Fără dată'}</div>
        </td>
        <td class="num mono">${esc(fmtMoney(opportunity.estimatedValue))}<div class="faint">${esc(opportunity.probability || 0)}%</div></td>
        <td class="num mono">${esc(fmtMoney(opportunityWeightedValue(opportunity)))}</td>
      </tr>`);
      row.addEventListener('click', () => openOpportunity(opportunity.id));
      table.querySelector('tbody').appendChild(row);
    }
    tableWrap.appendChild(table);
    accounts.appendChild(tableWrap);
  }
  wrap.appendChild(accounts);

  const lower = el('<div class="crm-lower"></div>');
  lower.appendChild(activityPanel());
  lower.appendChild(playbookPanel());
  wrap.appendChild(lower);
  return wrap;
}

function targetKpis(stats, targets) {
  const metrics = [
    ['Atingeri săptămâna asta', stats.touchesThisWeek || 0, targets.weeklyTouches || 30, 'email, apel, LinkedIn, follow-up'],
    ['Conturi noi săptămâna asta', stats.newAccountsThisWeek || 0, targets.weeklyNewAccounts || 10, 'țintă de listă și research'],
    ['Discovery luna asta', stats.discoveriesThisMonth || 0, targets.monthlyDiscoveries || 5, 'calificare reală'],
    ['Oferte luna asta', stats.offersThisMonth || 0, targets.monthlyOffers || 3, 'trimise după discovery'],
    ['Piloți luna asta', stats.pilotsThisMonth || 0, targets.monthlyPilots || 1, 'pilot plătit / programat']
  ];
  const host = el('<div class="kpis crm-targets"></div>');
  for (const [label, value, target, note] of metrics) {
    const pct = Math.min(100, Math.round((value / Math.max(1, target)) * 100));
    const tone = pct >= 100 ? 'good' : pct >= 60 ? 'warn' : '';
    host.appendChild(el(`
      <div class="kpi ${tone ? `kpi--${tone}` : ''}">
        <div class="kpi__l">${esc(label)}</div>
        <div class="kpi__v">${esc(value)} <span class="crm-target-denom">/ ${esc(target)}</span></div>
        <div class="kpi__s">${esc(note)}</div>
        <div class="bar"><div class="bar__f ${tone ? `bar__f--${tone}` : ''}" style="width:${pct}%"></div></div>
      </div>`));
  }
  return host;
}

function filterOpportunities() {
  const today = isoDate();
  const staleLimit = new Date();
  staleLimit.setDate(staleLimit.getDate() - 7);
  const staleIso = isoDate(staleLimit);
  const needle = query.trim().toLowerCase();

  return all('opportunities')
    .filter((opportunity) => {
      const isClosed = ['castigat', 'pierdut', 'nurture'].includes(opportunity.stage);
      if (stageFilter !== 'toate' && opportunity.stage !== stageFilter) return false;
      if (priorityFilter !== 'toate' && opportunity.priority !== priorityFilter) return false;
      if (needle && !`${opportunity.company} ${opportunity.contactName || ''} ${opportunity.email || ''} ${opportunity.phone || ''} ${opportunity.lessor || ''} ${opportunity.segment || ''}`.toLowerCase().includes(needle)) return false;
      if (followupFilter === 'today' && (isClosed || opportunity.nextActionDate !== today)) return false;
      if (followupFilter === 'overdue' && !(opportunity.nextActionDate && opportunity.nextActionDate < today && !isClosed)) return false;
      if (followupFilter === 'missing' && (isClosed || (opportunity.nextStep && opportunity.nextActionDate))) return false;
      if (followupFilter === 'stale') {
        const last = String(opportunity.lastActivityAt || opportunity.createdAt || '').slice(0, 10);
        if (!last || last >= staleIso || isClosed) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const priority = { A: 0, B: 1, C: 2 };
      const overdueA = a.nextActionDate && a.nextActionDate < today ? 0 : 1;
      const overdueB = b.nextActionDate && b.nextActionDate < today ? 0 : 1;
      if (overdueA !== overdueB) return overdueA - overdueB;
      if (priority[a.priority] !== priority[b.priority]) return (priority[a.priority] ?? 1) - (priority[b.priority] ?? 1);
      return String(a.nextActionDate || '9999').localeCompare(String(b.nextActionDate || '9999'));
    });
}

function activityPanel() {
  const activities = all('activities')
    .sort((a, b) => String(b.occurredAt || b.createdAt || '').localeCompare(String(a.occurredAt || a.createdAt || '')))
    .slice(0, 16);
  const panel = el('<div class="panel"><div class="panel__t">Activitate recentă</div></div>');
  if (!activities.length) {
    panel.appendChild(el('<div class="empty">Activitățile înregistrate apar aici.</div>'));
    return panel;
  }
  for (const activity of activities) {
    const opportunity = byId('opportunities', activity.opportunityId);
    const row = el(`
      <button class="crm-feed">
        <span class="crm-feed__type">${esc(CRM_ACTIVITY_LABEL[activity.type] || activity.type)}</span>
        <span><b>${esc(opportunity?.company || 'Oportunitate ștearsă')}</b>${activity.outcome ? ` · ${esc(activity.outcome)}` : ''}</span>
        <small>${esc(fmtDate(activity.occurredAt || activity.createdAt))}</small>
      </button>`);
    if (opportunity) row.addEventListener('click', () => openOpportunity(opportunity.id));
    panel.appendChild(row);
  }
  return panel;
}

function playbookPanel() {
  return el(`
    <div class="panel">
      <div class="panel__t">Cadenta fondatorului</div>
      <div class="crm-playbook">
        <div><b>Luni</b><span>10 conturi noi + curățare pipeline</span></div>
        <div><b>Marți</b><span>10–15 atingeri outbound</span></div>
        <div><b>Miercuri</b><span>Discovery și piloți</span></div>
        <div><b>Joi</b><span>Follow-up, ofertare și închidere</span></div>
        <div><b>Vineri</b><span>KPI, cash, marjă și un experiment</span></div>
      </div>
      <div class="crm-gate">
        <b>Gate 30 zile</b>
        <span>1 pilot plătit sau 3 oferte active. În lipsă: schimbă ICP-ul ori mesajul, fără angajări și fără capex.</span>
      </div>
    </div>`);
}

function repaint() {
  const main = document.getElementById('main');
  const hadFocus = document.activeElement?.matches('[data-query]');
  main.innerHTML = '';
  main.appendChild(renderCrm());
  if (hadFocus) {
    const input = main.querySelector('[data-query]');
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }
}
