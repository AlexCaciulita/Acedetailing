import {
  state, all, byId, el, esc, api, isoDate, fmtDate, fmtMoney, jobPriceMid,
  customerName, vehicleLabel, bayName, technicianName, STATUS_LABEL,
  openDrawer, closeDrawer
} from '../core.js';

const STATUSES = ['nou', 'confirmat', 'in_lucru', 'finalizat', 'livrat', 'anulat'];

const DEFAULT_CHECKLIST = [
  'Inspecție inițială și fotografii',
  'Măsurare grosime lac',
  'Spălare în doi pași și decontaminare',
  'Corecție / tratament conform pachetului',
  'Aplicare protecție',
  'Control final sub lampă',
  'Fișă de finisaj emisă'
];

let filter = { status: '', q: '' };

export function renderJobs() {
  const wrap = el('<div></div>');

  const head = el(`
    <div class="head">
      <div><h1>Lucrări</h1><p>${all('jobs').length} în total</p></div>
      <div class="head__act"><button class="btn btn--pri">+ Lucrare nouă</button></div>
    </div>`);
  head.querySelector('button').addEventListener('click', () => openJobEditor(null, { start: isoDate() }));
  wrap.appendChild(head);

  const filters = el(`
    <div class="filters">
      <select class="inp" data-status>
        <option value="">Toate statusurile</option>
        ${STATUSES.map((s) => `<option value="${s}"${filter.status === s ? ' selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}
      </select>
      <input class="inp" data-q placeholder="Caută client, mașină, pachet…" value="${esc(filter.q)}">
    </div>`);
  filters.querySelector('[data-status]').addEventListener('change', (e) => { filter.status = e.target.value; repaint(); });
  filters.querySelector('[data-q]').addEventListener('input', (e) => { filter.q = e.target.value; repaint(); });
  wrap.appendChild(filters);

  const needle = filter.q.trim().toLowerCase();
  const rows = all('jobs')
    .filter((j) => !filter.status || j.status === filter.status)
    .filter((j) => !needle || [
      customerName(j.customerId), vehicleLabel(j.vehicleId), j.packageName, j.notes
    ].join(' ').toLowerCase().includes(needle))
    .sort((a, b) => (b.start || '').localeCompare(a.start || ''));

  const panel = el('<div class="panel"></div>');
  if (!rows.length) {
    panel.appendChild(el('<div class="empty">Nicio lucrare găsită.</div>'));
  } else {
    const table = el(`<table><thead><tr>
      <th>Data</th><th>Client</th><th>Mașină</th><th>Pachet</th><th>Boxă</th>
      <th>Tehnician</th><th>Status</th><th class="num">Valoare</th><th class="num">Avans</th>
    </tr></thead><tbody></tbody></table>`);
    for (const job of rows) {
      const row = el(`<tr class="clickable">
        <td class="mono nowrap">${esc(fmtDate(job.start))}<div class="faint">${esc(job.days || 1)} zile</div></td>
        <td>${esc(customerName(job.customerId))}</td>
        <td class="muted">${esc(vehicleLabel(job.vehicleId))}</td>
        <td>${esc(job.packageName || '—')}</td>
        <td class="muted">${esc(bayName(job.bayId))}</td>
        <td class="muted">${esc(technicianName(job.technicianId))}</td>
        <td><span class="tag tag--${esc(job.status)}">${esc(STATUS_LABEL[job.status] || job.status)}</span></td>
        <td class="num mono">${esc(fmtMoney(jobPriceMid(job)))}</td>
        <td class="num mono ${job.deposit && !job.depositPaid ? 'right' : 'faint'}">${
          job.deposit ? `${esc(fmtMoney(job.deposit))}${job.depositPaid ? ' ✓' : ' ✗'}` : '—'}</td>
      </tr>`);
      row.addEventListener('click', () => openJob(job.id));
      table.querySelector('tbody').appendChild(row);
    }
    panel.appendChild(table);
  }
  wrap.appendChild(panel);
  return wrap;
}

/* ── detail drawer ────────────────────────────────────────────────────────── */

export function openJob(id) {
  const job = byId('jobs', id);
  if (!job) return;

  const checklist = job.checklist?.length ? job.checklist
    : DEFAULT_CHECKLIST.map((label, i) => ({ id: `c${i}`, label, done: false }));
  const done = checklist.filter((c) => c.done).length;
  const vehicle = byId('vehicles', job.vehicleId);

  const drawer = el(`
    <aside class="drawer">
      <div class="drawer__head">
        <div>
          <h2>${esc(customerName(job.customerId))}</h2>
          <p>${esc(vehicleLabel(job.vehicleId))}</p>
        </div>
        <button class="drawer__x" aria-label="Închide">×</button>
      </div>

      <dl class="dl">
        <dt>Pachet</dt><dd>${esc(job.packageName || '—')}</dd>
        <dt>Perioadă</dt><dd>${esc(fmtDate(job.start))} · ${esc(job.days || 1)} zile</dd>
        <dt>Boxă</dt><dd>${esc(bayName(job.bayId))}</dd>
        <dt>Tehnician</dt><dd>${esc(technicianName(job.technicianId))}</dd>
        <dt>Valoare</dt><dd>${esc(fmtMoney(job.priceMin))} – ${esc(fmtMoney(job.priceMax))}</dd>
        <dt>Avans</dt><dd>${job.deposit ? `${esc(fmtMoney(job.deposit))} · ${job.depositPaid ? 'încasat' : '<b style="color:var(--red)">neîncasat</b>'}` : '—'}</dd>
        ${vehicle?.recordCode ? `<dt>Carte finisaj</dt><dd><a href="/vin/${esc(vehicle.recordCode)}" target="_blank" rel="noopener">${esc(vehicle.recordCode)} ↗</a></dd>` : ''}
      </dl>

      <div class="field">
        <label>Status</label>
        <select class="inp" data-status>
          ${STATUSES.map((s) => `<option value="${s}"${job.status === s ? ' selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}
        </select>
      </div>

      <div class="panel__t" style="margin-top:18px">Checklist <span class="faint mono">${done}/${checklist.length}</span></div>
      <div data-checklist></div>

      <div class="field" style="margin-top:16px">
        <label>Notițe</label>
        <textarea class="inp" data-notes>${esc(job.notes || '')}</textarea>
      </div>

      <div class="drawer__foot">
        <button class="btn btn--pri" data-save>Salvează</button>
        <button class="btn" data-edit>Editează detalii</button>
        <button class="btn btn--danger" data-del>Șterge</button>
      </div>
    </aside>`);

  const listHost = drawer.querySelector('[data-checklist]');
  checklist.forEach((item, index) => {
    const row = el(`<label class="check${item.done ? ' is-done' : ''}">
      <input type="checkbox"${item.done ? ' checked' : ''}><span>${esc(item.label)}</span></label>`);
    row.querySelector('input').addEventListener('change', (e) => {
      checklist[index] = { ...item, done: e.target.checked };
      row.classList.toggle('is-done', e.target.checked);
    });
    listHost.appendChild(row);
  });

  drawer.querySelector('.drawer__x').addEventListener('click', closeDrawer);

  drawer.querySelector('[data-save]').addEventListener('click', async () => {
    try {
      await api.update('jobs', id, {
        status: drawer.querySelector('[data-status]').value,
        notes: drawer.querySelector('[data-notes]').value,
        checklist
      });
      closeDrawer();
      window.novaToast('Lucrare actualizată.');
      window.novaReload();
    } catch (err) { window.novaToast(err.message, true); }
  });

  drawer.querySelector('[data-edit]').addEventListener('click', () => openJobEditor(id));

  drawer.querySelector('[data-del]').addEventListener('click', async () => {
    if (!confirm('Ștergi definitiv această lucrare?')) return;
    await api.remove('jobs', id);
    closeDrawer();
    window.novaToast('Lucrare ștearsă.');
    window.novaReload();
  });

  openDrawer(drawer);
}

/* ── create / edit ────────────────────────────────────────────────────────── */

export function openJobEditor(id, preset = {}) {
  const job = id ? byId('jobs', id) : null;
  const cfg = state.data.settings || {};
  const source = { ...(job || {}), ...preset };

  const customers = all('customers').sort((a, b) => a.name.localeCompare(b.name));
  const vehicles = all('vehicles');

  const drawer = el(`
    <aside class="drawer">
      <div class="drawer__head">
        <div><h2>${job ? 'Editează lucrarea' : 'Lucrare nouă'}</h2></div>
        <button class="drawer__x" aria-label="Închide">×</button>
      </div>

      <div class="field"><label>Client</label>
        <select class="inp" data-customer>
          <option value="">— alege —</option>
          ${customers.map((c) => `<option value="${esc(c.id)}"${source.customerId === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select></div>

      <div class="field"><label>Mașină</label>
        <select class="inp" data-vehicle><option value="">— alege clientul întâi —</option></select></div>

      <div class="field"><label>Pachet</label>
        <select class="inp" data-package>
          <option value="">— alege —</option>
          ${(cfg.services || []).map((s) => `<option value="${esc(s.id)}"${source.packageId === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}
        </select></div>

      <div class="grid2">
        <div class="field"><label>Început</label><input class="inp" type="date" data-start value="${esc(source.start || isoDate())}"></div>
        <div class="field"><label>Zile</label><input class="inp" type="number" min="1" max="14" data-days value="${esc(source.days || 2)}"></div>
      </div>

      <div class="grid2">
        <div class="field"><label>Boxă</label>
          <select class="inp" data-bay><option value="">—</option>
            ${(cfg.bays || []).map((b) => `<option value="${esc(b.id)}"${source.bayId === b.id ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}
          </select></div>
        <div class="field"><label>Tehnician</label>
          <select class="inp" data-tech><option value="">—</option>
            ${(cfg.technicians || []).map((t) => `<option value="${esc(t.id)}"${source.technicianId === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}
          </select></div>
      </div>

      <div class="grid2">
        <div class="field"><label>Preț minim</label><input class="inp" type="number" data-min value="${esc(source.priceMin || '')}"></div>
        <div class="field"><label>Preț maxim</label><input class="inp" type="number" data-max value="${esc(source.priceMax || '')}"></div>
      </div>

      <div class="grid2">
        <div class="field"><label>Avans (lei)</label><input class="inp" type="number" data-deposit value="${esc(source.deposit || '')}"></div>
        <div class="field"><label>Avans încasat</label>
          <select class="inp" data-paid><option value="nu">Nu</option><option value="da"${source.depositPaid ? ' selected' : ''}>Da</option></select></div>
      </div>

      <div class="field"><label>Notițe</label><textarea class="inp" data-notes>${esc(source.notes || '')}</textarea></div>

      <div class="drawer__foot">
        <button class="btn btn--pri" data-save>${job ? 'Salvează' : 'Creează'}</button>
        <button class="btn" data-cancel>Renunță</button>
      </div>
    </aside>`);

  const customerSelect = drawer.querySelector('[data-customer]');
  const vehicleSelect = drawer.querySelector('[data-vehicle]');
  const packageSelect = drawer.querySelector('[data-package]');

  function fillVehicles() {
    const owned = vehicles.filter((v) => v.customerId === customerSelect.value);
    vehicleSelect.innerHTML = owned.length
      ? owned.map((v) => `<option value="${esc(v.id)}"${source.vehicleId === v.id ? ' selected' : ''}>${esc(v.make)} ${esc(v.model)} · ${esc(v.plate || '')}</option>`).join('')
      : '<option value="">— clientul nu are mașini —</option>';
  }
  customerSelect.addEventListener('change', fillVehicles);
  fillVehicles();

  // Selecting a package fills price and duration from settings, which are
  // themselves mirrored from services-data.js.
  packageSelect.addEventListener('change', () => {
    const svc = (cfg.services || []).find((s) => s.id === packageSelect.value);
    if (!svc) return;
    drawer.querySelector('[data-min]').value = svc.priceMin;
    drawer.querySelector('[data-max]').value = svc.priceMax;
    drawer.querySelector('[data-days]').value = svc.days;
    const pct = Number(cfg.depositPercent) || 30;
    drawer.querySelector('[data-deposit]').value = Math.round(((svc.priceMin + svc.priceMax) / 2) * (pct / 100));
  });

  drawer.querySelector('.drawer__x').addEventListener('click', closeDrawer);
  drawer.querySelector('[data-cancel]').addEventListener('click', closeDrawer);

  drawer.querySelector('[data-save]').addEventListener('click', async () => {
    const svc = (cfg.services || []).find((s) => s.id === packageSelect.value);
    const payload = {
      customerId: customerSelect.value,
      vehicleId: vehicleSelect.value,
      packageId: packageSelect.value,
      packageName: svc?.name || '',
      start: drawer.querySelector('[data-start]').value,
      days: Number(drawer.querySelector('[data-days]').value) || 1,
      bayId: drawer.querySelector('[data-bay]').value,
      technicianId: drawer.querySelector('[data-tech]').value,
      priceMin: Number(drawer.querySelector('[data-min]').value) || 0,
      priceMax: Number(drawer.querySelector('[data-max]').value) || 0,
      deposit: Number(drawer.querySelector('[data-deposit]').value) || 0,
      depositPaid: drawer.querySelector('[data-paid]').value === 'da',
      notes: drawer.querySelector('[data-notes]').value
    };

    if (!payload.customerId) return window.novaToast('Alege un client.', true);
    if (!payload.start) return window.novaToast('Alege data de început.', true);

    try {
      if (job) {
        await api.update('jobs', id, payload);
      } else {
        await api.create('jobs', {
          ...payload,
          status: 'nou',
          checklist: DEFAULT_CHECKLIST.map((label, i) => ({ id: `c${i}`, label, done: false }))
        });
      }
      closeDrawer();
      window.novaToast(job ? 'Lucrare salvată.' : 'Lucrare creată.');
      window.novaReload();
    } catch (err) { window.novaToast(err.message, true); }
  });

  openDrawer(drawer);
}

function repaint() {
  const main = document.getElementById('main');
  const focused = document.activeElement?.dataset?.q !== undefined;
  main.innerHTML = '';
  main.appendChild(renderJobs());
  if (focused) {
    const input = main.querySelector('[data-q]');
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }
}
