import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { articles } from '../public/blog-data.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(projectRoot, 'public');
const articleDir = path.join(publicDir, 'articole');
const siteUrl = 'https://novadetailing.ro';
const siteLastModified = '2026-08-22';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const absoluteUrl = (value) => value.startsWith('http') ? value : `${siteUrl}${value}`;
const safeJson = (value) => JSON.stringify(value, null, 2).replaceAll('<', '\\u003c');

function articleSections(article) {
  return article.sections.map((section) => `
          <section class="article-copy-section">
            <h2 class="font-heading text-2xl font-bold text-light-950">${escapeHtml(section.heading)}</h2>
${(section.paragraphs || []).map((paragraph) => `            <p class="text-light-600 leading-7">${escapeHtml(paragraph)}</p>`).join('\n')}
${section.items?.length ? `            <ul class="space-y-3 text-light-600">
              ${section.items.map((item) => `<li class="article-check-item">${escapeHtml(item)}</li>`).join('\n              ')}
            </ul>` : ''}
          </section>`).join('\n');
}

function articlePage(article) {
  const url = `${siteUrl}/articole/${article.slug}.html`;
  const image = absoluteUrl(article.image);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        headline: article.title,
        description: article.excerpt,
        image,
        datePublished: article.datePublished,
        dateModified: article.dateModified,
        inLanguage: 'ro-RO',
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author: { '@type': 'Organization', '@id': `${siteUrl}/#business`, name: 'Nova Detailing' },
        publisher: {
          '@type': 'Organization',
          '@id': `${siteUrl}/#business`,
          name: 'Nova Detailing',
          logo: { '@type': 'ImageObject', url: `${siteUrl}/assets/logo.png` }
        },
        isPartOf: { '@type': 'Blog', '@id': `${siteUrl}/blog.html#blog`, name: 'Jurnal Nova' },
        articleSection: article.category
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Acasă', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Jurnal Nova', item: `${siteUrl}/blog.html` },
          { '@type': 'ListItem', position: 3, name: article.title, item: url }
        ]
      }
    ]
  };

  return `<!doctype html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(article.title)}</title>
  <meta name="description" content="${escapeHtml(article.excerpt)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="ro_RO">
  <meta property="og:site_name" content="Nova Detailing">
  <meta property="og:title" content="${escapeHtml(article.title)}">
  <meta property="og:description" content="${escapeHtml(article.excerpt)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${image}">
  <meta property="article:published_time" content="${article.datePublished}">
  <meta property="article:modified_time" content="${article.dateModified}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(article.title)}">
  <meta name="twitter:description" content="${escapeHtml(article.excerpt)}">
  <meta name="twitter:image" content="${image}">
  <meta name="theme-color" content="#05080A">
  <meta name="color-scheme" content="dark">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/tailwind.css?direct">
  <link rel="stylesheet" href="/nova-premium.css?v=27">
  <script type="application/ld+json">${safeJson(jsonLd)}</script>
</head>
<body class="nova-premium nova-inner-page nova-site-dark nova-page-article bg-light-50 text-light-950 font-body antialiased">
  <a class="nova-skip-link" href="#continut">Sari la conținut</a>
  <nav id="main-nav" aria-label="Navigație principală">
    <a href="/">Acasă</a>
    <a href="/servicii.html">Servicii</a>
    <a href="/despre.html">Despre</a>
    <a href="/contact.html">Contact</a>
  </nav>

  <div class="bg-light-50 border-b border-light-200 pt-20 pb-3">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="text-sm text-light-500" aria-label="Fir de navigare">
        <a href="/">Acasă</a><span class="mx-2">›</span><a href="/blog.html">Jurnal Nova</a><span class="mx-2">›</span><span aria-current="page">${escapeHtml(article.title)}</span>
      </nav>
    </div>
  </div>

  <main id="continut">
    <section class="pt-24 pb-12 bg-light-100">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <p class="text-primary font-heading font-semibold uppercase tracking-wider">${escapeHtml(article.category)}</p>
        <h1 class="mt-4 text-4xl md:text-6xl font-heading font-bold text-light-950">${escapeHtml(article.title)}</h1>
        <p class="mt-5 text-sm text-light-500"><time datetime="${article.datePublished}">${escapeHtml(article.date)}</time> · ${escapeHtml(article.readTime)} · Nova Detailing</p>
      </div>
    </section>

    <article class="pb-24">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <img class="article-cover" src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title)}" width="1400" height="820" fetchpriority="high">
        <div class="article-copy">
          <p class="article-lede">${escapeHtml(article.excerpt)}</p>
${articleSections(article)}
          <div class="article-cta">
            <p>Vrei o recomandare potrivită pentru starea reală a mașinii tale?</p>
            <a href="/rezervare.html" class="nova-button nova-button--primary">Configurează și rezervă <span class="nova-arrow" aria-hidden="true">→</span></a>
          </div>
        </div>
      </div>
    </article>
  </main>

  <footer>
    <a href="/blog.html">Toate articolele</a>
    <a href="/contact.html">Contact Nova Detailing</a>
  </footer>
  <script type="module" src="/nova-home.js?v=19"></script>
</body>
</html>
`;
}

const staticPages = [
  { path: '/', lastmod: siteLastModified, changefreq: 'weekly' },
  { path: '/servicii.html', lastmod: siteLastModified, changefreq: 'monthly' },
  { path: '/rezervare.html', lastmod: siteLastModified, changefreq: 'monthly' },
  { path: '/scoala.html', lastmod: siteLastModified, changefreq: 'monthly' },
  { path: '/despre.html', lastmod: siteLastModified, changefreq: 'monthly' },
  { path: '/blog.html', lastmod: siteLastModified, changefreq: 'weekly' },
  { path: '/contact.html', lastmod: siteLastModified, changefreq: 'monthly' },
  { path: '/faq.html', lastmod: siteLastModified, changefreq: 'monthly' },
  { path: '/politici.html', lastmod: siteLastModified, changefreq: 'yearly' }
];

function sitemap() {
  const entries = [
    ...staticPages,
    ...articles.map((article) => ({
      path: `/articole/${article.slug}.html`,
      lastmod: article.dateModified,
      changefreq: 'monthly'
    }))
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((entry) => `  <url>
    <loc>${siteUrl}${entry.path}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
  </url>`).join('\n')}
</urlset>
`;
}

fs.mkdirSync(articleDir, { recursive: true });
for (const article of articles) {
  fs.writeFileSync(path.join(articleDir, `${article.slug}.html`), articlePage(article));
}
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap());

console.log(`Generated ${articles.length} static article pages and sitemap.xml.`);
