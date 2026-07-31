import {
  state, all, el, esc, isoDate, addDays, mondayOf, dayLabel, jobDays,
  customerName, vehicleLabel, STATUS_LABEL
} from '../core.js';
import { openJob, openJobEditor } from './jobs.js';

// Week offset persists across repaints so navigating away and back keeps place.
let weekOffset = 0;

export function renderCalendar() {
  const today = isoDate();
  const start = addDays(mondayOf(today), weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const bays = (state.data.settings?.bays || []).filter((b) => b.active !== false);

  const wrap = el('<div></div>');

  const head = el(`
    <div class="head">
      <div>
        <h1>Calendar</h1>
        <p>Săptămâna ${esc(dayLabel(days[0]).num)} – ${esc(dayLabel(days[6]).num)}</p>
      </div>
      <div class="head__act">
        <button class="btn" data-prev>‹ Anterioară</button>
        <button class="btn" data-now>Azi</button>
        <button class="btn" data-next>Următoare ›</button>
        <button class="btn btn--pri" data-add>+ Lucrare</button>
      </div>
    </div>`);
  head.querySelector('[data-prev]').addEventListener('click', () => { weekOffset -= 1; repaint(); });
  head.querySelector('[data-next]').addEventListener('click', () => { weekOffset += 1; repaint(); });
  head.querySelector('[data-now]').addEventListener('click', () => { weekOffset = 0; repaint(); });
  head.querySelector('[data-add]').addEventListener('click', () => openJobEditor(null, { start: today }));
  wrap.appendChild(head);

  if (!bays.length) {
    wrap.appendChild(el('<div class="panel"><div class="empty">Nu există boxe configurate. Adaugă-le în Setări.</div></div>'));
    return wrap;
  }

  const jobs = all('jobs').filter((j) => j.status !== 'anulat' && j.start);

  // A job renders in every day it occupies, so a 3-day job is visibly a 3-day
  // commitment rather than a single marker on its start date.
  const cellJobs = (bayId, day) =>
    jobs.filter((j) => j.bayId === bayId && jobDays(j).includes(day));

  const cal = el('<div class="cal"></div>');
  const grid = el(`<div class="cal__grid" style="grid-template-columns:150px repeat(7,minmax(120px,1fr))"></div>`);

  grid.appendChild(el('<div class="cal__cell cal__hd"></div>'));
  for (const day of days) {
    const { name, num } = dayLabel(day);
    const isToday = day === today;
    grid.appendChild(el(
      `<div class="cal__cell cal__hd${isToday ? ' cal__hd--today' : ''}">${esc(name)}<br><span class="faint">${esc(num)}</span></div>`));
  }

  for (const bay of bays) {
    grid.appendChild(el(`<div class="cal__cell cal__bay">${esc(bay.name)}</div>`));
    for (const day of days) {
      const weekend = [5, 6].includes(days.indexOf(day));
      const cell = el(`<div class="cal__cell${weekend ? ' cal__weekend' : ''}"></div>`);

      for (const job of cellJobs(bay.id, day)) {
        const span = jobDays(job);
        const isFirst = span[0] === day;
        const ev = el(`
          <button class="cal__ev cal__ev--${esc(job.status)}">
            <b>${esc(customerName(job.customerId))}</b>
            <span>${esc(isFirst ? (job.packageName || '—') : `↳ ziua ${span.indexOf(day) + 1}/${span.length}`)}</span>
          </button>`);
        ev.title = `${customerName(job.customerId)} · ${vehicleLabel(job.vehicleId)} · ${STATUS_LABEL[job.status] || job.status}`;
        ev.addEventListener('click', () => openJob(job.id));
        cell.appendChild(ev);
      }

      const add = el('<button class="cal__ev" style="opacity:.35;text-align:center">+</button>');
      add.addEventListener('click', () => openJobEditor(null, { start: day, bayId: bay.id }));
      cell.appendChild(add);

      grid.appendChild(cell);
    }
  }

  cal.appendChild(grid);
  wrap.appendChild(el('<div class="panel"></div>')).appendChild(cal);
  return wrap;
}

function repaint() {
  const main = document.getElementById('main');
  main.innerHTML = '';
  main.appendChild(renderCalendar());
}
