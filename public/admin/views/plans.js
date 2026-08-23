import { el, esc } from '../core.js';

const PLANS = [
  {
    id: 'business-complete',
    title: 'Plan de business complet 2026–2027',
    eyebrow: 'Document principal',
    description: 'Strategie, ofertă B2B, 30 de prospecți, model financiar și execuție pe 30 zile / 13 săptămâni / 12 luni.',
    url: '/api/admin/plans/business-complete',
    accent: 'green'
  },
  {
    id: 'operational-b2b',
    title: 'Analiză operațională și B2B',
    eyebrow: 'Audit și playbook',
    description: 'Capacitate, ofertă, kit comercial, contractare, Pipeline, CRM și procesul până la prima semnătură.',
    url: '/api/admin/plans/operational-b2b',
    accent: 'bronze'
  },
  {
    id: 'development',
    title: 'Plan de dezvoltare Nova',
    eyebrow: 'Direcție strategică',
    description: 'Poziționare premium, servicii, PPF, B2B, școală și ordinea de implementare a inițiativelor.',
    url: '/api/admin/plans/development',
    accent: 'blue'
  }
];

const STORAGE_KEY = 'nova_admin_selected_plan';

export function renderPlans() {
  const wrap = el('<div class="plans"></div>');
  wrap.appendChild(el(`
    <div class="head"><div>
      <h1>Planuri</h1>
      <p>Biblioteca strategică Nova — documentele se deschid direct în panoul de administrare.</p>
    </div></div>`));

  const tabs = el('<div class="plans-tabs" role="tablist" aria-label="Planuri disponibile"></div>');
  const viewer = el(`
    <section class="plans-viewer panel">
      <div class="plans-viewer__bar">
        <div>
          <span class="plans-viewer__eyebrow"></span>
          <h2 class="plans-viewer__title"></h2>
          <p class="plans-viewer__desc"></p>
        </div>
        <div class="plans-viewer__actions">
          <button class="btn btn--ghost" type="button" data-refresh>Reîncarcă</button>
          <button class="btn btn--ghost" type="button" data-focus>Mod focus</button>
          <a class="btn btn--pri" data-open target="_blank" rel="noopener">Deschide separat ↗</a>
        </div>
      </div>
      <div class="plans-frame-wrap" data-frame-wrap>
        <div class="plans-frame__loading" data-loading>Se încarcă documentul…</div>
        <iframe class="plans-frame" data-frame title="Plan Nova Detailing"></iframe>
      </div>
    </section>`);

  const frame = viewer.querySelector('[data-frame]');
  const loading = viewer.querySelector('[data-loading]');
  const openLink = viewer.querySelector('[data-open]');
  const title = viewer.querySelector('.plans-viewer__title');
  const eyebrow = viewer.querySelector('.plans-viewer__eyebrow');
  const description = viewer.querySelector('.plans-viewer__desc');
  let active = null;

  function selectPlan(id) {
    const plan = PLANS.find((item) => item.id === id) || PLANS[0];
    active = plan;
    localStorage.setItem(STORAGE_KEY, plan.id);

    tabs.querySelectorAll('[role="tab"]').forEach((button) => {
      const selected = button.dataset.plan === plan.id;
      button.classList.toggle('is-on', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });

    eyebrow.textContent = plan.eyebrow;
    title.textContent = plan.title;
    description.textContent = plan.description;
    openLink.href = plan.url;
    frame.title = plan.title;
    loading.hidden = false;
    frame.classList.add('is-loading');
    frame.src = plan.url;
  }

  for (const plan of PLANS) {
    const button = el(`
      <button class="plans-tab plans-tab--${esc(plan.accent)}" type="button" role="tab" data-plan="${esc(plan.id)}" aria-selected="false">
        <span>${esc(plan.eyebrow)}</span>
        <strong>${esc(plan.title)}</strong>
        <small>${esc(plan.description)}</small>
      </button>`);
    button.addEventListener('click', () => selectPlan(plan.id));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = PLANS.findIndex((item) => item.id === plan.id);
      const nextIndex = event.key === 'Home' ? 0
        : event.key === 'End' ? PLANS.length - 1
        : event.key === 'ArrowRight' ? (index + 1) % PLANS.length
        : (index - 1 + PLANS.length) % PLANS.length;
      const nextButton = tabs.querySelector(`[data-plan="${PLANS[nextIndex].id}"]`);
      selectPlan(PLANS[nextIndex].id);
      nextButton?.focus();
    });
    tabs.appendChild(button);
  }

  frame.addEventListener('load', () => {
    loading.hidden = true;
    frame.classList.remove('is-loading');
  });
  viewer.querySelector('[data-refresh]').addEventListener('click', () => {
    if (!active) return;
    loading.hidden = false;
    frame.classList.add('is-loading');
    frame.src = active.url;
  });
  const focusButton = viewer.querySelector('[data-focus]');
  focusButton.addEventListener('click', () => {
    const focused = viewer.classList.toggle('plans-viewer--focus');
    focusButton.textContent = focused ? 'Ieși din focus' : 'Mod focus';
  });

  wrap.append(tabs, viewer);
  const saved = localStorage.getItem(STORAGE_KEY);
  selectPlan(PLANS.some((plan) => plan.id === saved) ? saved : PLANS[0].id);
  return wrap;
}
