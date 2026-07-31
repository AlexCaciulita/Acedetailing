import {
  state, all, byId, el, esc, api, fmtDate, fmtMoney, jobPriceMid,
  openDrawer, closeDrawer
} from '../core.js';

let q = '';

export function renderCustomers() {
  const wrap = el('<div></div>');
  const customers = all('customers');

  const head = el(`
    <div class="head">
      <div><h1>Clienți</h1><p>${customers.length} clienți · ${all('vehicles').length} mașini</p></div>
      <div class="head__act">
        <button class="btn btn--pri" data-add>+ Client</button>
        <button class="btn" data-addveh>+ Mașină</button>
      </div>
    </div>`);
  head.querySelector('[data-add]').addEventListener('click', () => openCustomerEditor(null));
  head.querySelector('[data-addveh]').addEventListener('click', () => openVehicleEditor(null));
  wrap.appendChild(head);

  const search = el(`<div class="filters"><input class="inp" data-q placeholder="Caută nume, telefon, email, număr…" value="${esc(q)}"></div>`);
  search.querySelector('input').addEventListener('input', (e) => { q = e.target.value; repaint(); });
  wrap.appendChild(search);

  const needle = q.trim().toLowerCase();
  const rows = customers
    .filter((c) => {
      if (!needle) return true;
      const plates = all('vehicles').filter((v) => v.customerId === c.id).map((v) => `${v.make} ${v.model} ${v.plate}`).join(' ');
      return `${c.name} ${c.phone} ${c.email} ${c.company || ''} ${plates}`.toLowerCase().includes(needle);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const panel = el('<div class="panel"></div>');
  if (!rows.length) {
    panel.appendChild(el('<div class="empty">Niciun client găsit.</div>'));
  } else {
    const table = el(`<table><thead><tr>
      <th>Nume</th><th>Contact</th><th>Tip</th><th>Mașini</th>
      <th class="num">Lucrări</th><th class="num">Valoare totală</th></tr></thead><tbody></tbody></table>`);
    for (const c of rows) {
      const vehicles = all('vehicles').filter((v) => v.customerId === c.id);
      const jobs = all('jobs').filter((j) => j.customerId === c.id && j.status !== 'anulat');
      const total = jobs.reduce((s, j) => s + jobPriceMid(j), 0);
      const row = el(`<tr class="clickable">
        <td>${esc(c.name)}${(c.tags || []).map((t) => ` <span class="tag tag--plain">${esc(t)}</span>`).join('')}</td>
        <td class="mono faint">${esc(c.phone || '')}<div>${esc(c.email || '')}</div></td>
        <td class="muted">${c.type === 'firma' ? 'Firmă' : 'Persoană'}</td>
        <td class="muted">${vehicles.length ? esc(vehicles.map((v) => v.plate || `${v.make} ${v.model}`).join(', ')) : '—'}</td>
        <td class="num mono">${jobs.length}</td>
        <td class="num mono">${esc(fmtMoney(total))}</td>
      </tr>`);
      row.addEventListener('click', () => openCustomer(c.id));
      table.querySelector('tbody').appendChild(row);
    }
    panel.appendChild(table);
  }
  wrap.appendChild(panel);
  return wrap;
}

function openCustomer(id) {
  const c = byId('customers', id);
  if (!c) return;
  const vehicles = all('vehicles').filter((v) => v.customerId === id);
  const jobs = all('jobs').filter((j) => j.customerId === id).sort((a, b) => (b.start || '').localeCompare(a.start || ''));
  const total = jobs.filter((j) => j.status !== 'anulat').reduce((s, j) => s + jobPriceMid(j), 0);

  const drawer = el(`
    <aside class="drawer">
      <div class="drawer__head">
        <div><h2>${esc(c.name)}</h2><p>${c.type === 'firma' ? esc(c.company || 'Firmă') : 'Client persoană fizică'}</p></div>
        <button class="drawer__x" aria-label="Închide">×</button>
      </div>
      <dl class="dl">
        <dt>Telefon</dt><dd class="mono">${esc(c.phone || '—')}</dd>
        <dt>Email</dt><dd class="mono">${esc(c.email || '—')}</dd>
        ${c.cui ? `<dt>CUI</dt><dd class="mono">${esc(c.cui)}</dd>` : ''}
        <dt>Valoare</dt><dd>${esc(fmtMoney(total))} din ${jobs.length} lucrări</dd>
      </dl>
      ${c.notes ? `<div class="panel" style="margin-bottom:16px">${esc(c.notes)}</div>` : ''}
      <div class="panel__t">Mașini <button class="btn btn--sm" data-addveh>+ Adaugă</button></div>
      <div data-vehicles></div>
      <div class="panel__t" style="margin-top:18px">Istoric lucrări</div>
      <div data-jobs></div>
      <div class="drawer__foot">
        <button class="btn" data-edit>Editează</button>
        <button class="btn btn--danger" data-del>Șterge</button>
      </div>
    </aside>`);

  const vehHost = drawer.querySelector('[data-vehicles]');
  if (!vehicles.length) vehHost.appendChild(el('<div class="empty">Nicio mașină.</div>'));
  for (const v of vehicles) {
    const row = el(`<div class="check" style="cursor:pointer">
      <span>${esc(v.make)} ${esc(v.model)} ${v.year ? `(${esc(v.year)})` : ''}
        <span class="faint mono">${esc(v.plate || '')}</span>
        ${v.recordCode ? `<a href="/vin/${esc(v.recordCode)}" target="_blank" rel="noopener" class="mono" style="font-size:.72rem"> ${esc(v.recordCode)} ↗</a>` : ''}
      </span></div>`);
    row.addEventListener('click', (e) => { if (e.target.tagName !== 'A') openVehicleEditor(v.id); });
    vehHost.appendChild(row);
  }

  const jobHost = drawer.querySelector('[data-jobs]');
  if (!jobs.length) jobHost.appendChild(el('<div class="empty">Nicio lucrare.</div>'));
  for (const j of jobs) {
    jobHost.appendChild(el(`<div class="check">
      <span class="mono faint" style="min-width:88px">${esc(fmtDate(j.start))}</span>
      <span>${esc(j.packageName || '—')}</span>
      <span style="margin-left:auto" class="mono">${esc(fmtMoney(jobPriceMid(j)))}</span></div>`));
  }

  drawer.querySelector('.drawer__x').addEventListener('click', closeDrawer);
  drawer.querySelector('[data-addveh]').addEventListener('click', () => openVehicleEditor(null, id));
  drawer.querySelector('[data-edit]').addEventListener('click', () => openCustomerEditor(id));
  drawer.querySelector('[data-del]').addEventListener('click', async () => {
    if (!confirm(`Ștergi clientul ${c.name}? Mașinile și lucrările rămân, dar fără client asociat.`)) return;
    await api.remove('customers', id);
    closeDrawer();
    window.novaToast('Client șters.');
    window.novaReload();
  });

  openDrawer(drawer);
}

function openCustomerEditor(id) {
  const c = id ? byId('customers', id) : {};
  const drawer = el(`
    <aside class="drawer">
      <div class="drawer__head"><div><h2>${id ? 'Editează clientul' : 'Client nou'}</h2></div>
        <button class="drawer__x">×</button></div>
      <div class="field"><label>Nume</label><input class="inp" data-name value="${esc(c.name || '')}"></div>
      <div class="grid2">
        <div class="field"><label>Telefon</label><input class="inp" data-phone value="${esc(c.phone || '')}"></div>
        <div class="field"><label>Email</label><input class="inp" type="email" data-email value="${esc(c.email || '')}"></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Tip</label><select class="inp" data-type>
          <option value="persoana"${c.type !== 'firma' ? ' selected' : ''}>Persoană fizică</option>
          <option value="firma"${c.type === 'firma' ? ' selected' : ''}>Firmă</option></select></div>
        <div class="field"><label>CUI (dacă firmă)</label><input class="inp" data-cui value="${esc(c.cui || '')}"></div>
      </div>
      <div class="field"><label>Etichete (separate prin virgulă)</label><input class="inp" data-tags value="${esc((c.tags || []).join(', '))}"></div>
      <div class="field"><label>Notițe</label><textarea class="inp" data-notes>${esc(c.notes || '')}</textarea></div>
      <div class="drawer__foot">
        <button class="btn btn--pri" data-save>Salvează</button>
        <button class="btn" data-cancel>Renunță</button>
      </div>
    </aside>`);

  const close = () => closeDrawer();
  drawer.querySelector('.drawer__x').addEventListener('click', close);
  drawer.querySelector('[data-cancel]').addEventListener('click', close);
  drawer.querySelector('[data-save]').addEventListener('click', async () => {
    const payload = {
      name: drawer.querySelector('[data-name]').value.trim(),
      phone: drawer.querySelector('[data-phone]').value.trim(),
      email: drawer.querySelector('[data-email]').value.trim(),
      type: drawer.querySelector('[data-type]').value,
      cui: drawer.querySelector('[data-cui]').value.trim(),
      tags: drawer.querySelector('[data-tags]').value.split(',').map((t) => t.trim()).filter(Boolean),
      notes: drawer.querySelector('[data-notes]').value
    };
    if (!payload.name) return window.novaToast('Numele este obligatoriu.', true);
    try {
      id ? await api.update('customers', id, payload) : await api.create('customers', payload);
      closeDrawer();
      window.novaToast('Client salvat.');
      window.novaReload();
    } catch (err) { window.novaToast(err.message, true); }
  });

  openDrawer(drawer);
}

function openVehicleEditor(id, presetCustomer) {
  const v = id ? byId('vehicles', id) : {};
  const customers = all('customers').sort((a, b) => a.name.localeCompare(b.name));
  const classes = state.data.settings?.vehicleClasses || [];
  const owner = v.customerId || presetCustomer || '';

  const drawer = el(`
    <aside class="drawer">
      <div class="drawer__head"><div><h2>${id ? 'Editează mașina' : 'Mașină nouă'}</h2></div>
        <button class="drawer__x">×</button></div>
      <div class="field"><label>Proprietar</label><select class="inp" data-owner>
        <option value="">— alege —</option>
        ${customers.map((c) => `<option value="${esc(c.id)}"${owner === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
      </select></div>
      <div class="grid2">
        <div class="field"><label>Marcă</label><input class="inp" data-make value="${esc(v.make || '')}"></div>
        <div class="field"><label>Model</label><input class="inp" data-model value="${esc(v.model || '')}"></div>
      </div>
      <div class="grid2">
        <div class="field"><label>An</label><input class="inp" type="number" data-year value="${esc(v.year || '')}"></div>
        <div class="field"><label>Număr</label><input class="inp" data-plate value="${esc(v.plate || '')}"></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Clasă</label><select class="inp" data-class>
          ${classes.map((c) => `<option value="${esc(c.id)}"${v.class === c.id ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}
        </select></div>
        <div class="field"><label>Culoare</label><input class="inp" data-color value="${esc(v.color || '')}"></div>
      </div>
      <div class="grid2">
        <div class="field"><label>VIN</label><input class="inp mono" data-vin value="${esc(v.vin || '')}"></div>
        <div class="field"><label>Cod carte finisaj</label><input class="inp mono" data-record placeholder="NV-XXXX-XXXX" value="${esc(v.recordCode || '')}"></div>
      </div>
      <div class="field"><label>Notițe</label><textarea class="inp" data-notes>${esc(v.notes || '')}</textarea></div>
      <div class="drawer__foot">
        <button class="btn btn--pri" data-save>Salvează</button>
        <button class="btn" data-cancel>Renunță</button>
        ${id ? '<button class="btn btn--danger" data-del>Șterge</button>' : ''}
      </div>
    </aside>`);

  drawer.querySelector('.drawer__x').addEventListener('click', closeDrawer);
  drawer.querySelector('[data-cancel]').addEventListener('click', closeDrawer);
  drawer.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!confirm('Ștergi această mașină?')) return;
    await api.remove('vehicles', id);
    closeDrawer();
    window.novaReload();
  });

  drawer.querySelector('[data-save]').addEventListener('click', async () => {
    const payload = {
      customerId: drawer.querySelector('[data-owner]').value,
      make: drawer.querySelector('[data-make]').value.trim(),
      model: drawer.querySelector('[data-model]').value.trim(),
      year: Number(drawer.querySelector('[data-year]').value) || null,
      plate: drawer.querySelector('[data-plate]').value.trim().toUpperCase(),
      class: drawer.querySelector('[data-class]').value,
      color: drawer.querySelector('[data-color]').value.trim(),
      vin: drawer.querySelector('[data-vin]').value.trim().toUpperCase(),
      recordCode: drawer.querySelector('[data-record]').value.trim().toUpperCase(),
      notes: drawer.querySelector('[data-notes]').value
    };
    if (!payload.customerId) return window.novaToast('Alege proprietarul.', true);
    if (!payload.make) return window.novaToast('Marca este obligatorie.', true);
    try {
      id ? await api.update('vehicles', id, payload) : await api.create('vehicles', payload);
      closeDrawer();
      window.novaToast('Mașină salvată.');
      window.novaReload();
    } catch (err) { window.novaToast(err.message, true); }
  });

  openDrawer(drawer);
}

function repaint() {
  const main = document.getElementById('main');
  main.innerHTML = '';
  main.appendChild(renderCustomers());
  const input = main.querySelector('[data-q]');
  input?.focus();
  input?.setSelectionRange(input.value.length, input.value.length);
}
