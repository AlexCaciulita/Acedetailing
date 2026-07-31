import { all, el, esc, api, fmtMoney } from '../core.js';

export function renderInventory() {
  const wrap = el('<div></div>');
  const items = all('inventory').sort((a, b) => a.name.localeCompare(b.name));
  const low = items.filter((i) => Number(i.qty) <= Number(i.minQty));
  const value = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.costPerUnit) || 0), 0);

  wrap.appendChild(el(`
    <div class="head"><div>
      <h1>Stocuri</h1>
      <p>${items.length} articole · valoare ${esc(fmtMoney(value))}</p>
    </div></div>`));

  if (low.length) {
    wrap.appendChild(el(`
      <div class="banner banner--warn">
        <span><b>${low.length}</b> articol(e) sub pragul minim: ${esc(low.map((i) => i.name).join(', '))}</span>
      </div>`));
  }

  const form = el(`
    <div class="panel">
      <div class="row">
        <input class="inp" data-name placeholder="Articol nou…" style="flex:1;min-width:180px">
        <input class="inp" data-unit placeholder="unitate" style="width:100px">
        <input class="inp" type="number" data-qty placeholder="stoc" style="width:90px">
        <input class="inp" type="number" data-min placeholder="minim" style="width:90px">
        <input class="inp" type="number" data-cost placeholder="cost/unit" style="width:110px">
        <button class="btn btn--pri" data-add>Adaugă</button>
      </div>
    </div>`);
  form.querySelector('[data-add]').addEventListener('click', async () => {
    const name = form.querySelector('[data-name]').value.trim();
    if (!name) return;
    await api.create('inventory', {
      name,
      unit: form.querySelector('[data-unit]').value.trim() || 'buc',
      qty: Number(form.querySelector('[data-qty]').value) || 0,
      minQty: Number(form.querySelector('[data-min]').value) || 0,
      costPerUnit: Number(form.querySelector('[data-cost]').value) || 0
    });
    window.novaReload();
  });
  wrap.appendChild(form);

  const panel = el('<div class="panel"></div>');
  if (!items.length) {
    panel.appendChild(el('<div class="empty">Niciun articol în stoc.</div>'));
  } else {
    const table = el(`<table><thead><tr>
      <th>Articol</th><th class="num">Stoc</th><th class="num">Minim</th>
      <th class="num">Cost/unit</th><th class="num">Valoare</th><th></th>
    </tr></thead><tbody></tbody></table>`);

    for (const i of items) {
      const isLow = Number(i.qty) <= Number(i.minQty);
      const row = el(`<tr>
        <td>${esc(i.name)} ${isLow ? '<span class="tag tag--anulat">sub prag</span>' : ''}</td>
        <td class="num"><input class="inp mono right" type="number" data-qty value="${esc(i.qty)}" style="width:78px;padding:5px 8px"></td>
        <td class="num mono faint">${esc(i.minQty)} ${esc(i.unit || '')}</td>
        <td class="num mono faint">${esc(fmtMoney(i.costPerUnit))}</td>
        <td class="num mono">${esc(fmtMoney((Number(i.qty) || 0) * (Number(i.costPerUnit) || 0)))}</td>
        <td class="num"><button class="btn btn--sm btn--ghost" data-del>×</button></td>
      </tr>`);

      // Inline stock edit: this is the field that changes daily.
      const input = row.querySelector('[data-qty]');
      input.addEventListener('change', async () => {
        await api.update('inventory', i.id, { qty: Number(input.value) || 0 });
        window.novaToast('Stoc actualizat.');
        window.novaReload();
      });
      row.querySelector('[data-del]').addEventListener('click', async () => {
        if (!confirm(`Ștergi „${i.name}”?`)) return;
        await api.remove('inventory', i.id);
        window.novaReload();
      });
      table.querySelector('tbody').appendChild(row);
    }
    panel.appendChild(table);
  }
  wrap.appendChild(panel);
  return wrap;
}
