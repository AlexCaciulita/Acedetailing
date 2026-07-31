import { all, el, esc, api, fmtDate, openDrawer, closeDrawer } from '../core.js';
import { openOpportunity } from './crm-shared.js';

const SUBJECTS = {
  programare: 'Programare', pret: 'Cerere de preț', scoala: 'Școala de detailing',
  colaborare: 'Colaborare', altele: 'Altele',
  'Solicitare B2B — pilot pre-retur leasing': 'Lead B2B'
};

export function renderMessages() {
  const wrap = el('<div></div>');
  const rows = all('messages').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const unread = rows.filter((m) => !m.read).length;

  wrap.appendChild(el(`
    <div class="head"><div>
      <h1>Mesaje</h1>
      <p>${unread} necitite din ${rows.length} · din formularele Contact și Companii</p>
    </div></div>`));

  const panel = el('<div class="panel"></div>');
  if (!rows.length) {
    panel.appendChild(el('<div class="empty">Niciun mesaj încă.</div>'));
  } else {
    const table = el('<table><tbody></tbody></table>');
    for (const m of rows) {
      const row = el(`<tr class="clickable">
        <td style="width:8px">${m.read ? '' : '<span style="color:var(--bronze)">●</span>'}</td>
        <td class="mono faint nowrap">${esc(fmtDate(m.createdAt))}</td>
        <td style="${m.read ? '' : 'font-weight:600'}">${esc(m.name)}
          <div class="faint mono">${esc(m.email || '')}</div></td>
        <td><span class="tag tag--plain">${esc(SUBJECTS[m.subject] || m.subject || '—')}</span></td>
        <td class="muted">${esc(String(m.message || '').slice(0, 90))}${String(m.message || '').length > 90 ? '…' : ''}</td>
      </tr>`);
      row.addEventListener('click', () => openMessage(m));
      table.querySelector('tbody').appendChild(row);
    }
    panel.appendChild(table);
  }
  wrap.appendChild(panel);
  return wrap;
}

function openMessage(m) {
  const drawer = el(`
    <aside class="drawer">
      <div class="drawer__head">
        <div><h2>${esc(m.name)}</h2><p>${esc(fmtDate(m.createdAt))} · ${esc(SUBJECTS[m.subject] || m.subject || '')}</p></div>
        <button class="drawer__x">×</button>
      </div>
      <dl class="dl">
        <dt>Email</dt><dd class="mono">${esc(m.email || '—')}</dd>
        <dt>Telefon</dt><dd class="mono">${esc(m.phone || '—')}</dd>
      </dl>
      ${m.qualification ? `
        <div class="crm-note">
          <b>Calificare B2B primită</b>
          <p>
            Flotă: ${esc(m.qualification.fleetSize || '—')} ·
            Retururi: ${esc(m.qualification.leaseReturns || '—')} ·
            Fereastră: ${esc(m.qualification.returnWindow || '—')} ·
            Lessor: ${esc(m.qualification.lessor || '—')}
          </p>
        </div>` : ''}
      <div class="panel" style="white-space:pre-wrap">${esc(m.message || '')}</div>
      <div class="drawer__foot">
        <button class="btn btn--pri" data-pipeline>${m.convertedOpportunityId ? 'Deschide în Pipeline' : 'Adaugă în Pipeline'}</button>
        <a class="btn btn--pri" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: mesajul tău către Nova Detailing')}">Răspunde pe email</a>
        ${m.phone ? `<a class="btn" href="tel:${esc(String(m.phone).replace(/\s/g, ''))}">Sună</a>` : ''}
        <button class="btn" data-toggle>${m.read ? 'Marchează necitit' : 'Marchează citit'}</button>
        <button class="btn btn--danger" data-del>Șterge</button>
      </div>
    </aside>`);

  drawer.querySelector('.drawer__x').addEventListener('click', closeDrawer);

  drawer.querySelector('[data-pipeline]').addEventListener('click', async () => {
    try {
      if (m.convertedOpportunityId) {
        closeDrawer();
        openOpportunity(m.convertedOpportunityId);
        return;
      }
      const response = await api.messageToOpportunity(m.id);
      closeDrawer();
      window.novaToast(response.alreadyExisted ? 'Oportunitatea exista deja.' : 'Lead adăugat în Pipeline.');
      await window.novaReload();
      openOpportunity(response.item.id);
    } catch (error) {
      window.novaToast(error.message, true);
    }
  });

  drawer.querySelector('[data-toggle]').addEventListener('click', async () => {
    await api.update('messages', m.id, { read: !m.read });
    closeDrawer();
    window.novaReload();
  });

  drawer.querySelector('[data-del]').addEventListener('click', async () => {
    if (!confirm('Ștergi acest mesaj?')) return;
    await api.remove('messages', m.id);
    closeDrawer();
    window.novaReload();
  });

  openDrawer(drawer);

  // Opening it is reading it.
  if (!m.read) api.update('messages', m.id, { read: true }).catch(() => {});
}
