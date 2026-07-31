import {
  state, all, el, esc, api, isoDate, jobDays, fmtMoney, fmtDate,
  customerName, vehicleLabel, bayName, STATUS_LABEL
} from '../core.js';
import { openJob } from './jobs.js';
import { openOpportunity } from './crm-shared.js';

export function renderOverview() {
  const s = state.stats;
  const today = isoDate();
  const wrap = el('<div></div>');

  wrap.appendChild(el(`
    <div class="head">
      <div>
        <h1>Sumar</h1>
        <p>${esc(fmtDate(today))} · ${esc(state.data.settings?.bays?.filter((b) => !b.curing).length || 0)} boxe de lucru</p>
      </div>
    </div>`));

  if (all('customers').some((c) => c.demo)) {
    const banner = el(`
      <div class="banner banner--demo">
        <span>Panoul conține date demonstrative. Șterge-le înainte de a începe utilizarea reală.</span>
        <button class="btn btn--sm">Șterge datele demo</button>
      </div>`);
    banner.querySelector('button').addEventListener('click', async () => {
      if (!confirm('Ștergi toate datele (inclusiv cele demo)? Acțiunea nu poate fi anulată.')) return;
      await api.clearDemo();
      window.novaToast('Datele au fost șterse.');
      window.novaReload();
    });
    wrap.appendChild(banner);
  }

  if (state.conflicts.length) {
    wrap.appendChild(el(`
      <div class="banner banner--warn">
        <span><b>${state.conflicts.length}</b> suprapunere(i) în calendar: două lucrări ocupă aceeași boxă în aceeași zi.</span>
      </div>`));
  }

  const util = Number(s.utilisation) || 0;
  const utilTone = util >= 85 ? 'bad' : util >= 60 ? 'good' : 'warn';

  wrap.appendChild(el(`
    <div class="kpis">
      <div class="kpi"><div class="kpi__l">Azi în atelier</div><div class="kpi__v">${s.jobsToday || 0}</div>
        <div class="kpi__s">${s.jobsOpen || 0} lucrări deschise</div></div>
      <div class="kpi kpi--${utilTone}"><div class="kpi__l">Ocupare săptămână</div><div class="kpi__v">${util}%</div>
        <div class="kpi__s">${s.occupiedThisWeek || 0} / ${s.weekCapacity || 0} zile-boxă</div>
        <div class="bar"><div class="bar__f bar__f--${utilTone}" style="width:${Math.min(100, util)}%"></div></div></div>
      <div class="kpi"><div class="kpi__l">Încasări luna asta</div><div class="kpi__v">${esc(fmtMoney(s.monthRevenue))}</div>
        <div class="kpi__s">${s.monthBayDays || 0} zile-boxă folosite</div></div>
      <div class="kpi"><div class="kpi__l">Randament / zi-boxă</div><div class="kpi__v">${esc(fmtMoney(s.revenuePerBayDay))}</div>
        <div class="kpi__s">indicatorul care contează</div></div>
      <div class="kpi"><div class="kpi__l">De procesat</div><div class="kpi__v">${(s.newBookings || 0) + (s.unreadMessages || 0)}</div>
        <div class="kpi__s">${s.newBookings || 0} rezervări · ${s.unreadMessages || 0} mesaje</div></div>
      <div class="kpi"><div class="kpi__l">Pipeline B2B ponderat</div><div class="kpi__v">${esc(fmtMoney(s.crm?.weightedValue || 0))}</div>
        <div class="kpi__s">${s.crm?.active || 0} oportunități active</div></div>
      <div class="kpi ${(s.crm?.overdue || 0) > 0 ? 'kpi--bad' : 'kpi--good'}"><div class="kpi__l">Follow-up B2B</div><div class="kpi__v">${s.crm?.overdue || 0}</div>
        <div class="kpi__s">${s.crm?.dueToday || 0} scad astăzi</div></div>
    </div>`));

  // Today's board
  const todayJobs = all('jobs')
    .filter((j) => j.status !== 'anulat' && jobDays(j).includes(today))
    .sort((a, b) => (a.bayId || '').localeCompare(b.bayId || ''));

  const board = el('<div class="panel"><div class="panel__t">În atelier azi</div></div>');
  if (!todayJobs.length) {
    board.appendChild(el('<div class="empty">Nicio lucrare programată azi.</div>'));
  } else {
    const table = el(`<table><thead><tr>
      <th>Client</th><th>Mașină</th><th>Pachet</th><th>Boxă</th><th>Status</th>
      <th class="num">Zi</th><th class="num">Checklist</th></tr></thead><tbody></tbody></table>`);
    for (const job of todayJobs) {
      const days = jobDays(job);
      const dayNo = days.indexOf(today) + 1;
      const done = (job.checklist || []).filter((c) => c.done).length;
      const total = (job.checklist || []).length;
      const row = el(`<tr class="clickable">
        <td>${esc(customerName(job.customerId))}</td>
        <td class="muted">${esc(vehicleLabel(job.vehicleId))}</td>
        <td>${esc(job.packageName || '—')}</td>
        <td class="muted">${esc(bayName(job.bayId))}</td>
        <td><span class="tag tag--${esc(job.status)}">${esc(STATUS_LABEL[job.status] || job.status)}</span></td>
        <td class="num mono">${dayNo}/${days.length}</td>
        <td class="num mono">${total ? `${done}/${total}` : '—'}</td>
      </tr>`);
      row.addEventListener('click', () => openJob(job.id));
      table.querySelector('tbody').appendChild(row);
    }
    board.appendChild(table);
  }
  wrap.appendChild(board);

  const b2bDue = all('opportunities')
    .filter((opportunity) =>
      opportunity.nextActionDate &&
      opportunity.nextActionDate <= today &&
      !['castigat', 'pierdut', 'nurture'].includes(opportunity.stage)
    )
    .sort((a, b) => a.nextActionDate.localeCompare(b.nextActionDate))
    .slice(0, 6);
  const b2bPanel = el('<div class="panel"><div class="panel__t">Follow-up B2B de făcut</div></div>');
  if (!b2bDue.length) {
    b2bPanel.appendChild(el('<div class="empty">Niciun follow-up B2B scadent.</div>'));
  } else {
    const table = el('<table><tbody></tbody></table>');
    for (const opportunity of b2bDue) {
      const row = el(`<tr class="clickable">
        <td><b>${esc(opportunity.company)}</b><div class="faint">${esc(opportunity.contactName || opportunity.targetRole || 'Contact neidentificat')}</div></td>
        <td>${esc(opportunity.nextStep || 'Fără next step')}</td>
        <td class="mono nowrap" style="${opportunity.nextActionDate < today ? 'color:var(--red)' : ''}">${esc(fmtDate(opportunity.nextActionDate))}</td>
      </tr>`);
      row.addEventListener('click', () => openOpportunity(opportunity.id));
      table.querySelector('tbody').appendChild(row);
    }
    b2bPanel.appendChild(table);
  }
  wrap.appendChild(b2bPanel);

  // Upcoming
  const upcoming = all('jobs')
    .filter((j) => j.status !== 'anulat' && j.start > today)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 6);

  const next = el('<div class="panel"><div class="panel__t">Urmează</div></div>');
  if (!upcoming.length) {
    next.appendChild(el('<div class="empty">Nimic programat în perioada următoare.</div>'));
  } else {
    const table = el('<table><tbody></tbody></table>');
    for (const job of upcoming) {
      const row = el(`<tr class="clickable">
        <td class="mono nowrap" style="width:96px">${esc(fmtDate(job.start))}</td>
        <td>${esc(customerName(job.customerId))}<div class="faint">${esc(vehicleLabel(job.vehicleId))}</div></td>
        <td>${esc(job.packageName || '—')}</td>
        <td><span class="tag tag--${esc(job.status)}">${esc(STATUS_LABEL[job.status] || job.status)}</span></td>
        <td class="num mono">${esc(fmtMoney((Number(job.priceMin) + Number(job.priceMax)) / 2 || 0))}</td>
      </tr>`);
      row.addEventListener('click', () => openJob(job.id));
      table.querySelector('tbody').appendChild(row);
    }
    next.appendChild(table);
  }
  wrap.appendChild(next);

  return wrap;
}
