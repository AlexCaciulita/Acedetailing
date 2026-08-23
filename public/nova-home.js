const motionIsReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const isInnerPage = document.body.classList.contains('nova-inner-page');

// Legacy pages animate with `.reveal*` + `.revealed`; the redesigned markup uses
// `[data-reveal]` + `.is-revealed`. Both are driven by the one observer below.
const REVEAL_SELECTOR = '[data-reveal], .reveal, .reveal-left, .reveal-right, .reveal-scale';
const CARD_SELECTOR = 'article, div, a, form';
const LIQUID_CONTROL_SELECTOR = '.nova-button, .btn-glass, .btn-glass-outline, .nova-nav-mobile-cta, .nova-menu-toggle, .gold-btn';

const enhancedCards = new WeakSet();
const observedReveals = new WeakSet();

const WHATSAPP_NUMBER = '40742122222';
const WHATSAPP_MESSAGE = 'Bună ziua! Aș dori mai multe informații despre serviciile Nova Detailing.';

let revealObserver = null;

const primaryPages = [
    { href: '/', label: 'Acasă', match: ['/', '/index.html'] },
    { href: '/servicii.html', label: 'Servicii', match: ['/servicii.html'] },
    { href: '/scoala.html', label: 'Școala', match: ['/scoala.html'] },
    { href: '/despre.html', label: 'Despre', match: ['/despre.html'] },
    { href: '/contact.html', label: 'Contact', match: ['/contact.html'] }
];

function getCurrentPath() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    return path;
}

// Collects matches inside `root`, including `root` itself when it matches —
// mutation records hand us the added node, not its parent.
function collect(root, selector) {
    if (!root || typeof root.querySelectorAll !== 'function') return [];
    const found = [...root.querySelectorAll(selector)];
    if (root.nodeType === 1 && root.matches(selector)) found.unshift(root);
    return found;
}

function sharedHeaderMarkup() {
    const currentPath = getCurrentPath();
    const links = primaryPages.map((page) => {
        const isCurrent = page.match.includes(currentPath);
        return `<a class="nova-nav-link" href="${page.href}"${isCurrent ? ' aria-current="page"' : ''}>${page.label}</a>`;
    }).join('');

    return `
        <header class="nova-header" data-header>
            <div class="nova-shell">
                <nav class="nova-nav" aria-label="Navigație principală">
                    <a class="nova-brand" href="/" aria-label="Nova Detailing — Acasă">
                        <img src="/assets/logo.svg" alt="Nova Detailing" width="360" height="50">
                    </a>
                    <div class="nova-nav-links" data-menu>
                        ${links}
                        <a class="nova-nav-mobile-cta" href="/rezervare.html">Rezervă acum <span aria-hidden="true">→</span></a>
                    </div>
                    <a class="nova-button nova-button--primary nova-button--small" href="/rezervare.html">
                        Rezervă acum <span class="nova-arrow" aria-hidden="true">→</span>
                    </a>
                    <button class="nova-menu-toggle" type="button" aria-label="Deschide meniul" aria-expanded="false" data-menu-toggle>
                        <span></span>
                    </button>
                </nav>
            </div>
        </header>
    `;
}

function sharedFooterMarkup() {
    return `
        <footer class="nova-footer">
            <div class="nova-shell">
                <div class="nova-footer-grid">
                    <div class="nova-footer-brand">
                        <a href="/" aria-label="Nova Detailing — Acasă">
                            <img src="/assets/logo.svg" alt="Nova Detailing" width="360" height="50" loading="lazy">
                        </a>
                        <p>Detailing auto și cursuri practice. Prețuri clare și rezervare online.</p>
                    </div>
                    <div>
                        <h3>Explorează</h3>
                        <ul>
                            <li><a href="/servicii.html">Servicii</a></li>
                            <li><a href="/rezervare.html">Rezervare</a></li>
                            <li><a href="/despre.html#portofoliu">Portofoliu</a></li>
                            <li><a href="/faq.html">Întrebări frecvente</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3>Academie</h3>
                        <ul>
                            <li><a href="/scoala.html">Cursuri detailing</a></li>
                            <li><a href="/scoala.html#fundamentals">Fundamentals</a></li>
                            <li><a href="/scoala.html#advanced">Advanced</a></li>
                            <li><a href="/blog.html">Jurnal Nova</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3>Contact</h3>
                        <ul>
                            <li><a href="tel:+40742122222">+40 742 122 222</a></li>
                            <li><a href="mailto:contact@novadetailing.ro">contact@novadetailing.ro</a></li>
                            <li>L–V 08:00–18:00 · S 08:00–16:00</li>
                        </ul>
                    </div>
                </div>
                <div class="nova-footer-bottom">
                    <span>© <span data-current-year>2026</span> Nova Detailing. Toate drepturile rezervate.</span>
                    <span class="nova-footer-legal">
                        <a href="/politici.html">Termeni și condiții</a>
                        <a href="/politici.html#confidentialitate">Confidențialitate</a>
                    </span>
                </div>
            </div>
        </footer>
    `;
}

function setupWhatsAppFloat() {
    if (document.querySelector('[data-whatsapp-float]')) return;

    const whatsappUrl = new URL(`https://wa.me/${WHATSAPP_NUMBER}`);
    whatsappUrl.searchParams.set('text', WHATSAPP_MESSAGE);

    const link = document.createElement('a');
    link.className = 'nova-whatsapp-float';
    link.href = whatsappUrl.toString();
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.dataset.whatsappFloat = '';
    link.setAttribute('aria-label', 'Scrie-ne pe WhatsApp la +40 742 122 222');
    link.title = 'Scrie-ne pe WhatsApp';
    link.innerHTML = `
        <span class="nova-whatsapp-float__tooltip" aria-hidden="true">Scrie-ne pe WhatsApp</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
    `;

    document.body.append(link);
}

// Card restyling has to be re-runnable: Alpine renders `x-for` content after this
// module evaluates, and re-renders it on every filter change.
function enhanceCards(root) {
    if (!isInnerPage) return;

    collect(root, CARD_SELECTOR).forEach((element) => {
        if (enhancedCards.has(element)) return;
        enhancedCards.add(element);

        const classes = [...element.classList];
        const isRounded = classes.some((name) => name.startsWith('rounded'));
        const isCard = classes.includes('card-hover')
            || (isRounded && (
                classes.includes('border')
                || classes.includes('shadow-soft')
                || classes.includes('shadow-soft-lg')
                || classes.includes('bg-white')
                || classes.includes('bg-light-100')
            ));

        if (!isCard || element.closest('.nova-header, .nova-footer')) return;
        element.classList.add('nova-auto-card');

        if (classes.includes('card-hover') || element.matches('a')) {
            element.classList.add('glare-card');
            element.dataset.glare = '';
        }
    });

    collect(root, '.btn-glass').forEach((button) => {
        if (!button.classList.contains('nova-button')) {
            button.classList.add('nova-button');
        }
        if (!button.classList.contains('nova-button--primary')) {
            button.classList.add('nova-button--primary');
        }
    });

    collect(root, '.btn-glass-outline').forEach((button) => {
        if (!button.classList.contains('nova-button')) {
            button.classList.add('nova-button');
        }
        if (!button.classList.contains('nova-button--secondary')) {
            button.classList.add('nova-button--secondary');
        }
    });

    collect(root, '.gold-line, .gold-shimmer').forEach((accent) => {
        accent.classList.add('nova-page-accent');
    });

    collect(root, '[class*="bg-primary/10"]').forEach((icon) => {
        icon.classList.add('nova-icon-well');
    });
}

function applyInnerPageDesign() {
    if (!isInnerPage) return;

    const legacyNavigation = document.querySelector('#main-nav');
    if (legacyNavigation) {
        legacyNavigation.insertAdjacentHTML('beforebegin', sharedHeaderMarkup());
        legacyNavigation.remove();
    }

    const legacyFooter = document.querySelector('footer:not(.nova-footer)');
    if (legacyFooter) {
        legacyFooter.insertAdjacentHTML('beforebegin', sharedFooterMarkup());
        legacyFooter.remove();
    }

    const heading = document.querySelector('h1');
    const hero = heading?.closest('section');
    if (hero) {
        hero.classList.add('nova-inner-hero');
        const hasMedia = Boolean(
            hero.querySelector('img, [style*="background-image"]')
            || hero.classList.contains('bg-light-950')
        );
        hero.classList.toggle('nova-inner-hero--media', hasMedia);
    }

    const header = document.querySelector('.nova-header');
    const breadcrumb = header?.nextElementSibling;
    if (breadcrumb && breadcrumb !== hero && breadcrumb.querySelector('nav')) {
        breadcrumb.classList.add('nova-breadcrumb');
        document.body.classList.add('nova-has-breadcrumb');
    }

    enhanceCards(document.body);
}

function setupNavigation() {
    const header = document.querySelector('[data-header]');
    const menuButton = document.querySelector('[data-menu-toggle]');
    const menu = document.querySelector('[data-menu]');
    const mobileBooking = document.querySelector('[data-mobile-booking]');
    // Inner pages have .nova-inner-hero, not .nova-hero. Matching only the latter
    // left the injected mobile booking bar permanently off-screen on all of them.
    const hero = document.querySelector('.nova-hero, .nova-inner-hero');
    let ticking = false;

    // Measured out of band — reading offsetHeight inside the scroll callback
    // forces a synchronous layout on every frame.
    let heroHeight = 0;
    const measureHero = () => {
        heroHeight = hero ? hero.offsetHeight : Math.round(window.innerHeight * 0.8);
    };
    measureHero();

    if (hero && 'ResizeObserver' in window) {
        // The hero holds a high-priority image; its height changes when that loads.
        new ResizeObserver(measureHero).observe(hero);
    } else {
        window.addEventListener('resize', measureHero, { passive: true });
    }

    const updateScrollState = () => {
        const scrollPosition = window.scrollY;
        header?.classList.toggle('is-scrolled', scrollPosition > 28);

        if (mobileBooking) {
            mobileBooking.classList.toggle('is-visible', scrollPosition > heroHeight * 0.72);
        }

        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateScrollState);
            ticking = true;
        }
    }, { passive: true });

    updateScrollState();

    if (!menuButton || !menu) return;

    const setMenuState = (isOpen) => {
        menuButton.setAttribute('aria-expanded', String(isOpen));
        menuButton.setAttribute('aria-label', isOpen ? 'Închide meniul' : 'Deschide meniul');
        menu.classList.toggle('is-open', isOpen);
    };

    menuButton.addEventListener('click', () => {
        setMenuState(menuButton.getAttribute('aria-expanded') !== 'true');
    });

    menu.addEventListener('click', (event) => {
        if (event.target.closest('a')) setMenuState(false);
    });

    document.addEventListener('click', (event) => {
        if (!menu.contains(event.target) && !menuButton.contains(event.target)) {
            setMenuState(false);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setMenuState(false);
    });
}

function markRevealed(element) {
    element.classList.add(element.hasAttribute('data-reveal') ? 'is-revealed' : 'revealed');
}

function observeReveals(root) {
    collect(root, REVEAL_SELECTOR).forEach((element) => {
        if (observedReveals.has(element)) return;
        observedReveals.add(element);

        if (revealObserver) {
            revealObserver.observe(element);
        } else {
            markRevealed(element);
        }
    });
}

function setupScrollReveals() {
    // A zero-area viewport (some embedded/headless contexts, print) can never
    // satisfy an intersection threshold, which would leave everything hidden.
    const viewportHasArea = window.innerHeight > 0 && window.innerWidth > 0;

    if (!motionIsReduced && viewportHasArea && 'IntersectionObserver' in window) {
        revealObserver = new IntersectionObserver((entries, currentObserver) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                markRevealed(entry.target);
                currentObserver.unobserve(entry.target);
            });
        }, {
            rootMargin: '0px 0px -9% 0px',
            threshold: 0.12
        });
    }

    observeReveals(document.body);

    // Disarms the failsafe in each page's <head>, which otherwise strips
    // `.nova-js` after 3s and un-hides everything. Set only once reveals are
    // actually wired, so a throw anywhere above still surfaces the content.
    document.documentElement.setAttribute('data-nova-ready', '');
}

// One delegated pair of listeners instead of two per card — cards are added and
// removed by Alpine, and per-node binding both leaks and misses new nodes.
function setupGlareCards() {
    if (!finePointer || motionIsReduced) return;

    let frame = 0;
    let pending = null;

    const resetCard = (card) => {
        card.style.setProperty('--mx', '80%');
        card.style.setProperty('--my', '10%');
    };

    document.addEventListener('pointermove', (event) => {
        const card = event.target instanceof Element ? event.target.closest('[data-glare]') : null;
        if (!card) return;

        pending = { card, clientX: event.clientX, clientY: event.clientY };
        if (frame) return;

        frame = window.requestAnimationFrame(() => {
            frame = 0;
            if (!pending) return;

            const { card: target, clientX, clientY } = pending;
            const bounds = target.getBoundingClientRect();
            if (!bounds.width || !bounds.height) return;

            const x = Math.min(Math.max((clientX - bounds.left) / bounds.width, 0), 1);
            const y = Math.min(Math.max((clientY - bounds.top) / bounds.height, 0), 1);

            target.style.setProperty('--mx', `${Math.round(x * 100)}%`);
            target.style.setProperty('--my', `${Math.round(y * 100)}%`);
        });
    }, { passive: true });

    document.addEventListener('pointerout', (event) => {
        const card = event.target instanceof Element ? event.target.closest('[data-glare]') : null;
        if (!card) return;
        if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;

        pending = null;
        resetCard(card);
    }, { passive: true });
}

// Liquid controls respond to the pointer like a small optical lens. The light
// is localized instead of playing a canned sweep animation, so every movement
// is caused by the visitor and the resting state remains quiet.
function setupLiquidControls() {
    if (!finePointer || motionIsReduced) return;

    let frame = 0;
    let pending = null;

    const resetControl = (control) => {
        control.style.setProperty('--glass-x', '18%');
        control.style.setProperty('--glass-y', '0%');
        control.classList.remove('is-optically-active');
    };

    document.addEventListener('pointermove', (event) => {
        const control = event.target instanceof Element
            ? event.target.closest(LIQUID_CONTROL_SELECTOR)
            : null;
        if (!control) return;

        pending = { control, clientX: event.clientX, clientY: event.clientY };
        if (frame) return;

        frame = window.requestAnimationFrame(() => {
            frame = 0;
            if (!pending) return;

            const { control: target, clientX, clientY } = pending;
            const bounds = target.getBoundingClientRect();
            if (!bounds.width || !bounds.height) return;

            const x = Math.min(Math.max((clientX - bounds.left) / bounds.width, 0), 1);
            const y = Math.min(Math.max((clientY - bounds.top) / bounds.height, 0), 1);
            target.style.setProperty('--glass-x', `${Math.round(x * 100)}%`);
            target.style.setProperty('--glass-y', `${Math.round(y * 100)}%`);
            target.classList.add('is-optically-active');
        });
    }, { passive: true });

    document.addEventListener('pointerout', (event) => {
        const control = event.target instanceof Element
            ? event.target.closest(LIQUID_CONTROL_SELECTOR)
            : null;
        if (!control) return;
        if (event.relatedTarget instanceof Node && control.contains(event.relatedTarget)) return;

        pending = null;
        resetControl(control);
    }, { passive: true });
}

function setupComparisonSlider() {
    const comparison = document.querySelector('[data-comparison]');
    const range = comparison?.querySelector('[data-comparison-range]');
    const output = comparison?.querySelector('[data-comparison-output]');
    if (!comparison || !range) return;

    const updateSplit = () => {
        const value = Number(range.value);
        comparison.style.setProperty('--split', `${value}%`);
        range.setAttribute('aria-valuetext', `${value}% suprafață finisată`);
        if (output) output.textContent = `${value}%`;
    };

    range.addEventListener('input', updateSplit, { passive: true });
    updateSplit();
}

function setupCounters() {
    const counters = [...document.querySelectorAll('[data-count]')];
    if (!counters.length) return;

    const animateCounter = (element) => {
        const target = Number(element.dataset.count);
        const suffix = element.dataset.suffix || '';
        if (!Number.isFinite(target)) return;

        if (motionIsReduced) {
            element.textContent = `${target.toLocaleString('ro-RO')}${suffix}`;
            return;
        }

        const start = window.performance.now();
        const duration = 1000;

        const frame = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(target * easedProgress);
            element.textContent = `${current.toLocaleString('ro-RO')}${suffix}`;
            if (progress < 1) window.requestAnimationFrame(frame);
        };

        window.requestAnimationFrame(frame);
    };

    if (!('IntersectionObserver' in window)) {
        counters.forEach(animateCounter);
        return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            animateCounter(entry.target);
            currentObserver.unobserve(entry.target);
        });
    }, { threshold: 0.7 });

    counters.forEach((counter) => observer.observe(counter));
}

function setupCurrentYear() {
    document.querySelectorAll('[data-current-year]').forEach((element) => {
        element.textContent = String(new Date().getFullYear());
    });
}

function setupAccordions() {
    document.querySelectorAll('button').forEach((button, index) => {
        const panel = button.nextElementSibling;
        if (!panel?.hasAttribute('x-show') || !panel.classList.contains('px-6')) return;

        const panelId = `faq-panel-${index + 1}`;
        button.type = 'button';
        button.setAttribute('aria-controls', panelId);
        panel.id = panelId;
        panel.setAttribute('role', 'region');

        const syncState = () => {
            button.setAttribute('aria-expanded', String(panel.style.display !== 'none'));
        };

        const observer = new MutationObserver(syncState);
        observer.observe(panel, { attributes: true, attributeFilter: ['style', 'class'] });
        window.requestAnimationFrame(syncState);
    });
}

// Alpine renders `x-for` content after this module evaluates and re-renders it on
// every filter change, so nodes have to be picked up as they appear.
function watchForDynamicContent() {
    if (!('MutationObserver' in window)) return;

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                enhanceCards(node);
                observeReveals(node);
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function setupServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js').catch(() => {
                // The site remains fully usable when offline support is unavailable.
            });
        }, { once: true });
    }
}

// Reveals are wired first and each step is isolated: a throw in any one of these
// must not leave `.reveal` content stranded at opacity 0, which is the one
// failure mode here that blanks a page rather than merely degrading it.
function run(step) {
    try {
        step();
    } catch (error) {
        console.error(`nova-home: ${step.name} failed`, error);
    }
}

run(applyInnerPageDesign);
run(setupWhatsAppFloat);
run(setupScrollReveals);
run(watchForDynamicContent);
run(setupNavigation);
run(setupGlareCards);
run(setupLiquidControls);
run(setupComparisonSlider);
run(setupCounters);
run(setupCurrentYear);
run(setupAccordions);
run(setupServiceWorker);
