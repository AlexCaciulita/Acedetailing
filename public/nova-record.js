/* Cartea de Finisaj — resolves a public record code and renders the document. */

import { qrSvg } from './nova-qr.js';

const stateEl = document.querySelector('[data-state]');
const docEl = document.querySelector('[data-doc]');

const dateFmt = new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' });
const numFmt = new Intl.NumberFormat('ro-RO');

// Records will eventually be filled in by technicians, so nothing interpolated
// below is trusted even though today it comes from our own JSON.
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const fmtDate = (iso) => {
    const parsed = new Date(`${iso}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? esc(iso) : dateFmt.format(parsed);
};

const fmtNum = (value, decimals = 0) =>
    Number.isFinite(value) ? value.toLocaleString('ro-RO', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }) : '—';

/* ── Panel map geometry ──────────────────────────────────────────────────
   Top-down schematic, nose up — the layout used by damage diagrams, where the
   side panels are folded flat so all eleven are visible at once. */
const PANEL_GEOMETRY = {
    'capota':   { x: 62,  y: 38,  w: 116, h: 92,  rx: 10 },
    'plafon':   { x: 64,  y: 178, w: 112, h: 122, rx: 8 },
    'haion':    { x: 62,  y: 344, w: 116, h: 86,  rx: 10 },
    'aripa-fs': { x: 16,  y: 42,  w: 42,  h: 96,  rx: 8 },
    'aripa-fd': { x: 182, y: 42,  w: 42,  h: 96,  rx: 8 },
    'usa-fs':   { x: 16,  y: 160, w: 42,  h: 84,  rx: 6 },
    'usa-fd':   { x: 182, y: 160, w: 42,  h: 84,  rx: 6 },
    'usa-ss':   { x: 16,  y: 248, w: 42,  h: 80,  rx: 6 },
    'usa-sd':   { x: 182, y: 248, w: 42,  h: 80,  rx: 6 },
    'aripa-ss': { x: 16,  y: 332, w: 42,  h: 96,  rx: 8 },
    'aripa-sd': { x: 182, y: 332, w: 42,  h: 96,  rx: 8 }
};

const STATE_LABEL = {
    original: 'Original',
    revopsit: 'Revopsit',
    reparat: 'Chit / reparat'
};

function panelMapSvg(panels) {
    const shapes = panels.map((panel) => {
        const g = PANEL_GEOMETRY[panel.id];
        if (!g) return '';
        const cls = `rec-panel-shape rec-panel-shape--${esc(panel.state)}`;
        return `
            <g>
                <title>${esc(panel.name)}: ${esc(panel.total)} µm — ${esc(STATE_LABEL[panel.state] || panel.state)}</title>
                <rect class="${cls}" x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="${g.rx}"/>
                <text class="rec-panel-value" x="${g.x + g.w / 2}" y="${g.y + g.h / 2}">${esc(panel.total)}</text>
            </g>`;
    }).join('');

    return `
        <svg class="rec-map__svg" viewBox="0 0 240 470" role="img"
             aria-label="Schemă a vehiculului cu grosimea vopselei în micrometri pentru fiecare panou. Valorile complete sunt în tabelul alăturat.">
            <!-- Body silhouette, sized to contain every panel rect -->
            <path d="M10 66 C10 34 52 14 120 14 C188 14 230 34 230 66 L230 402 C230 438 190 456 120 456 C50 456 10 438 10 402 Z"
                  fill="#ffffff" stroke="rgba(26,26,26,0.18)" stroke-width="1.5"/>
            <!-- Glass, for orientation only — not measured -->
            <path d="M70 134 L170 134 L176 172 L64 172 Z" fill="rgba(26,26,26,0.07)"/>
            <path d="M66 306 L174 306 L168 340 L72 340 Z" fill="rgba(26,26,26,0.07)"/>
            ${shapes}
        </svg>`;
}

/* ── Sections ────────────────────────────────────────────────────────────── */

function identitySection(record) {
    const v = record.vehicle;
    const lastKm = record.odometerLog?.[record.odometerLog.length - 1];
    const repaired = record.panels.filter((p) => p.state !== 'original').length;

    return `
        <section class="rec-section">
            <div class="rec-id">
                <div>
                    <h1 class="rec-id__vehicle">${esc(v.make)} ${esc(v.model)}</h1>
                    <p class="rec-id__sub">
                        ${esc(v.generation)} · ${esc(v.year)} · ${esc(v.colorName)} (cod ${esc(v.colorCode)})
                    </p>
                    <span class="rec-badge ${repaired ? 'rec-badge--warn' : 'rec-badge--ok'}">
                        ${repaired
                            ? `${repaired} ${repaired === 1 ? 'panou cu intervenție' : 'panouri cu intervenție'}`
                            : 'Toate panourile originale'}
                    </span>
                </div>
                <dl class="rec-id__code">
                    <dt>Cod fișă</dt>
                    <dd>${esc(record.code)}</dd>
                </dl>
            </div>

            <dl class="rec-meta">
                <div class="rec-meta__wide"><dt>Serie șasiu</dt><dd>${esc(record.vinMasked)}</dd></div>
                <div><dt>Fișă deschisă</dt><dd>${fmtDate(record.openedOn)}</dd></div>
                <div><dt>Ultima actualizare</dt><dd>${fmtDate(record.lastUpdated)}</dd></div>
                <div><dt>Kilometraj la ultima vizită</dt><dd>${lastKm ? `${numFmt.format(lastKm.km)} km` : '—'}</dd></div>
                <div><dt>Atelier emitent</dt><dd>${esc(record.issuedBy.atelier)}</dd></div>
                <div><dt>Cod atelier</dt><dd>${esc(record.issuedBy.certId)}</dd></div>
            </dl>
        </section>`;
}

function budgetSection(record) {
    const c = record.clearcoat;
    const total = c.originalAvg;
    const pct = (value) => `${((value / total) * 100).toFixed(2)}%`;

    const reserve = c.safetyFloor;
    const budget = c.remainingAvg - c.safetyFloor;
    const used = c.removedTotal;

    const lowOnBudget = c.estimatedCorrectionsLeft <= 1;

    return `
        <section class="rec-section">
            <h2>Bugetul de lac</h2>
            <p class="rec-lede">
                Stratul de lac este o resursă finită: fiecare corecție îndepărtează câțiva micrometri
                și nu se poate reface fără revopsire. Aceasta este cantitatea rămasă.
            </p>

            <div class="rec-budget__headline">
                <span class="rec-budget__value">${fmtNum(c.remainingAvg, 1)}</span>
                <span class="rec-budget__unit">µm rămași din ${fmtNum(total, 0)} µm inițiali</span>
            </div>
            <p class="rec-budget__verdict">
                Peste pragul de siguranță de ${fmtNum(c.safetyFloor, 0)} µm mai există
                <strong>${fmtNum(budget, 1)} µm</strong> utilizabili —
                aproximativ <strong>${esc(c.estimatedCorrectionsLeft)}
                ${c.estimatedCorrectionsLeft === 1 ? 'corecție' : 'corecții'}</strong> în condiții normale.
                ${lowOnBudget
                    ? 'La acest nivel, orice corecție suplimentară trebuie discutată în avans.'
                    : ''}
            </p>

            <div class="rec-bar" role="img"
                 aria-label="Din ${fmtNum(total, 0)} micrometri inițiali: ${fmtNum(reserve, 0)} sunt rezervă de protecție UV, ${fmtNum(budget, 1)} sunt buget disponibil, ${fmtNum(used, 1)} au fost consumați.">
                <div class="rec-bar__seg rec-bar__seg--reserve" style="width:${pct(reserve)}">${fmtNum(reserve, 0)} µm</div>
                <div class="rec-bar__seg rec-bar__seg--budget"  style="width:${pct(budget)}">${fmtNum(budget, 1)} µm</div>
                <div class="rec-bar__seg rec-bar__seg--used"    style="width:${pct(used)}">${fmtNum(used, 1)} µm</div>
            </div>

            <ul class="rec-bar-key">
                <li><span class="rec-swatch rec-swatch--reserve"></span>Rezervă de protecție UV — intangibilă</li>
                <li><span class="rec-swatch rec-swatch--budget"></span>Buget disponibil</li>
                <li><span class="rec-swatch rec-swatch--used"></span>Consumat până acum</li>
            </ul>

            <table class="rec-table" style="margin-top:22px">
                <caption>Consum înregistrat</caption>
                <thead>
                    <tr><th scope="col">Data</th><th scope="col">Intervenție</th><th scope="col">Îndepărtat</th><th scope="col">Rămas</th></tr>
                </thead>
                <tbody>
                    ${c.history.map((h) => `
                        <tr>
                            <td class="rec-num">${fmtDate(h.date)}</td>
                            <td>${esc(h.event)}</td>
                            <td class="rec-num">−${fmtNum(h.removed, 1)} µm</td>
                            <td class="rec-num">${fmtNum(h.remaining, 1)} µm</td>
                        </tr>`).join('')}
                </tbody>
            </table>

            <p class="rec-note"><strong>Metodă.</strong> ${esc(c.method)} Măsurat pe ${esc(c.measuredAt)}.</p>
        </section>`;
}

function mapSection(record) {
    const ref = record.oemReference;

    return `
        <section class="rec-section">
            <h2>Grosimea vopselei, panou cu panou</h2>
            <p class="rec-lede">
                Interval de fabricație pentru acest model: ${esc(ref.min)}–${esc(ref.max)} ${esc(ref.unit)}.
                Valorile peste interval indică straturi adăugate ulterior.
            </p>

            <div class="rec-map">
                <figure class="rec-map__figure">
                    ${panelMapSvg(record.panels)}
                    <figcaption class="rec-map__caption">Vedere de sus · valori în µm</figcaption>
                </figure>

                <div>
                    <table class="rec-table">
                        <caption>Măsurători</caption>
                        <thead>
                            <tr>
                                <th scope="col">Panou</th>
                                <th scope="col">Stare</th>
                                <th scope="col">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${record.panels.map((p) => `
                                <tr>
                                    <td>
                                        ${esc(p.name)}
                                        ${p.note ? `<span class="rec-panel-note">${esc(p.note)}</span>` : ''}
                                    </td>
                                    <td>
                                        <span class="rec-state-tag rec-state-tag--${esc(p.state)}">
                                            ${esc(STATE_LABEL[p.state] || p.state)}
                                        </span>
                                    </td>
                                    <td class="rec-num">${esc(p.total)} µm</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>

                    <ul class="rec-bar-key" style="margin-top:16px">
                        <li><span class="rec-swatch rec-swatch--original"></span>Original</li>
                        <li><span class="rec-swatch rec-swatch--revopsit"></span>Revopsit</li>
                        <li><span class="rec-swatch rec-swatch--reparat"></span>Chit / reparat</li>
                    </ul>
                </div>
            </div>
        </section>`;
}

function findingsSection(record) {
    if (!record.findings?.length) return '';
    return `
        <section class="rec-section">
            <h2>Ce înseamnă aceste valori</h2>
            <ul class="rec-findings">
                ${record.findings.map((f) => `<li>${esc(f)}</li>`).join('')}
            </ul>
        </section>`;
}

function protectionSection(record) {
    const p = record.protection;
    const due = new Date(`${record.nextCheckDue}T00:00:00`);
    const overdue = Number.isFinite(due.getTime()) && due < new Date();

    return `
        <section class="rec-section">
            <h2>Protecție și garanție</h2>
            <div class="rec-protect">
                <dl class="rec-stat"><dt>Produs</dt><dd>${esc(p.product)}</dd></dl>
                <dl class="rec-stat"><dt>Straturi</dt><dd>${esc(p.layers)}</dd></dl>
                <dl class="rec-stat"><dt>Aplicat</dt><dd>${fmtDate(p.appliedOn)}</dd></dl>
                <dl class="rec-stat"><dt>Garanție până la</dt><dd>${fmtDate(p.warrantyUntil)}</dd></dl>
                <dl class="rec-stat">
                    <dt>Următoarea verificare</dt>
                    <dd>${fmtDate(record.nextCheckDue)}</dd>
                </dl>
            </div>
            <p class="rec-note">
                <span class="rec-badge ${overdue ? 'rec-badge--warn' : 'rec-badge--ok'}">
                    ${overdue ? 'Verificare restantă' : 'Fișă activă'}
                </span>
                <br><br>
                ${esc(p.condition)}
            </p>
        </section>`;
}

function historySection(record) {
    return `
        <section class="rec-section">
            <h2>Istoric verificări</h2>
            <table class="rec-table">
                <thead>
                    <tr>
                        <th scope="col">Data</th>
                        <th scope="col">Tip</th>
                        <th scope="col">Luciu</th>
                        <th scope="col">Unghi de contact</th>
                        <th scope="col">Rezultat</th>
                    </tr>
                </thead>
                <tbody>
                    ${record.checks.map((c) => `
                        <tr>
                            <td class="rec-num">${fmtDate(c.date)}</td>
                            <td>
                                ${esc(c.type)}
                                ${c.note ? `<span class="rec-panel-note">${esc(c.note)}</span>` : ''}
                            </td>
                            <td class="rec-num">${esc(c.gloss)} GU</td>
                            <td class="rec-num">${esc(c.contactAngle)}°</td>
                            <td>${esc(c.result)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </section>

        <section class="rec-section">
            <h2>Lucrări executate</h2>
            <ol class="rec-timeline">
                ${record.work.map((w) => `
                    <li>
                        <span class="rec-timeline__date">${fmtDate(w.date)}</span>
                        <p class="rec-timeline__title">${esc(w.title)}</p>
                        <ul class="rec-timeline__steps">
                            ${w.steps.map((s) => `<li>${esc(s)}</li>`).join('')}
                        </ul>
                    </li>`).join('')}
            </ol>
        </section>`;
}

function authSection(record) {
    const url = `https://novadetailing.ro/vin/${record.code}`;

    // The QR is the whole point of the printed copy: it is the only way back
    // from paper to the canonical record. Generated locally so a print never
    // depends on a third-party chart service that could disappear.
    let qr = '';
    try {
        qr = qrSvg(url, {
            className: 'rec-qr__code',
            title: `Cod QR către ${url}`
        });
    } catch (error) {
        console.error('nova-record: QR generation failed', error);
    }

    return `
        <section class="rec-section rec-auth">
            <h2>Autenticitate și transfer</h2>
            <div class="rec-auth__grid">
                <div>
                    <p class="rec-lede" style="margin-bottom:12px">
                        Exemplarul oficial al acestei fișe este cel de la adresa de mai jos. Orice copie
                        tipărită sau captură de ecran se verifică scanând codul sau introducând codul fișei acolo.
                    </p>
                    <p class="rec-auth__url">${esc(url)}</p>
                    <p class="rec-note">
                        ${esc(record.transfer.note)}
                        <br><br>
                        Măsurători efectuate cu ${esc(record.issuedBy.instrument)},
                        calibrat la ${fmtDate(record.issuedBy.calibrated)}.
                        Tehnician: ${esc(record.issuedBy.technician)}.
                    </p>
                </div>
                ${qr ? `
                <figure class="rec-qr">
                    ${qr}
                    <figcaption class="rec-qr__caption">
                        Scanează pentru<br>varianta oficială
                    </figcaption>
                </figure>` : ''}
            </div>
            <div class="rec-actions">
                <button class="rec-btn" type="button" data-print>Tipărește fișa</button>
                <a class="rec-btn rec-btn--ghost" href="/rezervare.html">Programează o verificare</a>
            </div>
        </section>`;
}

/* ── Shell ───────────────────────────────────────────────────────────────── */

function showState(message, hint = '') {
    docEl.hidden = true;
    stateEl.hidden = false;
    stateEl.innerHTML = `
        <p class="rec-state__msg">${esc(message)}</p>
        ${hint ? `<p class="rec-state__hint">${hint}</p>` : ''}`;
}

function render(record) {
    docEl.innerHTML = [
        identitySection(record),
        budgetSection(record),
        mapSection(record),
        findingsSection(record),
        protectionSection(record),
        historySection(record),
        authSection(record)
    ].join('');

    stateEl.hidden = true;
    docEl.hidden = false;
    document.title = `${record.vehicle.make} ${record.vehicle.model} — Cartea de Finisaj`;

    docEl.querySelector('[data-print]')?.addEventListener('click', () => window.print());
}

function readCode() {
    const fromPath = window.location.pathname.match(/^\/vin\/([^/]+)/);
    if (fromPath) return decodeURIComponent(fromPath[1]);
    return new URLSearchParams(window.location.search).get('cod') || '';
}

async function main() {
    const code = readCode().trim().toUpperCase();

    if (!code) {
        showState('Niciun cod de fișă în adresă.',
            'Adresa are forma <span class="rec-state__code">novadetailing.ro/vin/NV-XXXX-XXXX</span>');
        return;
    }

    try {
        const res = await fetch(`/api/record/${encodeURIComponent(code)}`, {
            headers: { Accept: 'application/json' }
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success) {
            showState(data.message || 'Fișa nu a putut fi încărcată.',
                `Cod căutat: <span class="rec-state__code">${esc(code)}</span>`);
            return;
        }

        render(data.record);
    } catch {
        showState('Nu am putut contacta serverul.', 'Verifică conexiunea și reîncarcă pagina.');
    }
}

main();
