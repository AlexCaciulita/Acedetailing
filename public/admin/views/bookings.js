import { all, el, esc, api, fmtDate, openDrawer, closeDrawer } from '../core.js';
import { openJobEditor } from './jobs.js';

export function renderBookings() {
  const wrap = el('<div></div>');
  const rows = all('bookings').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const pending = rows.filter((b) => b.status !== 'procesat').length;

  wrap.appendChild(el(`
    <div class="head"><div>
      <h1>Rezervări din site</h1>
      <p>${pending} neprocesate din ${rows.length} în total · sosesc din formularul de pe /rezervare.html</p>
    </div></div>`));

  const panel = el('<div class="panel"></div>');
  if (!rows.length) {
    panel.appendChild(el('<div class="empty">Nicio rezervare încă. Trimiterile din site apar automat aici.</div>'));
  } else {
    const table = el(`<table><thead><tr>
      <th>Primită</th><th>Client</th><th>Mașină</th><th>Pachet</th><th>Data dorită</th>
      <th class="num">Estimare</th><th>Status</th></tr></thead><tbody></tbody></table>`);
    for (const b of rows) {
      const row = el(`<tr class="clickable">
        <td class="mono nowrap faint">${esc(fmtDate(b.createdAt))}</td>
        <td>${esc(b.name)}<div class="faint mono">${esc(b.phone || '')}</div></td>
        <td class="muted">${esc(b.carModel || '—')}<div class="faint">${esc(b.sizeLabel || '')}</div></td>
        <td>${esc(b.packageName || '—')}</td>
        <td class="mono nowrap">${esc(fmtDate(b.date))} ${esc(b.time || '')}</td>
        <td class="num mono">${esc(b.priceText || '—')}</td>
        <td><span class="tag tag--${b.status === 'procesat' ? 'livrat' : 'nou'}">${b.status === 'procesat' ? 'Procesată' : 'Nouă'}</span></td>
      </tr>`);
      row.addEventListener('click', () => openBooking(b));
      table.querySelector('tbody').appendChild(row);
    }
    panel.appendChild(table);
  }
  wrap.appendChild(panel);
  return wrap;
}

function openBooking(b) {
  const drawer = el(`
    <aside class="drawer">
      <div class="drawer__head">
        <div><h2>${esc(b.name)}</h2><p>Rezervare din site · ${esc(fmtDate(b.createdAt))}</p></div>
        <button class="drawer__x" aria-label="Închide">×</button>
      </div>
      <dl class="dl">
        <dt>Telefon</dt><dd class="mono">${esc(b.phone || '—')}</dd>
        <dt>Email</dt><dd class="mono">${esc(b.email || '—')}</dd>
        <dt>Mașină</dt><dd>${esc(b.carModel || '—')}</dd>
        <dt>Clasă</dt><dd>${esc(b.sizeLabel || '—')}</dd>
        <dt>Stare</dt><dd>${esc(b.conditionLabel || '—')}</dd>
        <dt>Pachet</dt><dd>${esc(b.packageName || '—')}</dd>
        <dt>Add-on-uri</dt><dd>${esc((b.addonNames || []).join(', ') || '—')}</dd>
        <dt>Data dorită</dt><dd>${esc(fmtDate(b.date))} ${esc(b.time || '')}</dd>
        <dt>Estimare</dt><dd>${esc(b.priceText || '—')}</dd>
      </dl>
      ${b.notes ? `<div class="field"><label>Notițe client</label><div class="panel" style="margin:0">${esc(b.notes)}</div></div>` : ''}
      <div class="drawer__foot">
        <button class="btn btn--pri" data-convert>Creează client + lucrare</button>
        <button class="btn" data-done>Marchează procesată</button>
      </div>
    </aside>`);

  drawer.querySelector('.drawer__x').addEventListener('click', closeDrawer);

  // Creates the customer and vehicle from the submission, then opens the job
  // editor pre-filled — the whole point of an inbox is not retyping.
  drawer.querySelector('[data-convert]').addEventListener('click', async () => {
    try {
      const existing = all('customers').find(
        (c) => (c.email && c.email === b.email) || (c.phone && c.phone === b.phone));
      const customer = existing || (await api.create('customers', {
        name: b.name, phone: b.phone, email: b.email, type: 'persoana', tags: [], notes: 'Creat din rezervare online'
      })).item;

      const [make, ...rest] = String(b.carModel || '').trim().split(' ');
      const vehicle = (await api.create('vehicles', {
        customerId: customer.id,
        make: make || 'Nespecificat',
        model: rest.join(' ') || '',
        class: (b.sizeLabel || '').toLowerCase().includes('suv') ? 'suv' : 'mare',
        notes: `Din rezervare: ${b.sizeLabel || ''}`
      })).item;

      await api.update('bookings', b.id, { status: 'procesat' });
      closeDrawer();
      await window.novaReload();
      openJobEditor(null, {
        customerId: customer.id,
        vehicleId: vehicle.id,
        start: (b.date || '').slice(0, 10),
        notes: b.notes || ''
      });
    } catch (err) { window.novaToast(err.message, true); }
  });

  drawer.querySelector('[data-done]').addEventListener('click', async () => {
    await api.update('bookings', b.id, { status: 'procesat' });
    closeDrawer();
    window.novaToast('Marcată ca procesată.');
    window.novaReload();
  });

  openDrawer(drawer);
}
