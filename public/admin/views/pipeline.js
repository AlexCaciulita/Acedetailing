import {
  state, all, el, esc, api, fmtMoney, fmtDate, isoDate,
  CRM_STAGES, CRM_STAGE_LABEL
} from '../core.js';
import {
  openOpportunity, openOpportunityEditor, opportunityWeightedValue
} from './crm-shared.js';

let showClosed = false;
let priorityFilter = 'toate';
let query = '';

const ACTIVE_STAGES = CRM_STAGES.filter((stage) => !['castigat', 'pierdut', 'nurture'].includes(stage.id));
const CLOSED_STAGES = CRM_STAGES.filter((stage) => ['castigat', 'pierdut', 'nurture'].includes(stage.id));

export function renderPipeline() {
  const wrap = el('<div></div>');
  const stats = state.stats.crm || {};
  const head = el(`
    <div class="head">
      <div>
        <h1>Pipeline B2B</h1>
        <p>${stats.active || 0} oportunități active · ${esc(fmtMoney(stats.weightedValue))} valoare ponderată</p>
      </div>
      <div class="head__act">
        <button class="btn" data-import>Importă lista de 30</button>
        <button class="btn btn--pri" data-add>+ Oportunitate</button>
      </div>
    </div>`);
  head.querySelector('[data-add]').addEventListener('click', () => openOpportunityEditor());
  head.querySelector('[data-import]').addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    try {
      const result = await api.importProspects();
      window.novaToast(`${result.created} adăugate · ${result.skipped} existente.`);
      window.novaReload();
    } catch (error) {
      event.currentTarget.disabled = false;
      window.novaToast(error.message, true);
    }
  });
  wrap.appendChild(head);

  wrap.appendChild(el(`
    <div class="kpis">
      <div class="kpi"><div class="kpi__l">Pipeline activ</div><div class="kpi__v">${stats.active || 0}</div><div class="kpi__s">${esc(fmtMoney(stats.value))} neponderat</div></div>
      <div class="kpi"><div class="kpi__l">Valoare ponderată</div><div class="kpi__v">${esc(fmtMoney(stats.weightedValue))}</div><div class="kpi__s">valoare × probabilitate</div></div>
      <div class="kpi ${stats.overdue ? 'kpi--bad' : 'kpi--good'}"><div class="kpi__l">Follow-up întârziat</div><div class="kpi__v">${stats.overdue || 0}</div><div class="kpi__s">${stats.dueToday || 0} scad astăzi</div></div>
      <div class="kpi ${stats.noNextStep ? 'kpi--warn' : 'kpi--good'}"><div class="kpi__l">Fără next step</div><div class="kpi__v">${stats.noNextStep || 0}</div><div class="kpi__s">trebuie închise sau programate</div></div>
      <div class="kpi"><div class="kpi__l">Win rate</div><div class="kpi__v">${stats.winRate || 0}%</div><div class="kpi__s">${stats.won || 0} câștigate · ${stats.lost || 0} pierdute</div></div>
    </div>`));

  const filters = el(`
    <div class="filters crm-filters">
      <input class="inp" data-query placeholder="Caută companie, contact, segment…" value="${esc(query)}">
      <select class="inp" data-priority>
        <option value="toate">Toate prioritățile</option>
        ${['A', 'B', 'C'].map((priority) => `<option value="${priority}"${priorityFilter === priority ? ' selected' : ''}>Prioritatea ${priority}</option>`).join('')}
      </select>
      <label class="check crm-toggle">
        <input type="checkbox" data-closed${showClosed ? ' checked' : ''}>
        <span>Arată nurture / câștigate / pierdute</span>
      </label>
    </div>`);
  filters.querySelector('[data-query]').addEventListener('input', (event) => {
    query = event.target.value;
    repaint();
  });
  filters.querySelector('[data-priority]').addEventListener('change', (event) => {
    priorityFilter = event.target.value;
    repaint();
  });
  filters.querySelector('[data-closed]').addEventListener('change', (event) => {
    showClosed = event.target.checked;
    repaint();
  });
  wrap.appendChild(filters);

  const needle = query.trim().toLowerCase();
  const opportunities = all('opportunities').filter((opportunity) => {
    if (priorityFilter !== 'toate' && opportunity.priority !== priorityFilter) return false;
    if (!needle) return true;
    return `${opportunity.company} ${opportunity.contactName || ''} ${opportunity.segment || ''} ${opportunity.lessor || ''}`
      .toLowerCase().includes(needle);
  });
  const stages = showClosed ? [...ACTIVE_STAGES, ...CLOSED_STAGES] : ACTIVE_STAGES;
  const board = el('<div class="pipeline-board" aria-label="Pipeline B2B"></div>');

  for (const stage of stages) {
    const items = opportunities
      .filter((opportunity) => opportunity.stage === stage.id)
      .sort((a, b) => {
        const priority = { A: 0, B: 1, C: 2 };
        if (priority[a.priority] !== priority[b.priority]) return (priority[a.priority] ?? 1) - (priority[b.priority] ?? 1);
        return String(a.nextActionDate || '9999').localeCompare(String(b.nextActionDate || '9999'));
      });
    const stageValue = items.reduce((sum, item) => sum + Number(item.estimatedValue || 0), 0);
    const column = el(`
      <section class="pipeline-col" data-stage="${stage.id}">
        <div class="pipeline-col__head">
          <div><b>${esc(stage.label)}</b><span>${items.length}</span></div>
          <small>${esc(fmtMoney(stageValue))}</small>
        </div>
        <div class="pipeline-col__body" data-dropzone></div>
      </section>`);
    const body = column.querySelector('[data-dropzone]');
    body.addEventListener('dragover', (event) => {
      event.preventDefault();
      column.classList.add('is-over');
    });
    body.addEventListener('dragleave', () => column.classList.remove('is-over'));
    body.addEventListener('drop', async (event) => {
      event.preventDefault();
      column.classList.remove('is-over');
      const id = event.dataTransfer.getData('text/opportunity-id');
      const opportunity = all('opportunities').find((item) => item.id === id);
      if (!opportunity || opportunity.stage === stage.id) return;
      try {
        await api.update('opportunities', id, { stage: stage.id, probability: stage.probability });
        window.novaToast(`Mutat în ${stage.label}.`);
        window.novaReload();
      } catch (error) {
        window.novaToast(error.message, true);
      }
    });

    if (!items.length) {
      body.appendChild(el('<div class="pipeline-empty">Nicio oportunitate</div>'));
    }
    for (const opportunity of items) {
      body.appendChild(opportunityCard(opportunity));
    }
    board.appendChild(column);
  }
  wrap.appendChild(board);
  return wrap;
}

function opportunityCard(opportunity) {
  const overdue = opportunity.nextActionDate && opportunity.nextActionDate < isoDate()
    && !['castigat', 'pierdut', 'nurture'].includes(opportunity.stage);
  const card = el(`
    <article class="pipeline-card${overdue ? ' is-overdue' : ''}" draggable="true" tabindex="0">
      <div class="pipeline-card__top">
        <span class="crm-priority crm-priority--${esc(String(opportunity.priority || 'B').toLowerCase())}">${esc(opportunity.priority || 'B')}</span>
        <span class="mono faint">${esc(opportunity.score ?? '—')}</span>
      </div>
      <h3>${esc(opportunity.company)}</h3>
      <p>${esc(opportunity.contactName || opportunity.targetRole || 'Contact neidentificat')}</p>
      <div class="pipeline-card__meta">
        <span>${esc(opportunity.fleetSize || 'Flotă ?')}</span>
        <span>${esc(opportunity.returnWindow || 'Retur ?')}</span>
      </div>
      <div class="pipeline-card__value">
        <b>${esc(fmtMoney(opportunity.estimatedValue))}</b>
        <span>${esc(opportunity.probability || 0)}% · ${esc(fmtMoney(opportunityWeightedValue(opportunity)))}</span>
      </div>
      <div class="pipeline-card__next${overdue ? ' is-overdue' : ''}">
        <span>${esc(opportunity.nextStep || 'Fără next step')}</span>
        <b>${opportunity.nextActionDate ? esc(fmtDate(opportunity.nextActionDate)) : 'Fără dată'}</b>
      </div>
    </article>`);
  card.addEventListener('click', () => openOpportunity(opportunity.id));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openOpportunity(opportunity.id);
    }
  });
  card.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('text/opportunity-id', opportunity.id);
    event.dataTransfer.effectAllowed = 'move';
    card.classList.add('is-dragging');
  });
  card.addEventListener('dragend', () => card.classList.remove('is-dragging'));
  return card;
}

function repaint() {
  const main = document.getElementById('main');
  const hadFocus = document.activeElement?.matches('[data-query]');
  main.innerHTML = '';
  main.appendChild(renderPipeline());
  if (hadFocus) {
    const input = main.querySelector('[data-query]');
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }
}

export { openOpportunity, openOpportunityEditor };
