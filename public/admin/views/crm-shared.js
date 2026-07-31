import {
  all, byId, el, esc, api, fmtDate, fmtMoney, isoDate,
  openDrawer, closeDrawer, CRM_STAGES, CRM_STAGE_LABEL,
  CRM_ACTIVITY_TYPES, CRM_ACTIVITY_LABEL
} from '../core.js';

const stageIndex = (stage) => CRM_STAGES.findIndex((item) => item.id === stage);
const stageProbability = (stage) => CRM_STAGES.find((item) => item.id === stage)?.probability ?? 10;
const safeSourceUrl = (value) => {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

function localDateTimeValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

export function opportunityActivities(id) {
  return all('activities')
    .filter((activity) => activity.opportunityId === id)
    .sort((a, b) => String(b.occurredAt || b.createdAt || '').localeCompare(String(a.occurredAt || a.createdAt || '')));
}

export function opportunityWeightedValue(opportunity) {
  return Math.round((Number(opportunity.estimatedValue) || 0) * (Number(opportunity.probability) || 0) / 100);
}

export function openOpportunity(id) {
  const opportunity = byId('opportunities', id);
  if (!opportunity) return;
  const activities = opportunityActivities(id);
  const sourceUrl = safeSourceUrl(opportunity.sourceUrl);
  const overdue = opportunity.nextActionDate && opportunity.nextActionDate < isoDate()
    && !['castigat', 'pierdut', 'nurture'].includes(opportunity.stage);

  const drawer = el(`
    <aside class="drawer drawer--crm">
      <div class="drawer__head">
        <div>
          <div class="row" style="gap:6px;margin-bottom:4px">
            <span class="tag crm-priority crm-priority--${esc(String(opportunity.priority || 'B').toLowerCase())}">${esc(opportunity.priority || 'B')}</span>
            <span class="tag crm-stage crm-stage--${esc(opportunity.stage)}">${esc(CRM_STAGE_LABEL[opportunity.stage] || opportunity.stage)}</span>
          </div>
          <h2>${esc(opportunity.company)}</h2>
          <p>${esc(opportunity.segment || 'Segment necompletat')} · ${esc(opportunity.owner || 'Fără owner')}</p>
        </div>
        <button class="drawer__x" aria-label="Închide">×</button>
      </div>

      <div class="crm-value-strip">
        <div><span>Valoare</span><b>${esc(fmtMoney(opportunity.estimatedValue))}</b></div>
        <div><span>Probabilitate</span><b>${esc(opportunity.probability || 0)}%</b></div>
        <div><span>Ponderat</span><b>${esc(fmtMoney(opportunityWeightedValue(opportunity)))}</b></div>
      </div>

      <div class="field">
        <label>Etapa Pipeline</label>
        <select class="inp" data-stage>
          ${CRM_STAGES.map((stage) => `<option value="${stage.id}"${opportunity.stage === stage.id ? ' selected' : ''}>${esc(stage.label)}</option>`).join('')}
        </select>
      </div>

      ${overdue ? '<div class="banner banner--warn"><span>Follow-up întârziat. Închide sau reprogramează următorul pas.</span></div>' : ''}

      <dl class="dl">
        <dt>Contact</dt><dd>${esc(opportunity.contactName || '—')}${opportunity.contactRole ? ` · ${esc(opportunity.contactRole)}` : ''}</dd>
        <dt>Email</dt><dd class="mono">${esc(opportunity.email || '—')}</dd>
        <dt>Telefon</dt><dd class="mono">${esc(opportunity.phone || '—')}</dd>
        <dt>Canal public</dt><dd>${esc(opportunity.contactChannel || '—')}</dd>
        <dt>Flotă</dt><dd>${esc(opportunity.fleetSize || 'Necalificată')}</dd>
        <dt>Retururi</dt><dd>${esc(opportunity.leaseReturns || 'Necalificate')}</dd>
        <dt>Fereastră</dt><dd>${esc(opportunity.returnWindow || 'Necalificată')}</dd>
        <dt>Lessor</dt><dd>${esc(opportunity.lessor || 'Necalificat')}</dd>
        <dt>Locație</dt><dd>${esc(opportunity.location || '—')}</dd>
        <dt>Sursă</dt><dd>${esc(opportunity.source || '—')}</dd>
      </dl>

      ${opportunity.fitReason ? `<div class="crm-note"><b>Ipoteza de fit</b><p>${esc(opportunity.fitReason)}</p></div>` : ''}
      ${opportunity.notes ? `<div class="crm-note"><b>Notițe</b><p>${esc(opportunity.notes)}</p></div>` : ''}

      <div class="crm-next${overdue ? ' is-overdue' : ''}">
        <span>Următorul pas</span>
        <b>${esc(opportunity.nextStep || 'Nu este stabilit')}</b>
        <small>${opportunity.nextActionDate ? esc(fmtDate(opportunity.nextActionDate)) : 'Fără dată'}</small>
      </div>

      <div class="panel__t" style="margin-top:20px">
        Activitate
        <button class="btn btn--sm" data-log>+ Înregistrează</button>
      </div>
      <div data-timeline></div>

      <div class="drawer__foot">
        <button class="btn btn--pri" data-log2>Înregistrează interacțiune</button>
        <button class="btn" data-edit>Editează</button>
        ${sourceUrl ? `<a class="btn" href="${esc(sourceUrl)}" target="_blank" rel="noopener">Sursă ↗</a>` : ''}
        ${opportunity.email ? `<a class="btn" href="mailto:${esc(opportunity.email)}">Email</a>` : ''}
        ${opportunity.phone ? `<a class="btn" href="tel:${esc(String(opportunity.phone).replace(/\\s/g, ''))}">Sună</a>` : ''}
        ${opportunity.customerId ? '<span class="tag tag--finalizat">Client creat</span>' : '<button class="btn" data-convert>Transformă în client</button>'}
        <button class="btn btn--danger" data-del>Șterge</button>
      </div>
    </aside>`);

  const timeline = drawer.querySelector('[data-timeline]');
  if (!activities.length) {
    timeline.appendChild(el('<div class="empty">Nicio interacțiune înregistrată.</div>'));
  } else {
    for (const activity of activities.slice(0, 20)) {
      const item = el(`
        <div class="crm-activity">
          <span class="crm-activity__ico">${activity.type === 'nota' ? '•' : '↗'}</span>
          <div>
            <b>${esc(CRM_ACTIVITY_LABEL[activity.type] || activity.type)}</b>
            <span>${esc(fmtDate(activity.occurredAt || activity.createdAt))}</span>
            ${activity.outcome ? `<p>${esc(activity.outcome)}</p>` : ''}
            ${activity.notes ? `<small>${esc(activity.notes)}</small>` : ''}
          </div>
          <button class="btn btn--sm btn--ghost" data-delete-activity="${esc(activity.id)}" title="Șterge activitatea">×</button>
        </div>`);
      timeline.appendChild(item);
    }
  }

  drawer.querySelector('.drawer__x').addEventListener('click', closeDrawer);
  drawer.querySelectorAll('[data-log], [data-log2]').forEach((button) =>
    button.addEventListener('click', () => openActivityEditor(id)));
  drawer.querySelector('[data-edit]').addEventListener('click', () => openOpportunityEditor(id));
  drawer.querySelector('[data-stage]').addEventListener('change', async (event) => {
    const stage = event.target.value;
    try {
      await api.update('opportunities', id, { stage, probability: stageProbability(stage) });
      window.novaToast(`Mutat în ${CRM_STAGE_LABEL[stage]}.`);
      closeDrawer();
      window.novaReload();
    } catch (error) {
      window.novaToast(error.message, true);
    }
  });
  drawer.querySelector('[data-convert]')?.addEventListener('click', async () => {
    if (!confirm('Creezi fișa de client și marchezi oportunitatea ca fiind câștigată?')) return;
    try {
      await api.opportunityToCustomer(id);
      closeDrawer();
      window.novaToast('Client B2B creat.');
      window.novaReload();
    } catch (error) {
      window.novaToast(error.message, true);
    }
  });
  drawer.querySelector('[data-del]').addEventListener('click', async () => {
    if (!confirm(`Ștergi oportunitatea ${opportunity.company} și istoricul ei CRM?`)) return;
    try {
      await api.remove('opportunities', id);
      closeDrawer();
      window.novaToast('Oportunitate ștearsă.');
      window.novaReload();
    } catch (error) {
      window.novaToast(error.message, true);
    }
  });
  drawer.querySelectorAll('[data-delete-activity]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!confirm('Ștergi această activitate?')) return;
      await api.remove('activities', button.dataset.deleteActivity);
      closeDrawer();
      await window.novaReload();
      openOpportunity(id);
    });
  });

  openDrawer(drawer);
}

export function openOpportunityEditor(id = null, preset = {}) {
  const current = id ? byId('opportunities', id) : {};
  const opportunity = { ...current, ...preset };
  const stage = opportunity.stage || 'de_calificat';

  const drawer = el(`
    <aside class="drawer drawer--crm">
      <div class="drawer__head">
        <div><h2>${id ? 'Editează oportunitatea' : 'Oportunitate nouă'}</h2>
          <p>Calificarea minimă: flotă, retur, lessor, aprobator și termen.</p></div>
        <button class="drawer__x" aria-label="Închide">×</button>
      </div>

      <div class="field"><label>Companie *</label><input class="inp" data-company value="${esc(opportunity.company || '')}"></div>
      <div class="grid2">
        <div class="field"><label>Segment</label><input class="inp" data-segment value="${esc(opportunity.segment || '')}"></div>
        <div class="field"><label>Locație</label><input class="inp" data-location value="${esc(opportunity.location || '')}"></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Prioritate</label><select class="inp" data-priority>
          ${['A', 'B', 'C'].map((value) => `<option${(opportunity.priority || 'B') === value ? ' selected' : ''}>${value}</option>`).join('')}
        </select></div>
        <div class="field"><label>Scor fit (0–10)</label><input class="inp" type="number" min="0" max="10" step=".1" data-score value="${esc(opportunity.score ?? 7)}"></div>
      </div>

      <div class="panel__t">Contact</div>
      <div class="grid2">
        <div class="field"><label>Nume contact</label><input class="inp" data-contact value="${esc(opportunity.contactName || '')}"></div>
        <div class="field"><label>Rol / aprobator</label><input class="inp" data-role value="${esc(opportunity.contactRole || opportunity.targetRole || '')}"></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Email</label><input class="inp" type="email" data-email value="${esc(opportunity.email || '')}"></div>
        <div class="field"><label>Telefon</label><input class="inp" data-phone value="${esc(opportunity.phone || '')}"></div>
      </div>
      <div class="field"><label>Canal corporate public</label><input class="inp" data-channel value="${esc(opportunity.contactChannel || '')}"></div>

      <div class="panel__t">Calificare B2B</div>
      <div class="grid2">
        <div class="field"><label>Mărimea flotei</label><input class="inp" data-fleet value="${esc(opportunity.fleetSize || '')}" placeholder="ex. 5–30 autoturisme"></div>
        <div class="field"><label>Retururi estimate</label><input class="inp" data-returns value="${esc(opportunity.leaseReturns || '')}" placeholder="ex. 2–5"></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Fereastra de retur</label><input class="inp" data-window value="${esc(opportunity.returnWindow || '')}" placeholder="ex. următoarele 90 zile"></div>
        <div class="field"><label>Lessor</label><input class="inp" data-lessor value="${esc(opportunity.lessor || '')}"></div>
      </div>

      <div class="panel__t">Valoare și etapă</div>
      <div class="grid2">
        <div class="field"><label>Etapă</label><select class="inp" data-stage>
          ${CRM_STAGES.map((item) => `<option value="${item.id}"${stage === item.id ? ' selected' : ''}>${esc(item.label)}</option>`).join('')}
        </select></div>
        <div class="field"><label>Owner</label><input class="inp" data-owner value="${esc(opportunity.owner || 'Fondator')}"></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Valoare estimată, lei fără TVA</label><input class="inp" type="number" min="0" step="50" data-value value="${esc(opportunity.estimatedValue ?? 1500)}"></div>
        <div class="field"><label>Probabilitate, %</label><input class="inp" type="number" min="0" max="100" data-probability value="${esc(opportunity.probability ?? stageProbability(stage))}"></div>
      </div>

      <div class="panel__t">Următorul pas</div>
      <div class="field"><label>Acțiune concretă</label><input class="inp" data-next-step value="${esc(opportunity.nextStep || '')}" placeholder="Verb + rezultat + persoană"></div>
      <div class="field"><label>Data follow-up</label><input class="inp" type="date" data-next-date value="${esc(opportunity.nextActionDate || '')}"></div>

      <div class="grid2">
        <div class="field"><label>Sursa lead-ului</label><input class="inp" data-source value="${esc(opportunity.source || 'manual')}"></div>
        <div class="field"><label>URL sursă</label><input class="inp" type="url" data-source-url value="${esc(opportunity.sourceUrl || '')}"></div>
      </div>
      <div class="field"><label>Ipoteza de fit</label><textarea class="inp" data-fit>${esc(opportunity.fitReason || '')}</textarea></div>
      <div class="field"><label>Notițe</label><textarea class="inp" data-notes>${esc(opportunity.notes || '')}</textarea></div>
      <div class="field"><label>Motiv pierdere / nurture</label><textarea class="inp" data-loss>${esc(opportunity.lossReason || '')}</textarea></div>

      <div class="drawer__foot">
        <button class="btn btn--pri" data-save>Salvează</button>
        <button class="btn" data-cancel>Renunță</button>
      </div>
    </aside>`);

  drawer.querySelector('.drawer__x').addEventListener('click', closeDrawer);
  drawer.querySelector('[data-cancel]').addEventListener('click', closeDrawer);
  drawer.querySelector('[data-stage]').addEventListener('change', (event) => {
    drawer.querySelector('[data-probability]').value = stageProbability(event.target.value);
  });
  drawer.querySelector('[data-save]').addEventListener('click', async () => {
    const payload = {
      company: drawer.querySelector('[data-company]').value.trim(),
      segment: drawer.querySelector('[data-segment]').value.trim(),
      location: drawer.querySelector('[data-location]').value.trim(),
      priority: drawer.querySelector('[data-priority]').value,
      score: Number(drawer.querySelector('[data-score]').value) || 0,
      contactName: drawer.querySelector('[data-contact]').value.trim(),
      contactRole: drawer.querySelector('[data-role]').value.trim(),
      email: drawer.querySelector('[data-email]').value.trim(),
      phone: drawer.querySelector('[data-phone]').value.trim(),
      contactChannel: drawer.querySelector('[data-channel]').value.trim(),
      fleetSize: drawer.querySelector('[data-fleet]').value.trim(),
      leaseReturns: drawer.querySelector('[data-returns]').value.trim(),
      returnWindow: drawer.querySelector('[data-window]').value.trim(),
      lessor: drawer.querySelector('[data-lessor]').value.trim(),
      stage: drawer.querySelector('[data-stage]').value,
      owner: drawer.querySelector('[data-owner]').value.trim(),
      estimatedValue: Number(drawer.querySelector('[data-value]').value) || 0,
      probability: Number(drawer.querySelector('[data-probability]').value) || 0,
      nextStep: drawer.querySelector('[data-next-step]').value.trim(),
      nextActionDate: drawer.querySelector('[data-next-date]').value || null,
      source: drawer.querySelector('[data-source]').value.trim(),
      sourceUrl: drawer.querySelector('[data-source-url]').value.trim(),
      fitReason: drawer.querySelector('[data-fit]').value.trim(),
      notes: drawer.querySelector('[data-notes]').value.trim(),
      lossReason: drawer.querySelector('[data-loss]').value.trim()
    };

    if (!payload.company) return window.novaToast('Compania este obligatorie.', true);
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      return window.novaToast('Adresa de email nu este validă.', true);
    }
    try {
      const response = id
        ? await api.update('opportunities', id, payload)
        : await api.create('opportunities', payload);
      closeDrawer();
      window.novaToast('Oportunitate salvată.');
      await window.novaReload();
      if (!id) openOpportunity(response.item.id);
    } catch (error) {
      window.novaToast(error.message, true);
    }
  });

  openDrawer(drawer);
}

export function openActivityEditor(opportunityId) {
  const opportunity = byId('opportunities', opportunityId);
  if (!opportunity) return;

  const drawer = el(`
    <aside class="drawer drawer--crm">
      <div class="drawer__head">
        <div><h2>Înregistrează interacțiunea</h2><p>${esc(opportunity.company)}</p></div>
        <button class="drawer__x" aria-label="Închide">×</button>
      </div>
      <div class="grid2">
        <div class="field"><label>Tip</label><select class="inp" data-type>
          ${CRM_ACTIVITY_TYPES.map((type) => `<option value="${type.id}">${esc(type.label)}</option>`).join('')}
        </select></div>
        <div class="field"><label>Data și ora</label><input class="inp" type="datetime-local" data-date value="${localDateTimeValue()}"></div>
      </div>
      <div class="field"><label>Rezultat</label><input class="inp" data-outcome placeholder="Ce s-a aflat sau decis?"></div>
      <div class="field"><label>Notițe</label><textarea class="inp" data-notes placeholder="Obiecții, aprobator, lessor, volum, context…"></textarea></div>
      <div class="panel__t">Următorul pas</div>
      <div class="field"><label>Acțiune</label><input class="inp" data-next-step value="${esc(opportunity.nextStep || '')}"></div>
      <div class="field"><label>Data</label><input class="inp" type="date" data-next-date value="${esc(opportunity.nextActionDate || '')}"></div>
      <label class="check" style="border:0;margin-top:4px">
        <input type="checkbox" data-task checked>
        <span>Creează automat și o sarcină de follow-up</span>
      </label>
      <div class="drawer__foot">
        <button class="btn btn--pri" data-save>Salvează activitatea</button>
        <button class="btn" data-cancel>Renunță</button>
      </div>
    </aside>`);

  drawer.querySelector('.drawer__x').addEventListener('click', closeDrawer);
  drawer.querySelector('[data-cancel]').addEventListener('click', closeDrawer);
  drawer.querySelector('[data-save]').addEventListener('click', async () => {
    const type = drawer.querySelector('[data-type]').value;
    const nextStep = drawer.querySelector('[data-next-step]').value.trim();
    const nextActionDate = drawer.querySelector('[data-next-date]').value || null;
    const payload = {
      opportunityId,
      type,
      occurredAt: drawer.querySelector('[data-date]').value
        ? new Date(drawer.querySelector('[data-date]').value).toISOString()
        : new Date().toISOString(),
      outcome: drawer.querySelector('[data-outcome]').value.trim(),
      notes: drawer.querySelector('[data-notes]').value.trim(),
      nextStep,
      nextActionDate,
      createTask: drawer.querySelector('[data-task]').checked && Boolean(nextStep && nextActionDate)
    };

    if (!payload.outcome && type !== 'nota') {
      return window.novaToast('Notează rezultatul interacțiunii.', true);
    }

    try {
      await api.create('activities', payload);
      const currentIndex = stageIndex(opportunity.stage);
      const suggestedStage = type === 'discovery'
        ? 'discovery'
        : type === 'oferta'
          ? 'oferta'
          : type === 'pilot'
            ? 'pilot_programat'
            : null;
      if (suggestedStage && currentIndex < stageIndex(suggestedStage)) {
        await api.update('opportunities', opportunityId, {
          stage: suggestedStage,
          probability: stageProbability(suggestedStage)
        });
      }
      closeDrawer();
      window.novaToast('Activitate salvată.');
      await window.novaReload();
      openOpportunity(opportunityId);
    } catch (error) {
      window.novaToast(error.message, true);
    }
  });

  openDrawer(drawer);
}
