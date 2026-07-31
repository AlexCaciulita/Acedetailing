# Nova Detailing — UI/UX Overhaul Plan

> **Context:** This is a step-by-step implementation plan for improving the UI/UX of novasdetailing.netlify.app. The site is a premium auto detailing business in Bucharest, Romania (language: Romanian). It currently has 8 pages: Home, Services (/servicii), Configurator (/configurator), School (/scoala), About (/despre), Gallery (/galerie), Contact (/contact), and Booking (/rezervare). The design system uses gold (#B8962F → #C9A84C) on dark (#1A1A1A) with Montserrat headings and Inter body text.

---

## Problem Summary

The biggest UX issue is a **fragmented pricing and booking journey**. Users encounter overlapping pricing information across four separate locations:

1. **Homepage** — 4 service cards with price ranges + "Configure" CTAs
2. **/servicii** — full service catalog, comparison table, add-ons list, subscription plans, and more "Configure" CTAs
3. **/configurator** — a 4-step price calculator (car size → condition → package → add-ons) with a WhatsApp CTA at the end
4. **/rezervare** — a 5-step booking form that **re-asks** for package, vehicle size, condition, and add-ons before collecting personal info and date

A user who clicks "Configure" from the homepage builds their config on /configurator, then has to navigate to /rezervare where they re-enter the same selections. The localStorage sync between these two pages is brittle. This duplication creates friction and kills conversions.

Secondary issues: 8 navigation items is too many, the homepage tries to show everything (stats, all packages, school, founder story, testimonials, subscriptions), and the gallery page is empty.

---

## Phase 1: Merge Configurator + Booking Into One Unified Flow

**Goal:** Replace the separate /configurator and /rezervare pages with a single /rezervare page that does everything.

### Step 1.1 — Create the unified booking page

Replace the current /rezervare page with a new 5-step flow. Keep the existing design system (gold/dark, Montserrat/Inter, card styles, animations).

**Step 1 — Vehicle Selection**
- Car size selector: show 4-5 visual cards (Compact, Sedan, SUV, Van, etc.) with silhouette icons and the size multiplier shown subtly (e.g. "coeficient: 0.85x")
- Car condition selector: 3 options (Ușoară / Medie / Avansată) with short descriptions and condition multiplier
- Text input for car model/make (optional but helpful for their records)

**Step 2 — Package Selection**
- Show all 4 service packages as cards, laid out like the current /servicii cards but interactive:
  - Professional Interior Detailing (1.800–2.600 lei base)
  - Professional Paint Correction (2.200–3.500 lei base)
  - Complete Premium (2.500–3.500 lei base) — badge: "Popular"
  - Signature Full (4.500–6.000 lei base)
- Each card expands on click to reveal the full inclusion list
- Price on each card dynamically adjusts based on the vehicle size/condition chosen in Step 1
- Selected card gets a gold border highlight

**Step 3 — Add-ons**
- Show the 8 add-on services as toggle cards (checkbox style):
  - Polișare faruri (150 lei)
  - Curățare motor profundă (300 lei)
  - Tratament piele premium (400 lei)
  - Eliminare mirosuri (ozon) (200 lei)
  - Curățare tapițerie prin extracție (300 lei)
  - Detailing jante premium (200 lei)
  - Corecție vopsea per panou (250 lei)
  - Consultanță PPF gratuită (0 lei)
- Gray out / disable add-ons that are already included in the selected package (use the existing `excludedAddons` logic from the current configurator)
- Running total updates in a sticky sidebar (desktop) or sticky bottom bar (mobile)

**Step 4 — Date & Contact Info**
- Date picker (minimum: tomorrow)
- Time slot selector: radio buttons for the 5 slots (08:00–10:00, 10:00–12:00, 12:00–14:00, 14:00–16:00, 16:00–18:00)
- Full name (required)
- Phone number (required)
- Email (required)
- Notes textarea (optional)

**Step 5 — Review & Confirm**
- Full summary card showing: vehicle info, selected package, add-ons, date/time, contact info, estimated price range
- Disclaimer: "Prețul final va fi confirmat după inspecția vehiculului"
- Two CTAs:
  - Primary: "Trimite Rezervarea" (Submit Booking) — posts to /api/create-booking
  - Secondary: "Trimite pe WhatsApp" — generates the pre-formatted WhatsApp message (keep this from the current configurator)

**Sticky price sidebar (desktop) / bottom bar (mobile):**
- Always visible from Step 2 onward
- Shows: package name, base price adjusted by multipliers, add-ons total, grand total range
- "Back" and "Next" navigation buttons

### Step 1.2 — Support deep linking and pre-selection

- Accept URL parameter `?pachet=detailing-interior` (or any package slug) to pre-select a package and skip to Step 2
- Accept URL parameter `?step=2` to start at a specific step
- Continue to save config to localStorage on each step change for session recovery
- On page load, check localStorage for a saved config and offer to resume ("Ai o configurație salvată. Vrei să continui?")

### Step 1.3 — Remove the old /configurator page

- Delete the /configurator page/route entirely
- Set up a redirect: /configurator → /rezervare (301 redirect via Netlify _redirects or netlify.toml)
- Update all internal links that pointed to /configurator to point to /rezervare instead

---

## Phase 2: Simplify the Navigation

**Goal:** Reduce from 8 nav items to 5 + a prominent CTA button.

### Step 2.1 — Update the navbar

Change the navigation links to:

| Position | Label | Route |
|----------|-------|-------|
| 1 | Acasă | / |
| 2 | Servicii | /servicii |
| 3 | Școala | /scoala |
| 4 | Despre | /despre |
| 5 | Contact | /contact |
| Right-aligned, gold button | Rezervă Acum | /rezervare |

- Remove "Configurator", "Gallery", and "Booking" as separate nav items
- The "Rezervă Acum" button should be styled as a filled gold button (background: gold gradient, text: dark), distinct from the text links
- On mobile hamburger menu: same 5 links + the gold button at the bottom of the menu

### Step 2.2 — Absorb the gallery

- Move the gallery into the /despre (About) page as a section below the equipment/products section
- Title it "Portofoliul Nostru" (Our Portfolio)
- Keep the category filter tabs (Interior, Exterior, Polish & Protecție, Signature)
- Keep the masonry grid and lightbox functionality
- Delete the standalone /galerie page
- Add redirect: /galerie → /despre#portofoliu

---

## Phase 3: Redesign the Homepage as a Conversion Funnel

**Goal:** Streamline the homepage to guide visitors toward booking, rather than showing everything.

### Step 3.1 — Simplify the hero section

- Keep the full-width background image
- Headline: "NOVA DETAILING" (large, gold shimmer effect — keep this)
- Subheadline: "Premium Auto Detailing în București" (shorter, cleaner)
- Single primary CTA button: "Calculează Prețul" → links to /rezervare
- Single secondary text link: "Descoperă Serviciile" → scrolls to services preview section below
- Remove the second CTA button that currently duplicates the booking action

### Step 3.2 — Keep the stats bar (no changes needed)

- 10+ ani experiență, 1000+ mașini, Carte publicată
- This works well as a trust signal, leave it as-is

### Step 3.3 — Redesign the services preview section

Replace the current 4 full-price-card layout with a **teaser grid**:

- Show 4 cards, but simplified:
  - Package name
  - 1-line description (not the full bullet list)
  - "De la X lei" (starting price only, not a range)
  - Duration badge
  - Small "Află mai mult →" link to /servicii
- At the bottom of the section: one centered gold CTA button: "Configurează și Rezervă" → /rezervare
- Remove the individual "Configureaza" buttons from each card on the homepage (those now only exist on /servicii)

### Step 3.4 — Add a testimonials section

- Place this right after the services preview
- If real testimonials are available, show 3 cards in a horizontal scroll/carousel
- If not yet available, set up the structure with placeholder content that can be easily replaced (use a data array/JSON)
- Each card: customer name, car model, star rating, short quote, date

### Step 3.5 — Add a school teaser (simplified)

Replace the current full 3-course layout with a compact teaser:

- Small section with heading: "Învață Arta Detailing-ului"
- 2-3 sentence description
- Single CTA: "Vezi Cursurile" → /scoala
- Optional: show a single stat ("100+ absolvenți")
- Do NOT show all 3 course cards or pricing on the homepage

### Step 3.6 — Remove from the homepage

Remove these sections entirely from the homepage (they live on their dedicated pages):

- The founder story / about section (lives on /despre)
- The subscription plans section (move to /servicii)
- The full school course cards with pricing (simplified teaser replaces this)
- Any duplicate contact information (footer is sufficient)

### Step 3.7 — Homepage final section order (top to bottom)

1. Hero (background image + headline + single CTA)
2. Stats bar (3 metrics)
3. Services preview (4 teaser cards + CTA to booking)
4. Testimonials (3 cards or carousel)
5. School teaser (compact, 1 CTA)
6. Footer

---

## Phase 4: Improve the Services Page (/servicii)

**Goal:** Make /servicii the single source of truth for all service details and pricing.

### Step 4.1 — Add tab navigation at the top of /servicii

Create tabs or a segmented control to organize the page:

- **Tab 1: Pachete** (Packages) — the 4 main service packages, shown as the current detailed cards
- **Tab 2: Comparație** (Comparison) — the comparison table (already exists, promote it)
- **Tab 3: Servicii Extra** (Add-ons) — the 8 add-on services
- **Tab 4: Abonamente** (Subscriptions) — the Monthly + VIP Annual plans (moved from homepage)

This prevents the current issue of one massive scrolling page.

### Step 4.2 — Add "Rezervă" buttons to each package card

Each package card on /servicii should have a CTA button: "Rezervă cu acest pachet" which links to `/rezervare?pachet=PACKAGE_SLUG`. This takes the user directly to the unified booking flow with that package pre-selected.

### Step 4.3 — Improve the comparison table

- Make it horizontally scrollable on mobile
- Add a sticky header row so package names stay visible while scrolling
- Add a "Alege" (Choose) button at the bottom of each column that links to `/rezervare?pachet=PACKAGE_SLUG`
- Use checkmark (✓) and dash (—) icons instead of plain text for included/not-included features

### Step 4.4 — Add the "How We Price" explainer

Move the pricing transparency section (size multipliers, condition multipliers) to be more prominent. Place it as a collapsible/accordion section just above the packages tab, or as a floating info tooltip next to the price on each card. The current buried position on /servicii means most users never see it.

---

## Phase 5: Polish & Minor UX Improvements

### Step 5.1 — Reduce chat widget visual weight

- Change the floating chat button from gold-gradient to a more subtle dark (#2A2A2A) with a small gold icon
- Add a slight delay: only show the chat button after the user has been on the page for 15 seconds or has scrolled past 50% of the viewport
- On mobile: make the button smaller (48px instead of 56px+) to avoid overlapping content

### Step 5.2 — Improve mobile navigation

- With the simplified 5-item nav, the hamburger menu should feel less overwhelming
- Ensure the "Rezervă Acum" gold button is prominently placed at the bottom of the mobile menu
- Add a subtle close animation to the hamburger menu

### Step 5.3 — Add breadcrumbs to inner pages

On /servicii, /scoala, /despre, /contact, and /rezervare, add a simple breadcrumb trail below the navbar:

```
Acasă > Servicii
Acasă > Rezervare
```

Style: small text, light gray, gold hover color. This improves orientation especially when users arrive via deep links.

### Step 5.4 — Sticky CTA on mobile

On the homepage, when the user scrolls past the hero section, show a small sticky bottom bar with the "Rezervă Acum" button. This ensures the primary CTA is always accessible without scrolling back up.

### Step 5.5 — Loading and empty states

- The gallery currently shows "Nu există imagini în această categorie" — if no images are available yet, show a visually appealing placeholder with a message like "Portofoliul nostru este în actualizare. Între timp, contactează-ne pentru exemple."
- Add skeleton loaders to the booking flow steps while price calculations are running

### Step 5.6 — Form validation UX

On the unified booking page:
- Show inline validation errors (red border + message below field) instead of only blocking submit
- Auto-format the phone number field as the user types
- Validate email format on blur
- Show a green checkmark on valid fields for positive feedback

---

## Phase 6: SEO & Technical Cleanup

### Step 6.1 — Update Netlify redirects

Add to `_redirects` or `netlify.toml`:

```
/configurator    /rezervare    301
/galerie         /despre#portofoliu    301
```

### Step 6.2 — Update internal links everywhere

Search the entire codebase for any links to `/configurator` or `/galerie` and update them:
- `/configurator` → `/rezervare`
- `/galerie` → `/despre#portofoliu`

### Step 6.3 — Update structured data (JSON-LD)

The existing LocalBusiness schema should be updated to reflect the new page structure. Ensure the `hasOfferCatalog` points to /servicii and any service URLs are correct.

### Step 6.4 — Update page meta titles and descriptions

Each page should have a unique, descriptive `<title>` and `<meta name="description">`:
- Home: "Nova Detailing — Premium Auto Detailing în București"
- Servicii: "Servicii și Prețuri Detailing Auto — Nova Detailing București"
- Rezervare: "Rezervă o Programare — Nova Detailing București"
- Școala: "Școala de Detailing Auto — Cursuri Practice — Nova Detailing"
- Despre: "Despre Nova Detailing — Povestea Noastră & Galerie"
- Contact: "Contact — Nova Detailing București"

---

## Implementation Order (Suggested)

Work through these in order, as later phases depend on earlier ones:

1. **Phase 1** (Merge configurator + booking) — this is the highest-impact change
2. **Phase 2** (Simplify nav) — quick win, makes the site feel cleaner immediately
3. **Phase 3** (Redesign homepage) — depends on Phase 1 being done so CTAs link correctly
4. **Phase 4** (Improve /servicii) — depends on Phase 1 for the "Rezervă cu acest pachet" links
5. **Phase 5** (Polish) — can be done incrementally
6. **Phase 6** (SEO/redirects) — do after all page changes are finalized

---

## Design Constraints (Do Not Change)

- **Color palette:** Gold gradient (#B8962F → #C9A84C), dark (#1A1A1A), grays
- **Typography:** Montserrat for headings, Inter for body
- **Animations:** Keep the existing fade-in-up, scale-in, and card hover effects
- **Language:** Romanian throughout (keep all existing Romanian copy, only change structure)
- **Chat widget:** Keep functionality, just adjust styling/timing
- **API endpoint:** /api/create-booking — keep the same payload structure
- **WhatsApp integration:** Keep the pre-formatted WhatsApp message generation
- **PWA / Service Worker:** Keep existing setup
