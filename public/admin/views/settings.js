import { state, all, el, esc, api, fmtMoney } from '../core.js';

export function renderSettings() {
  const wrap = el('<div></div>');
  const cfg = JSON.parse(JSON.stringify(state.data.settings || {}));

  wrap.appendChild(el(`
    <div class="head"><div>
      <h1>Setări</h1>
      <p>Boxele și tehnicienii definesc capacitatea. Serviciile sunt oglindite din services-data.js.</p>
    </div></div>`));

  /* bays */
  const bays = el('<div class="panel"><div class="panel__t">Boxe <button class="btn btn--sm" data-add>+ Adaugă</button></div><div data-list></div></div>');
  const baysList = bays.querySelector('[data-list]');
  const drawBays = () => {
    baysList.innerHTML = '';
    (cfg.bays || []).forEach((b, i) => {
      const row = el(`<div class="check">
        <input type="checkbox"${b.active !== false ? ' checked' : ''} title="Activă">
        <input class="inp" value="${esc(b.name)}" style="flex:1">
        <label class="row faint" style="font-size:.76rem;gap:5px">
          <input type="checkbox" data-curing${b.curing ? ' checked' : ''}> priză/uscare
        </label>
        <button class="btn btn--sm btn--ghost" data-del>×</button>
      </div>`);
      const [activeBox, curingBox] = row.querySelectorAll('input[type=checkbox]');
      activeBox.addEventListener('change', (e) => { cfg.bays[i].active = e.target.checked; });
      curingBox.addEventListener('change', (e) => { cfg.bays[i].curing = e.target.checked; });
      row.querySelector('.inp').addEventListener('input', (e) => { cfg.bays[i].name = e.target.value; });
      row.querySelector('[data-del]').addEventListener('click', () => { cfg.bays.splice(i, 1); drawBays(); });
      baysList.appendChild(row);
    });
    if (!cfg.bays?.length) baysList.appendChild(el('<div class="empty">Nicio boxă. Fără boxe, calendarul e gol.</div>'));
  };
  bays.querySelector('[data-add]').addEventListener('click', () => {
    cfg.bays = cfg.bays || [];
    cfg.bays.push({ id: `bay${Date.now().toString(36)}`, name: `Boxa ${cfg.bays.length + 1}`, active: true });
    drawBays();
  });
  drawBays();
  wrap.appendChild(bays);

  /* technicians */
  const techs = el('<div class="panel"><div class="panel__t">Tehnicieni <button class="btn btn--sm" data-add>+ Adaugă</button></div><div data-list></div></div>');
  const techList = techs.querySelector('[data-list]');
  const drawTechs = () => {
    techList.innerHTML = '';
    (cfg.technicians || []).forEach((t, i) => {
      const row = el(`<div class="check">
        <input type="checkbox"${t.active !== false ? ' checked' : ''} title="Activ">
        <input class="inp" value="${esc(t.name)}" style="flex:1">
        <button class="btn btn--sm btn--ghost" data-del>×</button>
      </div>`);
      row.querySelector('input[type=checkbox]').addEventListener('change', (e) => { cfg.technicians[i].active = e.target.checked; });
      row.querySelector('.inp').addEventListener('input', (e) => { cfg.technicians[i].name = e.target.value; });
      row.querySelector('[data-del]').addEventListener('click', () => { cfg.technicians.splice(i, 1); drawTechs(); });
      techList.appendChild(row);
    });
    if (!cfg.technicians?.length) techList.appendChild(el('<div class="empty">Niciun tehnician.</div>'));
  };
  techs.querySelector('[data-add]').addEventListener('click', () => {
    cfg.technicians = cfg.technicians || [];
    cfg.technicians.push({ id: `teh${Date.now().toString(36)}`, name: 'Tehnician nou', active: true });
    drawTechs();
  });
  drawTechs();
  wrap.appendChild(techs);

  /* deposit */
  const deposit = el(`
    <div class="panel">
      <div class="panel__t">Avans</div>
      <div class="field" style="max-width:220px">
        <label>Procent avans la rezervare</label>
        <input class="inp" type="number" min="0" max="100" data-pct value="${esc(cfg.depositPercent ?? 30)}">
      </div>
    </div>`);
  deposit.querySelector('[data-pct]').addEventListener('input', (e) => { cfg.depositPercent = Number(e.target.value) || 0; });
  wrap.appendChild(deposit);

  /* services, read-only */
  const services = el(`
    <div class="panel">
      <div class="panel__t">Servicii</div>
      <p class="muted" style="margin:-6px 0 12px;font-size:.85rem">
        Oglindite din <span class="mono">public/services-data.js</span>, ca panoul și site-ul să nu poată ajunge
        să spună prețuri diferite. Modifică-le acolo.
      </p>
    </div>`);
  const svcTable = el('<table><thead><tr><th>Pachet</th><th class="num">Preț</th><th class="num">Zile</th></tr></thead><tbody></tbody></table>');
  for (const s of cfg.services || []) {
    svcTable.querySelector('tbody').appendChild(el(`<tr>
      <td>${esc(s.name)}</td>
      <td class="num mono">${esc(fmtMoney(s.priceMin))} – ${esc(fmtMoney(s.priceMax))}</td>
      <td class="num mono">${esc(s.days)}</td>
    </tr>`));
  }
  services.appendChild(svcTable);
  wrap.appendChild(services);

  /* CRM targets */
  cfg.crmTargets = cfg.crmTargets || {
    weeklyTouches: 30,
    weeklyNewAccounts: 10,
    monthlyDiscoveries: 5,
    monthlyOffers: 3,
    monthlyPilots: 1,
    minimumContribution: 55,
    firstClientDays: 45
  };
  const crm = el(`
    <div class="panel">
      <div class="panel__t">Ținte CRM B2B</div>
      <p class="muted" style="margin:-6px 0 14px;font-size:.85rem">
        Pragurile recomandate pentru primele 30–45 de zile. Dashboardul CRM le urmărește automat.
      </p>
      <div class="grid2">
        <div class="field"><label>Atingeri / săptămână</label><input class="inp" type="number" min="0" data-crm="weeklyTouches" value="${esc(cfg.crmTargets.weeklyTouches)}"></div>
        <div class="field"><label>Conturi noi / săptămână</label><input class="inp" type="number" min="0" data-crm="weeklyNewAccounts" value="${esc(cfg.crmTargets.weeklyNewAccounts)}"></div>
        <div class="field"><label>Discovery / lună</label><input class="inp" type="number" min="0" data-crm="monthlyDiscoveries" value="${esc(cfg.crmTargets.monthlyDiscoveries)}"></div>
        <div class="field"><label>Oferte / lună</label><input class="inp" type="number" min="0" data-crm="monthlyOffers" value="${esc(cfg.crmTargets.monthlyOffers)}"></div>
        <div class="field"><label>Piloți / lună</label><input class="inp" type="number" min="0" data-crm="monthlyPilots" value="${esc(cfg.crmTargets.monthlyPilots)}"></div>
        <div class="field"><label>Contribuție minimă pilot, %</label><input class="inp" type="number" min="0" max="100" data-crm="minimumContribution" value="${esc(cfg.crmTargets.minimumContribution)}"></div>
        <div class="field"><label>Țintă primul client, zile</label><input class="inp" type="number" min="1" data-crm="firstClientDays" value="${esc(cfg.crmTargets.firstClientDays)}"></div>
      </div>
    </div>`);
  crm.querySelectorAll('[data-crm]').forEach((input) => {
    input.addEventListener('input', () => {
      cfg.crmTargets[input.dataset.crm] = Math.max(0, Number(input.value) || 0);
    });
  });
  wrap.appendChild(crm);

  /* save + data tools */
  const actions = el(`
    <div class="panel">
      <div class="row">
        <button class="btn btn--pri" data-save>Salvează setările</button>
        <button class="btn" data-seed>Încarcă date demo</button>
        <button class="btn btn--danger" data-clear>Șterge toate datele</button>
      </div>
      <p class="faint" style="margin:12px 0 0;font-size:.8rem">
        „Șterge toate datele” golește clienți, mașini, lucrări, sarcini, rezervări, mesaje, stocuri,
        oportunități și activități CRM.
        Setările și fișele de finisaj nu sunt afectate.
      </p>
    </div>`);

  actions.querySelector('[data-save]').addEventListener('click', async () => {
    try {
      await api.saveSettings(cfg);
      window.novaToast('Setări salvate.');
      window.novaReload();
    } catch (err) { window.novaToast(err.message, true); }
  });

  actions.querySelector('[data-seed]').addEventListener('click', async () => {
    if (all('jobs').length && !confirm('Datele existente vor fi înlocuite cu setul demo. Continui?')) return;
    await api.seed();
    window.novaToast('Date demo încărcate.');
    window.novaReload();
  });

  actions.querySelector('[data-clear]').addEventListener('click', async () => {
    if (!confirm('Ștergi TOATE datele operaționale? Acțiunea nu poate fi anulată.')) return;
    await api.clearDemo();
    window.novaToast('Date șterse.');
    window.novaReload();
  });

  wrap.appendChild(actions);
  return wrap;
}
