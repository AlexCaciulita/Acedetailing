import { getArticle } from './blog-data.js';

const slug = new URLSearchParams(window.location.search).get('slug') || '';
const article = getArticle(slug);
const root = document.querySelector('[data-article]');

function appendTextElement(parent, tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

if (!article) {
  document.title = 'Articol indisponibil | Nova Detailing';
  root?.classList.add('text-center');
  appendTextElement(root, 'p', 'text-primary font-heading font-semibold uppercase tracking-wider', 'Jurnal Nova');
  appendTextElement(root, 'h1', 'mt-4 text-4xl font-heading font-bold text-light-950', 'Articolul nu a fost găsit');
  const link = appendTextElement(root, 'a', 'nova-button nova-button--primary mt-8 inline-flex', 'Înapoi la articole');
  link.href = '/blog.html';
} else {
  document.title = `${article.title} | Nova Detailing`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', article.excerpt);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', article.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', article.excerpt);
  document.querySelector('link[rel="canonical"]')?.setAttribute(
    'href',
    `https://novadetailing.ro/articol.html?slug=${encodeURIComponent(article.slug)}`
  );
  document.querySelector('[data-article-category]').textContent = article.category;
  document.querySelector('[data-article-title]').textContent = article.title;
  document.querySelector('[data-article-meta]').textContent = `${article.date} · ${article.readTime}`;

  const image = document.querySelector('[data-article-image]');
  image.src = article.image;
  image.alt = article.title;
  document.querySelector('[data-article-excerpt]').textContent = article.excerpt;

  const content = document.querySelector('[data-article-content]');
  article.sections.forEach((section) => {
    const group = document.createElement('section');
    group.className = 'article-copy-section';
    appendTextElement(group, 'h2', 'font-heading text-2xl font-bold text-light-950', section.heading);
    section.paragraphs?.forEach((paragraph) => appendTextElement(group, 'p', 'text-light-600 leading-7', paragraph));
    if (section.items?.length) {
      const list = document.createElement('ul');
      list.className = 'space-y-3 text-light-600';
      section.items.forEach((item) => appendTextElement(list, 'li', 'article-check-item', item));
      group.append(list);
    }
    content.append(group);
  });
}
