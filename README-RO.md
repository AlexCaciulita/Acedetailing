# Scuderia Vision - Website Auto Detailing

Website static cu configurator de preț, plăți PayU și PWA pentru business de auto detailing.

## 🚀 Caracteristici

- **Website static** HTML + TailwindCSS + Alpine.js
- **Configurator preț transparent** cu calcule live
- **Plăți avans prin PayU România** (redirect hosted page)
- **PWA minimal** (manifest + service worker pentru cache offline)
- **2 funcții serverless** pentru gestionarea plăților
- **Log CSV simplu** pentru tracking rezervări (fără bază de date)
- **Emailuri de confirmare** automată sau manual
- **Design responsiv** și accesibil (WCAG AA)
- **SEO optimizat** pentru piața românească

## 📁 Structura Proiectului

```
/public/
  ├── index.html              # Pagina principală cu canvas interactiv
  ├── servicii.html           # Lista completă servicii & pachete
  ├── configurator.html       # Configurator preț live
  ├── rezervare.html          # Formular rezervare + plată PayU
  ├── faq.html               # Întrebări frecvente
  ├── contact.html           # Contact cu formular
  ├── politici.html          # Termeni, GDPR, cookies
  ├── manifest.webmanifest   # PWA manifest
  ├── service-worker.js      # Cache offline pentru PWA
  ├── sitemap.xml           # Sitemap SEO
  └── assets/               # Imagini, iconuri, logo
      ├── logo.svg
      └── favicon.svg

/api/
  ├── payu-create-order.js  # Endpoint creare comandă PayU
  └── payu-notify.js       # Endpoint notificare PayU (webhook)

README-RO.md              # Acest fișier
```

## ⚙️ Setarea Variabilelor de Mediu

Pentru a funcționa complet, trebuie să setezi următoarele variabile de mediu:

### Variabile PayU (obligatorii)
```bash
PAYU_MERCHANT_ID=your_merchant_id
PAYU_POS_ID=your_pos_id  
PAYU_SECRET_KEY=your_secret_key
PAYU_API_URL=https://secure.snd.payu.com/api/v2_1/orders    # sandbox
# PAYU_API_URL=https://secure.payu.com/api/v2_1/orders     # production
PAYU_RETURN_URL=https://your-domain.com/rezervare.html?status=return
PAYU_NOTIFY_URL=https://your-domain.com/api/payu-notify
```

### Variabile Business (obligatorii)
```bash
BUSINESS_EMAIL=programari@scuderia-vision.ro
```

### Variabile Email (opționale - pentru trimitere automată)
```bash
EMAIL_SERVICE_URL=https://api.resend.com/emails           # sau SendGrid
EMAIL_API_KEY=your_email_service_api_key
```

## 🌐 Deploy pe Netlify

### 1. Clonează și configurează proiectul (Recomandat)

```bash
# Clonează repository-ul
git clone <your-repo>
cd detailers-vision

# Instalează Netlify CLI (dacă nu ai deja)
npm install -g netlify-cli

# Conectează la Netlify
netlify login
netlify init
```

### 2. Configurează variabilele de mediu în Netlify

```bash
# Setează variabilele în Netlify dashboard sau prin CLI
netlify env:set PAYU_MERCHANT_ID your_merchant_id
netlify env:set PAYU_POS_ID your_pos_id
netlify env:set PAYU_SECRET_KEY your_secret_key
netlify env:set PAYU_API_URL https://secure.snd.payu.com/api/v2_1/orders
netlify env:set BUSINESS_EMAIL programari@your-domain.com

# Opțional - pentru emailuri automatizate
netlify env:set EMAIL_SERVICE_URL https://api.resend.com/emails
netlify env:set EMAIL_API_KEY your_resend_api_key
```

### 3. Deploy website-ul

```bash
# Build și deploy
netlify deploy --prod --dir=public
```

## 📝 Configurarea PayU România

### 1. Cont PayU Sandbox (pentru teste)
1. Creează cont la [PayU Developer](https://developers.payu.com/ro/)
2. Obține credențialele sandbox din dashboard
3. Setează URL-urile de return și notify
4. Testează cu cardurile de test furnizate

### 2. Trecerea la producție
1. Completează documentele KYB în PayU dashboard  
2. Schimbă `PAYU_API_URL` la URL-ul de producție
3. Actualizează credențialele cu cele de producție
4. Testează o tranzacție reală cu sumă mică

### 3. URL-uri importante PayU
- **Sandbox API:** `https://secure.snd.payu.com/api/v2_1/orders`
- **Production API:** `https://secure.payu.com/api/v2_1/orders`
- **Return URL:** `https://your-domain.com/rezervare.html?status=return`
- **Notify URL:** `https://your-domain.com/api/payu-notify`

## 📊 Gestionarea Rezervărilor

### Log CSV
Rezervările se salvează în log-uri CSV cu următoarea structură:
```csv
timestamp,orderRef,customerName,customerEmail,customerPhone,appointmentDate,appointmentTime,carInfo,totalAmount,advanceAmount,configuration,status,notes
```

### Vizualizarea rezervărilor
În funcțiile serverless, rezervările sunt loggate în consolă. Pentru producție, poți:

1. **Netlify:** Folosește Netlify Analytics sau integrează cu un serviciu extern
2. **Cloudflare:** Folosește KV storage sau D1 database
3. **Google Sheets:** Integrează cu Google Sheets API

### Integrare Google Sheets (opțională)
Pentru a trimite rezervările direct într-un Google Sheet:

1. Creează un Google Apps Script cu webhook
2. Adaugă URL-ul webhook în variabilele de mediu:
```bash
GOOGLE_SHEETS_WEBHOOK=https://script.google.com/macros/s/your-script-id/exec
```
3. Modifică funcția `payu-create-order` să trimită date la webhook

## 📧 Configurarea Emailurilor

### Opțiunea A: Resend (recomandat)
```bash
# Înregistrează-te la resend.com
# Obține API key și setează:
EMAIL_SERVICE_URL=https://api.resend.com/emails
EMAIL_API_KEY=re_your_api_key
```

### Opțiunea B: SendGrid
```bash
# Înregistrează-te la sendgrid.com  
# Obține API key și setează:
EMAIL_SERVICE_URL=https://api.sendgrid.com/v3/mail/send
EMAIL_API_KEY=SG.your_api_key
```

### Opțiunea C: Manual (fallback)
Dacă nu configurezi serviciul de email, conținutul emailurilor se va afișa în console pentru trimitere manuală.

## 🔧 Dezvoltare Locală

### 1. Pornește serverul local
```bash
# Servește fișierele statice
python -m http.server 8000 --directory public
# sau
npx serve public
```

### 2. Testează funcțiile local

**Pentru Netlify:**
```bash
netlify dev
```

## 🎨 Personalizarea Design-ului

### Culori principale (Tailwind config)
```javascript
colors: {
  primary: '#1E40AF',    // Albastru principal
  secondary: '#059669',  // Verde secundar  
  accent: '#EA580C'      // Portocaliu accent
}
```

### Modificarea textelor
Toate textele sunt în română și pot fi modificate direct în fișierele HTML. Caută după:
- "Detaliu care se vede. Luciu care rămâne." (slogan)
- "Programează o curățare" (CTA principal)
- "Configurează pachetul tău" (CTA secundar)

### Imagini personalizate
Înlocuiește imaginile din `/public/assets/`:
- `logo.svg` - logo-ul companiei
- `favicon.svg` - favicon

## 📱 PWA (Progressive Web App)

Website-ul funcționează offline pentru paginile principale:
- Cache automat pentru HTML, CSS, JS
- Funcționare offline pentru configurator
- Notificare utilizator despre disponibilitatea offline
- Manifest pentru instalare pe telefon

### Testarea PWA
1. Deschide site-ul în Chrome
2. Apasă F12 → Application → Service Workers
3. Verifică că service worker-ul este activ
4. Testează offline în Network tab → Offline

## 🔍 SEO și Analytics

### Meta tags incluse
- Title și description optimizate pentru fiecare pagină
- Open Graph pentru social media
- Sitemap.xml generat automat

### Adăugarea Google Analytics
```html
<!-- Adaugă în <head> pe toate paginile -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🛠️ Troubleshooting

### Probleme comune PayU
1. **"Invalid signature"** - Verifică PAYU_SECRET_KEY
2. **"Merchant not found"** - Verifică PAYU_MERCHANT_ID și PAYU_POS_ID
3. **"Invalid amount"** - PayU primește sume în bani (RON * 100)

### Probleme funcții serverless
```bash
# Verifică logs-urile
netlify functions:log payu-create-order
netlify functions:log payu-notify

# Sau pentru Cloudflare
wrangler tail
```

### Probleme PWA
1. Verifică că `manifest.webmanifest` este accesibil
2. Verifică că service worker se înregistrează corect
3. Testează pe HTTPS (PWA nu funcționează pe HTTP)

## 📞 Support

Pentru întrebări tehnice:
- **Email:** dev@scuderia-vision.ro  
- **Documentație PayU:** https://developers.payu.com/ro/
- **Netlify Docs:** https://docs.netlify.com/
- **Cloudflare Workers:** https://developers.cloudflare.com/workers/

## 📄 Licență

Acest proiect este proprietatea Detailer's Vision. Toate drepturile rezervate.

---

**Scuderia Vision** - Detaliu care se vede. Luciu care rămâne. ✨