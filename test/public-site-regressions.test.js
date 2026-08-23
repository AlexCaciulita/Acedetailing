import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

function responseMock() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

test('public inner pages use local pinned assets and expose a main landmark', () => {
  const pages = [
    'servicii.html', 'rezervare.html', 'scoala.html', 'despre.html',
    'blog.html', 'contact.html', 'faq.html', 'politici.html',
    'articole/cum-protejezi-vopseaua-masinii.html',
    'articole/greseli-curatare-interior-auto.html',
    'articole/protectie-ceramica-versus-ppf.html',
    'articole/de-ce-curs-profesional-detailing.html',
    'articole/polish-auto-unu-doi-trei-pasi.html',
    'articole/intretinere-masina-iarna.html'
  ];

  pages.forEach((page) => {
    const html = read(`public/${page}`);
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com|unpkg\.com\/alpinejs/);
    assert.match(html, /tailwind\.css\?direct/, `${page} needs the dev-safe compiled stylesheet`);
    assert.match(html, /<main(?:\s|>)/, `${page} needs a main landmark`);
    assert.match(html, /nova-skip-link/, `${page} needs a skip link`);
  });
});

test('portfolio keeps exactly ten sourced images in every category', () => {
  const about = read('public/despre.html');
  const marker = 'x-data="{\n        activeFilter';
  const dataStart = about.indexOf(marker) + 'x-data="'.length;
  const dataEnd = about.indexOf('}">\n        <div class="max-w-7xl', dataStart);
  assert.ok(dataStart >= 'x-data="'.length && dataEnd > dataStart);

  const portfolio = Function(`"use strict"; return (${about.slice(dataStart, dataEnd + 1)});`)();
  const categories = portfolio.items.map((item) => item.category);
  const counts = categories.reduce((totals, category) => {
    totals[category] = (totals[category] || 0) + 1;
    return totals;
  }, {});

  assert.equal(categories.length, 40);
  ['interior', 'exterior', 'polish', 'signature'].forEach((category) => {
    assert.equal(counts[category], 10, `${category} needs exactly ten portfolio images`);
  });

  const images = portfolio.items.map((item) => item.image.replace('/assets/portfolio/', ''));
  assert.equal(images.length, 40);
  images.forEach((image) => {
    assert.equal(
      fs.existsSync(path.join(projectRoot, 'public/assets/portfolio', image)),
      true,
      `${image} must exist locally`
    );
  });
});

test('blog cards open real articles and newsletter submits to the API', () => {
  const blog = read('public/blog.html');
  const data = read('public/blog-data.js');
  const article = read('public/articole/cum-protejezi-vopseaua-masinii.html');

  assert.match(blog, /\/articole\/cum-protejezi-vopseaua-masinii\.html/);
  assert.doesNotMatch(blog, /articol\.html\?slug=/);
  assert.doesNotMatch(blog, /<a href="#"[^>]*>\s*(?:<img|Citeste)/);
  assert.match(blog, /\/api\/create-newsletter/);
  assert.match(data, /slug: 'cum-protejezi-vopseaua-masinii'/);
  assert.match(article, /"@type": "BlogPosting"/);
  assert.match(article, /<h1[^>]*>Ghid complet: Cum să îți protejezi vopseaua mașinii/);
});

test('SEO surfaces use static URLs, valid JSON-LD and no removed volume claims', () => {
  const sitemap = read('public/sitemap.xml');
  const publicFiles = fs.readdirSync(path.join(projectRoot, 'public'))
    .filter((name) => name.endsWith('.html'));
  const articleFiles = fs.readdirSync(path.join(projectRoot, 'public/articole'))
    .filter((name) => name.endsWith('.html'));

  assert.equal(articleFiles.length, 6);
  articleFiles.forEach((name) => {
    assert.match(sitemap, new RegExp(`/articole/${name.replace('.', '\\.')}<`));
  });
  assert.doesNotMatch(sitemap, /articol\.html\?slug=/);
  assert.doesNotMatch(sitemap, /\/companii\.html/);

  const indexablePages = [...publicFiles, ...articleFiles.map((name) => `articole/${name}`)]
    .filter((name) => !['admin.html', 'vin.html', '404.html'].includes(name));

  indexablePages.forEach((name) => {
    const html = read(`public/${name}`);
    assert.doesNotMatch(html, /(?:peste\s+)?1[ .]?000\+?\s+(?:de\s+)?ma(?:ș|s)ini/i, `${name} contains the removed vehicle-volume claim`);
    assert.doesNotMatch(html, /600\+?\s+(?:de\s+)?(?:absolvenți|absolventi|studenți|studenti)/i, `${name} contains the removed graduate claim`);

    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      assert.doesNotThrow(() => JSON.parse(match[1]), `${name} contains invalid JSON-LD`);
    }
  });

  assert.equal(fs.existsSync(path.join(projectRoot, 'public/PLAN-BUSINESS-COMPLET-NOVA-2026.html')), false);
  assert.doesNotMatch(read('vite.config.js'), /ROOT_DOCUMENT_FILES/);
});

test('the public experience stays focused on individual customers', () => {
  const homepage = read('public/index.html');
  const sharedLayout = read('public/nova-home.js');
  const companyPage = read('public/companii.html');

  assert.doesNotMatch(homepage, /href="\/companii\.html"/);
  assert.doesNotMatch(sharedLayout, /href:\s*'\/companii\.html'/);
  assert.doesNotMatch(sharedLayout, /href="\/companii\.html"/);
  assert.doesNotMatch(homepage, /nova-home-b2b/);
  assert.match(homepage, /Mașina ta,[\s\S]*îngrijită cum trebuie\./);
  assert.match(companyPage, /<meta name="robots" content="noindex, nofollow, noarchive">/);
});

test('location details appear only on the contact page', () => {
  const allowedExtensions = new Set(['.html', '.js', '.json', '.xml', '.txt', '.webmanifest']);
  const files = [];
  const collect = (directory, prefix = '') => {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const relativePath = path.join(prefix, entry.name);
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(absolutePath, relativePath);
      else if (allowedExtensions.has(path.extname(entry.name)) || entry.name.endsWith('.webmanifest')) files.push(relativePath);
    });
  };

  collect(path.join(projectRoot, 'public'));
  const locationPattern = /domne(?:ș|s)ti|bucure(?:ș|s)ti|ilfov|șoseaua de centură|soseaua de centura|077090|google\.com\/maps/i;

  files.filter((name) => name !== 'contact.html').forEach((name) => {
    assert.doesNotMatch(read(`public/${name}`), locationPattern, `${name} must not mention the location`);
  });

  const contact = read('public/contact.html');
  assert.match(contact, /Șoseaua de Centură nr\. 100 A/);
  assert.match(contact, /Domnești, Ilfov/);
  assert.match(contact, /google\.com\/maps/);
});

test('mobile heroes use the compact shared height system', () => {
  const styles = read('public/nova-premium.css');

  assert.match(styles, /\.nova-home-page \.nova-hero-grid\s*\{[\s\S]*?height:\s*316px/);
  assert.match(styles, /body\.nova-inner-page:not\(\.nova-page-article\) \.nova-inner-hero,[\s\S]*?height:\s*196px/);
  assert.match(styles, /\.nova-home-page \.nova-proof-row\s*\{\s*display:\s*none/);
});

test('every customer page exposes the persistent WhatsApp contact control', () => {
  const sharedScript = read('public/nova-home.js');
  const sharedStyles = read('public/nova-premium.css');
  const pages = [
    'index.html', 'servicii.html', 'companii.html', 'rezervare.html',
    'scoala.html', 'despre.html', 'blog.html', 'contact.html', 'faq.html',
    'politici.html', '404.html',
    ...fs.readdirSync(path.join(projectRoot, 'public/articole')).map((name) => `articole/${name}`)
  ];

  assert.match(sharedScript, /WHATSAPP_NUMBER = '40742122222'/);
  assert.match(sharedScript, /whatsappUrl\.searchParams\.set\('text', WHATSAPP_MESSAGE\)/);
  assert.match(sharedScript, /data-whatsapp-float/);
  assert.match(sharedStyles, /\.nova-whatsapp-float\s*\{/);
  assert.match(sharedStyles, /position:\s*fixed/);

  pages.forEach((page) => {
    assert.match(read(`public/${page}`), /nova-home\.js/, `${page} must load the shared WhatsApp control`);
  });

  assert.doesNotMatch(read('public/contact.html'), /class="fixed bottom-6 right-6/);
});

test('booking selection and fields expose keyboard and label semantics', () => {
  const booking = read('public/rezervare.html');
  const ids = [
    'booking-car-model', 'booking-name', 'booking-phone', 'booking-email',
    'booking-date', 'booking-time-slot', 'booking-notes'
  ];

  ids.forEach((id) => {
    assert.match(booking, new RegExp(`for="${id}"`));
    assert.match(booking, new RegExp(`id="${id}"`));
  });
  assert.match(booking, /:aria-pressed="String\(selectedPackage === pkg\.id\)"/);
  assert.match(booking, /:aria-label="'Pasul ' \+ step/);
});

test('FAQ package description agrees with the two-stage correction data', () => {
  const faq = read('public/faq.html');
  assert.match(faq, /Corectie vopsea in doi pasi/);
  assert.doesNotMatch(faq, /Corectie vopsea intr-un singur pas/);
});

test('public lead handlers reject incomplete or malformed submissions', async () => {
  const [{ default: enrollment }, { default: newsletter }] = await Promise.all([
    import('../api/create-enrollment.js'),
    import('../api/create-newsletter.js')
  ]);

  const enrollmentResponse = responseMock();
  await enrollment({ method: 'POST', body: { name: 'Test' } }, enrollmentResponse);
  assert.equal(enrollmentResponse.statusCode, 400);
  assert.equal(enrollmentResponse.payload.success, false);

  const newsletterResponse = responseMock();
  await newsletter({ method: 'POST', body: { email: 'not-an-email' } }, newsletterResponse);
  assert.equal(newsletterResponse.statusCode, 400);
  assert.equal(newsletterResponse.payload.success, false);
});
