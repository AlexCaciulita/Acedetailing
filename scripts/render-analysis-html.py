#!/usr/bin/env python3
"""Render the Nova operational/B2B Markdown report as a standalone HTML document."""

from pathlib import Path
import re
import unicodedata

from markdown_it import MarkdownIt


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ANALIZA-OPERATIONAL-B2B-NOVA.md"
OUTPUT = ROOT / "ANALIZA-OPERATIONAL-B2B-NOVA.html"


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")


markdown = SOURCE.read_text(encoding="utf-8")
title_match = re.search(r"^#\s+(.+)$", markdown, re.MULTILINE)
title = title_match.group(1) if title_match else "Nova Detailing — analiză operațională și plan B2B"
body_start = markdown.find("## ")
body_markdown = markdown[body_start:]

headings = re.findall(r"^##\s+(.+)$", body_markdown, re.MULTILINE)
heading_ids = {heading: slugify(heading) for heading in headings}

md = MarkdownIt("commonmark", {"html": False, "linkify": True, "typographer": True})
rendered = md.render(body_markdown)


def add_section(match: re.Match[str]) -> str:
    raw_heading = match.group(1)
    plain_heading = re.sub(r"<[^>]+>", "", raw_heading)
    section_id = heading_ids.get(plain_heading, slugify(plain_heading))
    number_match = re.match(r"(\d+)\.\s*(.*)", plain_heading)
    number = number_match.group(1).zfill(2) if number_match else "•"
    heading_text = number_match.group(2) if number_match else plain_heading
    prefix = "" if match.start() == 0 else "</section>\n"
    return (
        f'{prefix}<section class="report-section" id="{section_id}">\n'
        f'<div class="section-heading"><span class="section-number">{number}</span>'
        f"<h2>{heading_text}</h2></div>"
    )


rendered = re.sub(r"<h2>(.*?)</h2>", add_section, rendered)
rendered += "\n</section>"
rendered = re.sub(
    r'<a href="(https?://[^"]+)">',
    r'<a href="\1" target="_blank" rel="noopener noreferrer">',
    rendered,
)
rendered = rendered.replace("<blockquote>", '<blockquote class="thesis-callout">')

toc_items = []
for heading in headings:
    heading_number = re.match(r"(\d+)", heading)
    number = heading_number.group(1).zfill(2) if heading_number else "•"
    label = re.sub(r"^\d+\.\s*", "", heading)
    toc_items.append(
        f'<a class="toc-link" href="#{heading_ids[heading]}">'
        f"<span>{number}</span><strong>{label}</strong></a>"
    )
toc = "\n".join(toc_items)

template = r"""<!doctype html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Analiză operațională și plan B2B pentru Nova Detailing: ofertă, operațiuni, vânzare, contractare și plan 30–60–90 zile.">
  <title>__TITLE__</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&amp;family=Inter:wght@400;500;600;700&amp;family=Manrope:wght@600;700;800&amp;display=swap" rel="stylesheet">
  <style>
    :root {
      --ink: #171815;
      --ink-soft: #33352f;
      --muted: #676961;
      --faint: #96988f;
      --line: rgba(23, 24, 21, .13);
      --line-soft: rgba(23, 24, 21, .075);
      --paper: #f4f3ef;
      --surface: #faf9f6;
      --white: #fff;
      --bronze: #846f43;
      --gold: #b8a47c;
      --pale: #e9e1d1;
      --forest: #263e35;
      --forest-light: #3d5c50;
      --warning: #934c2c;
      --warning-bg: #fbefe7;
      --success-bg: #e9f0eb;
      --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
      --sans: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
      --display: Manrope, Inter, sans-serif;
      --shadow: 0 24px 70px rgba(35, 37, 30, .09);
    }

    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; scroll-padding-top: 84px; }
    body {
      margin: 0;
      background:
        radial-gradient(circle at 88% 0%, rgba(184, 164, 124, .16), transparent 30rem),
        var(--paper);
      color: var(--ink);
      font-family: var(--sans);
      font-size: 16px;
      line-height: 1.72;
      -webkit-font-smoothing: antialiased;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0 auto auto 0;
      z-index: 100;
      width: var(--reading-progress, 0%);
      height: 3px;
      background: linear-gradient(90deg, var(--gold), var(--forest));
    }
    a { color: var(--bronze); text-underline-offset: .2em; }
    a:hover { color: var(--forest); }
    h1, h2, h3, h4 { font-family: var(--display); letter-spacing: -.035em; line-height: 1.15; }
    p { margin: 0 0 1em; }
    strong { font-weight: 700; }
    code {
      padding: .15em .38em;
      border: 1px solid var(--line-soft);
      border-radius: .35em;
      background: rgba(255, 255, 255, .68);
      font-family: var(--mono);
      font-size: .84em;
    }

    .skip-link {
      position: fixed;
      top: -100px;
      left: 20px;
      z-index: 200;
      padding: 10px 14px;
      border-radius: 8px;
      background: var(--forest);
      color: #fff;
    }
    .skip-link:focus { top: 16px; }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 50;
      border-bottom: 1px solid rgba(255, 255, 255, .1);
      background: rgba(24, 27, 23, .92);
      color: #fff;
      backdrop-filter: blur(15px);
    }
    .topbar-inner {
      width: min(1440px, calc(100% - 40px));
      min-height: 64px;
      margin-inline: auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #fff;
      text-decoration: none;
    }
    .brand-mark {
      width: 34px;
      aspect-ratio: 1;
      display: grid;
      place-items: center;
      border: 1px solid rgba(255, 255, 255, .36);
      border-radius: 50%;
      color: var(--pale);
      font-family: var(--display);
      font-size: .7rem;
      font-weight: 800;
      letter-spacing: -.06em;
    }
    .brand-copy {
      font-family: var(--mono);
      font-size: .7rem;
      font-weight: 600;
      letter-spacing: .14em;
      text-transform: uppercase;
    }
    .topbar-actions { display: flex; align-items: center; gap: 10px; }
    .topbar-label {
      color: rgba(255, 255, 255, .58);
      font-family: var(--mono);
      font-size: .63rem;
      letter-spacing: .09em;
      text-transform: uppercase;
    }
    .print-button {
      appearance: none;
      padding: 9px 13px;
      border: 1px solid rgba(255, 255, 255, .2);
      border-radius: 999px;
      background: transparent;
      color: #fff;
      cursor: pointer;
      font-family: var(--mono);
      font-size: .65rem;
      font-weight: 600;
      letter-spacing: .07em;
      text-transform: uppercase;
    }
    .print-button:hover { border-color: var(--gold); color: var(--pale); }

    .hero {
      position: relative;
      overflow: hidden;
      padding: clamp(68px, 10vw, 132px) 0 72px;
      background: var(--forest);
      color: #f6f3eb;
    }
    .hero::before {
      content: "";
      position: absolute;
      width: min(62vw, 820px);
      aspect-ratio: 1;
      top: -70%;
      right: -14%;
      border: 1px solid rgba(255, 255, 255, .08);
      border-radius: 50%;
      box-shadow:
        0 0 0 80px rgba(255, 255, 255, .025),
        0 0 0 180px rgba(255, 255, 255, .018);
    }
    .hero-inner {
      position: relative;
      z-index: 1;
      width: min(1180px, calc(100% - 44px));
      margin-inline: auto;
    }
    .eyebrow {
      margin: 0 0 22px;
      color: var(--gold);
      font-family: var(--mono);
      font-size: .68rem;
      font-weight: 600;
      letter-spacing: .18em;
      text-transform: uppercase;
    }
    .hero h1 {
      max-width: 980px;
      margin: 0;
      font-size: clamp(2.45rem, 6vw, 5.8rem);
      font-weight: 800;
      letter-spacing: -.06em;
      line-height: .98;
      text-wrap: balance;
    }
    .hero-lede {
      max-width: 720px;
      margin: 28px 0 0;
      color: rgba(255, 255, 255, .73);
      font-size: clamp(1.02rem, 2vw, 1.28rem);
      line-height: 1.6;
    }
    .hero-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 30px;
      margin-top: 32px;
      color: rgba(255, 255, 255, .48);
      font-family: var(--mono);
      font-size: .66rem;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    .hero-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1px;
      max-width: 980px;
      margin-top: 52px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, .12);
      border-radius: 18px;
      background: rgba(255, 255, 255, .1);
    }
    .hero-stat {
      min-height: 132px;
      padding: 24px;
      background: rgba(14, 23, 19, .48);
    }
    .hero-stat b {
      display: block;
      color: #fff;
      font-family: var(--display);
      font-size: clamp(1.55rem, 3vw, 2.15rem);
      letter-spacing: -.045em;
      line-height: 1.1;
    }
    .hero-stat span {
      display: block;
      margin-top: 8px;
      color: rgba(255, 255, 255, .58);
      font-size: .78rem;
      line-height: 1.45;
    }

    .page-layout {
      width: min(1440px, calc(100% - 40px));
      margin: 0 auto;
      display: grid;
      grid-template-columns: 270px minmax(0, 850px);
      justify-content: center;
      gap: clamp(42px, 6vw, 96px);
      align-items: start;
    }
    .toc {
      position: sticky;
      top: 88px;
      max-height: calc(100vh - 112px);
      padding: 50px 0;
      overflow: auto;
      scrollbar-width: thin;
    }
    .toc-title {
      margin: 0 0 15px 44px;
      color: var(--faint);
      font-family: var(--mono);
      font-size: .62rem;
      letter-spacing: .15em;
      text-transform: uppercase;
    }
    .toc-link {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 10px;
      align-items: baseline;
      padding: 7px 10px 7px 4px;
      border-left: 2px solid transparent;
      color: var(--muted);
      text-decoration: none;
      transition: color .2s ease, border-color .2s ease, transform .2s ease;
    }
    .toc-link span {
      color: var(--faint);
      font-family: var(--mono);
      font-size: .6rem;
      text-align: right;
    }
    .toc-link strong {
      font-size: .74rem;
      font-weight: 500;
      line-height: 1.35;
    }
    .toc-link:hover,
    .toc-link.is-active {
      border-left-color: var(--gold);
      color: var(--ink);
      transform: translateX(3px);
    }
    .toc-link.is-active strong { font-weight: 700; }

    main {
      min-width: 0;
      padding: 16px 0 90px;
    }
    .report-section {
      position: relative;
      padding: 64px 0;
      border-bottom: 1px solid var(--line);
    }
    .report-section:last-child { border-bottom: 0; }
    .section-heading {
      display: grid;
      grid-template-columns: 48px 1fr;
      gap: 18px;
      align-items: start;
      margin-bottom: 28px;
    }
    .section-number {
      padding-top: .48em;
      color: var(--gold);
      font-family: var(--mono);
      font-size: .72rem;
      font-weight: 600;
      letter-spacing: .08em;
    }
    .report-section h2 {
      margin: 0;
      font-size: clamp(1.65rem, 3.7vw, 2.65rem);
      font-weight: 800;
      text-wrap: balance;
    }
    .report-section h3 {
      margin: 42px 0 14px;
      padding-top: 4px;
      color: var(--ink);
      font-size: 1.2rem;
      font-weight: 750;
    }
    .report-section h4 {
      margin: 28px 0 10px;
      font-size: 1rem;
    }
    .report-section > p,
    .report-section > ul,
    .report-section > ol {
      max-width: 74ch;
    }
    .report-section ul,
    .report-section ol {
      margin: 14px 0 24px;
      padding-left: 1.3rem;
    }
    .report-section li { margin: 7px 0; padding-left: .25rem; }
    .report-section li::marker {
      color: var(--bronze);
      font-family: var(--mono);
      font-size: .82em;
      font-weight: 600;
    }
    .report-section > ul,
    .report-section > ol {
      padding: 20px 24px 20px 44px;
      border: 1px solid var(--line-soft);
      border-radius: 14px;
      background: rgba(255, 255, 255, .58);
    }
    .report-section:nth-of-type(3) > ul:first-of-type,
    .report-section:nth-of-type(15) > ul:first-of-type {
      border-color: rgba(147, 76, 44, .22);
      background: var(--warning-bg);
    }
    .report-section:nth-of-type(16) {
      margin: 34px 0;
      padding: 42px;
      border: 0;
      border-radius: 22px;
      background: var(--forest);
      color: #f6f3eb;
      box-shadow: var(--shadow);
    }
    .report-section:nth-of-type(16) .section-number { color: var(--gold); }
    .report-section:nth-of-type(16) h2,
    .report-section:nth-of-type(16) strong { color: #fff; }
    .report-section:nth-of-type(16) > ol {
      border-color: rgba(255, 255, 255, .12);
      background: rgba(255, 255, 255, .06);
    }
    .report-section:nth-of-type(16) li::marker { color: var(--pale); }

    .thesis-callout {
      position: relative;
      margin: 32px 0;
      padding: 30px 34px 30px 72px;
      border: 0;
      border-radius: 18px;
      background: var(--forest);
      color: rgba(255, 255, 255, .88);
      box-shadow: var(--shadow);
    }
    .thesis-callout::before {
      content: "N";
      position: absolute;
      left: 26px;
      top: 27px;
      width: 30px;
      aspect-ratio: 1;
      display: grid;
      place-items: center;
      border: 1px solid rgba(255, 255, 255, .3);
      border-radius: 50%;
      color: var(--pale);
      font-family: var(--display);
      font-size: .7rem;
      font-weight: 800;
    }
    .thesis-callout p { margin: 0; font-size: 1.05rem; }
    .thesis-callout strong { color: #fff; }

    pre {
      max-width: 100%;
      margin: 22px 0 28px;
      padding: 22px 24px;
      overflow: auto;
      border: 1px solid rgba(255, 255, 255, .08);
      border-radius: 14px;
      background: #202821;
      color: #f4f0e6;
      box-shadow: 0 12px 34px rgba(32, 40, 33, .1);
      line-height: 1.75;
    }
    pre code {
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font-size: .76rem;
    }

    .report-section:last-child ul {
      padding: 0;
      border: 0;
      background: transparent;
      list-style: none;
    }
    .report-section:last-child li {
      padding: 11px 0;
      border-bottom: 1px solid var(--line-soft);
    }
    .report-section:last-child li:last-child { border-bottom: 0; }
    .report-section:last-child a { font-weight: 650; }

    .closing {
      padding: 40px 0 60px;
      border-top: 1px solid var(--line);
      color: var(--muted);
    }
    .closing-inner {
      display: flex;
      justify-content: space-between;
      gap: 30px;
      align-items: end;
    }
    .closing p { max-width: 620px; margin: 0; font-size: .9rem; }
    .closing-mark {
      color: var(--faint);
      font-family: var(--mono);
      font-size: .62rem;
      letter-spacing: .1em;
      text-transform: uppercase;
      text-align: right;
    }

    @media (max-width: 1050px) {
      .page-layout { grid-template-columns: minmax(0, 850px); }
      .toc { display: none; }
      main { padding-top: 0; }
    }
    @media (max-width: 760px) {
      body { font-size: 15px; }
      .topbar-inner { width: min(100% - 28px, 1440px); }
      .topbar-label { display: none; }
      .hero { padding: 62px 0 48px; }
      .hero-inner,
      .page-layout { width: min(100% - 32px, 1180px); }
      .hero h1 { font-size: clamp(2.3rem, 12vw, 4rem); }
      .hero-stats { grid-template-columns: repeat(2, 1fr); }
      .hero-stat { min-height: 118px; padding: 19px; }
      .report-section { padding: 46px 0; }
      .section-heading { grid-template-columns: 34px 1fr; gap: 10px; }
      .thesis-callout { padding: 68px 24px 24px; }
      .thesis-callout::before { left: 24px; top: 22px; }
      .report-section > ul,
      .report-section > ol { padding: 16px 18px 16px 36px; }
      .report-section:nth-of-type(16) {
        margin-inline: -8px;
        padding: 32px 24px;
      }
      .closing-inner { display: block; }
      .closing-mark { margin-top: 18px; text-align: left; }
    }
    @media (max-width: 440px) {
      .brand-copy { display: none; }
      .hero-stats { grid-template-columns: 1fr; }
      .hero-stat { min-height: auto; }
    }

    @media print {
      @page { size: A4; margin: 16mm 15mm 18mm; }
      body { background: #fff; color: #111; font-size: 9.4pt; line-height: 1.52; }
      body::before, .topbar, .toc { display: none !important; }
      .hero {
        padding: 12mm 0 9mm;
        background: #fff;
        color: #111;
        border-bottom: 1.5pt solid #263e35;
      }
      .hero::before { display: none; }
      .hero-inner, .page-layout { width: 100%; display: block; }
      .eyebrow { color: #846f43; }
      .hero h1 { max-width: 100%; color: #111; font-size: 28pt; }
      .hero-lede { color: #333; font-size: 11pt; }
      .hero-meta { color: #666; }
      .hero-stats { grid-template-columns: repeat(4, 1fr); border-color: #ccc; }
      .hero-stat { min-height: auto; padding: 10pt; background: #f5f4ef; }
      .hero-stat b { color: #111; font-size: 15pt; }
      .hero-stat span { color: #555; font-size: 7.5pt; }
      main { padding: 0; }
      .report-section { padding: 9mm 0; break-before: auto; }
      .report-section h2, .report-section h3 { break-after: avoid; }
      .report-section > ul,
      .report-section > ol,
      pre,
      .thesis-callout { break-inside: avoid; }
      .report-section:nth-of-type(16),
      .thesis-callout {
        color: #111;
        background: #f4f3ef;
        border: 1pt solid #263e35;
        box-shadow: none;
      }
      .report-section:nth-of-type(16) h2,
      .report-section:nth-of-type(16) strong,
      .thesis-callout strong { color: #111; }
      .thesis-callout::before { color: #263e35; border-color: #263e35; }
      pre { color: #111; background: #f3f3f1; border-color: #bbb; box-shadow: none; }
      a { color: #111; text-decoration: none; }
      .closing { padding-bottom: 0; }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#report">Sari la raport</a>

  <nav class="topbar" aria-label="Bară document">
    <div class="topbar-inner">
      <a class="brand" href="#top" aria-label="Nova Detailing — început document">
        <span class="brand-mark">ND</span>
        <span class="brand-copy">Nova Detailing</span>
      </a>
      <div class="topbar-actions">
        <span class="topbar-label">Document intern · Strategie comercială</span>
        <button class="print-button" type="button" onclick="window.print()">Tipărește / PDF</button>
      </div>
    </div>
  </nav>

  <header class="hero" id="top">
    <div class="hero-inner">
      <p class="eyebrow">Analiză operațională · Plan de vânzare B2B</p>
      <h1>De la ofertă la primul client semnat.</h1>
      <p class="hero-lede">
        Un sistem executabil pentru Nova Detailing: economie pe serviciu, capacitate,
        ofertă-pilot, prospectare, contractare și implementare în 90 de zile.
      </p>
      <div class="hero-meta">
        <span>Audit: 30 iulie 2026</span>
        <span>Nova Detailing · București</span>
        <span>17 capitole · Plan executabil</span>
      </div>
      <div class="hero-stats" aria-label="Obiectivele principale ale planului">
        <div class="hero-stat"><b>30–45 zile</b><span>țintă realistă până la prima semnătură</span></div>
        <div class="hero-stat"><b>3 mașini</b><span>pilotul B2B recomandat pentru validare</span></div>
        <div class="hero-stat"><b>50–60</b><span>conturi în lista inițială de prospectare</span></div>
        <div class="hero-stat"><b>1 contract</b><span>obiectivul funnel-ului în primele 45 de zile</span></div>
      </div>
    </div>
  </header>

  <div class="page-layout">
    <aside class="toc" aria-label="Cuprins">
      <p class="toc-title">Cuprins</p>
      __TOC__
    </aside>

    <main id="report">
      __REPORT_CONTENT__
      <footer class="closing">
        <div class="closing-inner">
          <p>
            Document de lucru bazat pe fișierele Nova Detailing și pe sursele oficiale
            enumerate în capitolul 17. Elementele juridice, fiscale și de asigurare trebuie
            confirmate de profesioniști autorizați înainte de implementare.
          </p>
          <div class="closing-mark">Nova Detailing<br>Operational × B2B</div>
        </div>
      </footer>
    </main>
  </div>

  <script>
    const sections = [...document.querySelectorAll(".report-section")];
    const tocLinks = [...document.querySelectorAll(".toc-link")];

    const updateProgress = () => {
      const root = document.documentElement;
      const available = root.scrollHeight - root.clientHeight;
      const progress = available > 0 ? (root.scrollTop / available) * 100 : 0;
      document.body.style.setProperty("--reading-progress", `${progress}%`);
    };
    updateProgress();
    addEventListener("scroll", updateProgress, { passive: true });

    const spy = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      tocLinks.forEach((link) => {
        link.classList.toggle("is-active", link.hash === `#${visible.target.id}`);
      });
    }, { rootMargin: "-18% 0px -68% 0px", threshold: 0 });
    sections.forEach((section) => spy.observe(section));
  </script>
</body>
</html>
"""

output = (
    template.replace("__TITLE__", title)
    .replace("__TOC__", toc)
    .replace("__REPORT_CONTENT__", rendered)
)
OUTPUT.write_text(output, encoding="utf-8")
print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")
