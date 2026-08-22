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
    'blog.html', 'contact.html', 'faq.html', 'politici.html', 'articol.html'
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
  const article = read('public/articol.html');

  assert.match(blog, /articol\.html\?slug=/);
  assert.doesNotMatch(blog, /<a href="#"[^>]*>\s*(?:<img|Citeste)/);
  assert.match(blog, /\/api\/create-newsletter/);
  assert.match(data, /slug: 'cum-protejezi-vopseaua-masinii'/);
  assert.match(article, /data-article-content/);
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
