import { state, all, el, esc, api, isoDate, fmtDate, technicianName } from '../core.js';

export function renderTasks() {
  const wrap = el('<div></div>');
  const today = isoDate();
  const tasks = all('tasks');
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  wrap.appendChild(el(`
    <div class="head"><div>
      <h1>Sarcini</h1>
      <p>${open.length} deschise · ${open.filter((t) => t.due && t.due < today).length} întârziate</p>
    </div></div>`));

  // Add form
  const techs = state.data.settings?.technicians || [];
  const form = el(`
    <div class="panel">
      <div class="row">
        <input class="inp" data-title placeholder="Sarcină nouă…" style="flex:1;min-width:200px">
        <input class="inp" type="date" data-due style="width:auto">
        <select class="inp" data-prio style="width:auto">
          <option value="normal">Normal</option><option value="ridicat">Ridicat</option><option value="scăzut">Scăzut</option>
        </select>
        <select class="inp" data-assignee style="width:auto">
          <option value="">Nealocat</option>
          ${techs.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}
        </select>
        <button class="btn btn--pri" data-add>Adaugă</button>
      </div>
    </div>`);

  const add = async () => {
    const title = form.querySelector('[data-title]').value.trim();
    if (!title) return;
    await api.create('tasks', {
      title,
      due: form.querySelector('[data-due]').value || null,
      priority: form.querySelector('[data-prio]').value,
      assignee: form.querySelector('[data-assignee]').value || null,
      done: false
    });
    window.novaReload();
  };
  form.querySelector('[data-add]').addEventListener('click', add);
  form.querySelector('[data-title]').addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  wrap.appendChild(form);

  const sorted = open.sort((a, b) => {
    const weight = { ridicat: 0, normal: 1, 'scăzut': 2 };
    const overdueA = a.due && a.due < today ? 0 : 1;
    const overdueB = b.due && b.due < today ? 0 : 1;
    if (overdueA !== overdueB) return overdueA - overdueB;
    if (weight[a.priority] !== weight[b.priority]) return (weight[a.priority] ?? 1) - (weight[b.priority] ?? 1);
    return (a.due || '9999').localeCompare(b.due || '9999');
  });

  wrap.appendChild(taskPanel('De făcut', sorted, today));
  if (done.length) wrap.appendChild(taskPanel('Finalizate', done.slice(-15).reverse(), today, true));
  return wrap;
}

function taskPanel(title, items, today, muted = false) {
  const panel = el(`<div class="panel"><div class="panel__t">${esc(title)} <span class="faint mono">${items.length}</span></div></div>`);
  if (!items.length) {
    panel.appendChild(el('<div class="empty">Nimic aici.</div>'));
    return panel;
  }
  for (const t of items) {
    const overdue = !t.done && t.due && t.due < today;
    const row = el(`
      <div class="check${t.done ? ' is-done' : ''}">
        <input type="checkbox"${t.done ? ' checked' : ''}>
        <span style="${muted ? 'opacity:.6' : ''}">${esc(t.title)}</span>
        <span style="margin-left:auto" class="row">
          ${t.priority === 'ridicat' && !t.done ? '<span class="tag tag--anulat">prioritar</span>' : ''}
          ${t.assignee ? `<span class="tag tag--plain">${esc(technicianName(t.assignee))}</span>` : ''}
          ${t.due ? `<span class="mono ${overdue ? '' : 'faint'}" style="${overdue ? 'color:var(--red)' : ''}">${esc(fmtDate(t.due))}</span>` : ''}
          <button class="btn btn--sm btn--ghost" data-del title="Șterge">×</button>
        </span>
      </div>`);
    row.querySelector('input').addEventListener('change', async (e) => {
      await api.update('tasks', t.id, { done: e.target.checked });
      window.novaReload();
    });
    row.querySelector('[data-del]').addEventListener('click', async () => {
      await api.remove('tasks', t.id);
      window.novaReload();
    });
    panel.appendChild(row);
  }
  return panel;
}
