/* The view that operationalises the strategy work: which packages actually earn
   their place in a bay, and where capacity is going. */

import { state, all, el, esc, fmtMoney, jobPriceMid, isoDate, jobDays, customerName } from '../core.js';

export function renderAnalytics() {
  const wrap = el('<div></div>');
  const s = state.stats;
  const jobs = all('jobs').filter((j) => j.status !== 'anulat');

  wrap.appendChild(el(`
    <div class="head"><div>
      <h1>Analiză</h1>
      <p>Randamentul pe zi-boxă este indicatorul care decide ce merită programat.</p>
    </div></div>`));

  const byPackage = Object.entries(s.byPackage || {})
    .sort((a, b) => b[1].perBayDay - a[1].perBayDay);
  const best = byPackage[0]?.[1]?.perBayDay || 0;

  const yieldPanel = el(`
    <div class="panel">
      <div class="panel__t">Randament pe zi-boxă, pe pachet</div>
      <p class="muted" style="margin:-6px 0 14px;font-size:.85rem">
        Calculat din lucrările înregistrate: valoarea medie împărțită la zilele de boxă ocupate.
      </p>
    </div>`);

  if (!byPackage.length) {
    yieldPanel.appendChild(el('<div class="empty">Nu există încă lucrări din care să calculăm.</div>'));
  } else {
    const table = el(`<table><thead><tr>
      <th>Pachet</th><th class="num">Lucrări</th><th class="num">Zile-boxă</th>
      <th class="num">Încasat</th><th class="num">Lei / zi-boxă</th><th style="width:150px"></th>
    </tr></thead><tbody></tbody></table>`);
    for (const [name, d] of byPackage) {
      const pct = best ? Math.round((d.perBayDay / best) * 100) : 0;
      const tone = pct >= 85 ? 'good' : pct >= 60 ? '' : 'bad';
      table.querySelector('tbody').appendChild(el(`<tr>
        <td>${esc(name)}</td>
        <td class="num mono">${d.count}</td>
        <td class="num mono">${d.days}</td>
        <td class="num mono">${esc(fmtMoney(d.revenue))}</td>
        <td class="num mono" style="font-weight:600">${esc(fmtMoney(d.perBayDay))}</td>
        <td><div class="bar"><div class="bar__f ${tone ? `bar__f--${tone}` : ''}" style="width:${pct}%"></div></div></td>
      </tr>`));
    }
    yieldPanel.appendChild(table);
  }
  wrap.appendChild(yieldPanel);

  // Six-month trend
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const RO_MONTH = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const monthly = months.map((m) => {
    const inMonth = jobs.filter((j) => (j.start || '').startsWith(m));
    const revenue = inMonth.reduce((sum, j) => sum + jobPriceMid(j), 0);
    const days = inMonth.reduce((sum, j) => sum + (Number(j.days) || 1), 0);
    return { m, label: `${RO_MONTH[Number(m.slice(5)) - 1]} ${m.slice(2, 4)}`, count: inMonth.length, revenue, days };
  });
  const peak = Math.max(1, ...monthly.map((x) => x.revenue));

  const trend = el('<div class="panel"><div class="panel__t">Ultimele 6 luni</div></div>');
  const trendTable = el(`<table><thead><tr>
    <th>Luna</th><th class="num">Lucrări</th><th class="num">Zile-boxă</th>
    <th class="num">Încasat</th><th class="num">Lei/zi-boxă</th><th style="width:170px"></th>
  </tr></thead><tbody></tbody></table>`);
  for (const row of monthly) {
    trendTable.querySelector('tbody').appendChild(el(`<tr>
      <td class="mono">${esc(row.label)}</td>
      <td class="num mono">${row.count}</td>
      <td class="num mono">${row.days}</td>
      <td class="num mono">${esc(fmtMoney(row.revenue))}</td>
      <td class="num mono">${row.days ? esc(fmtMoney(row.revenue / row.days)) : '—'}</td>
      <td><div class="bar"><div class="bar__f" style="width:${Math.round((row.revenue / peak) * 100)}%"></div></div></td>
    </tr>`));
  }
  trend.appendChild(trendTable);
  wrap.appendChild(trend);

  // Top customers
  const totals = new Map();
  for (const j of jobs) {
    if (!j.customerId) continue;
    totals.set(j.customerId, (totals.get(j.customerId) || 0) + jobPriceMid(j));
  }
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const clients = el('<div class="panel"><div class="panel__t">Clienți după valoare</div></div>');
  if (!top.length) {
    clients.appendChild(el('<div class="empty">Fără date.</div>'));
  } else {
    const max = top[0][1];
    const table = el('<table><tbody></tbody></table>');
    for (const [id, total] of top) {
      table.querySelector('tbody').appendChild(el(`<tr>
        <td>${esc(customerName(id))}</td>
        <td class="num mono">${esc(fmtMoney(total))}</td>
        <td style="width:170px"><div class="bar"><div class="bar__f" style="width:${Math.round((total / max) * 100)}%"></div></div></td>
      </tr>`));
    }
    clients.appendChild(table);
  }
  wrap.appendChild(clients);

  // Deposits outstanding — money already earned but not collected.
  const owed = all('jobs').filter((j) => j.deposit && !j.depositPaid && j.status !== 'anulat');
  if (owed.length) {
    const total = owed.reduce((s2, j) => s2 + Number(j.deposit), 0);
    const panel = el(`<div class="panel"><div class="panel__t">Avansuri neîncasate <span class="faint mono">${esc(fmtMoney(total))}</span></div></div>`);
    const table = el('<table><tbody></tbody></table>');
    for (const j of owed) {
      table.querySelector('tbody').appendChild(el(`<tr>
        <td>${esc(customerName(j.customerId))}</td>
        <td class="muted">${esc(j.packageName || '—')}</td>
        <td class="num mono" style="color:var(--red)">${esc(fmtMoney(j.deposit))}</td>
      </tr>`));
    }
    panel.appendChild(table);
    wrap.appendChild(panel);
  }

  return wrap;
}
