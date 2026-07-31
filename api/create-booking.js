import { append } from './admin/_store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const bookingData = req.body ?? {};

    const asText = (value, max = 500) =>
      typeof value === 'string' ? value.trim().slice(0, max) : '';

    // rezervare.html sends a flat payload (timeSlot / estimatedPrice{min,max} /
    // package / size / condition / addonNames). The pre-merge configurator sent
    // time / estimatedAmount / configuration{}. Accept both so older clients and
    // any queued offline submissions keep working.
    const legacyConfig = bookingData.configuration || null;
    const price = bookingData.estimatedPrice || null;

    const bookingInfo = {
      timestamp: bookingData.timestamp || new Date().toISOString(),
      name: asText(bookingData.name, 120),
      phone: asText(bookingData.phone, 40),
      email: asText(bookingData.email, 160),
      date: asText(bookingData.date, 20),
      time: asText(bookingData.timeSlot) || asText(bookingData.time) || 'N/A',
      carModel: asText(bookingData.carModel, 120) || 'N/A',
      notes: asText(bookingData.notes, 2000),
      packageName: asText(bookingData.packageName, 120)
        || asText(legacyConfig?.packageName, 120)
        || 'N/A',
      sizeLabel: asText(bookingData.sizeLabel, 120)
        || asText(legacyConfig?.carSize, 120)
        || 'N/A',
      conditionLabel: asText(bookingData.conditionLabel, 120)
        || asText(legacyConfig?.condition, 120)
        || 'N/A',
      addonNames: Array.isArray(bookingData.addonNames)
        ? bookingData.addonNames.map((a) => asText(a, 120)).filter(Boolean)
        : (Array.isArray(legacyConfig?.addons) ? legacyConfig.addons.map((a) => asText(a, 120)) : []),
      priceText: price && Number.isFinite(price.min)
        ? (price.min === price.max
            ? `${price.min} RON`
            : `${price.min} - ${price.max} RON`)
        : (Number.isFinite(bookingData.estimatedAmount) && bookingData.estimatedAmount > 0
            ? `${bookingData.estimatedAmount} RON`
            : 'de stabilit la inspecție')
    };

    const missing = ['name', 'phone', 'email', 'date'].filter((field) => !bookingInfo[field]);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Câmpuri obligatorii lipsă: ${missing.join(', ')}`
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingInfo.email)) {
      return res.status(400).json({ success: false, message: 'Adresa de email nu este validă' });
    }

    if (bookingInfo.phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ success: false, message: 'Numărul de telefon nu este valid' });
    }

    // Persist before any email attempt: a booking that reaches us must survive
    // even if the mail provider is down, otherwise it is silently lost.
    let bookingId = null;
    try {
      bookingId = append('bookings', 'bkg', { ...bookingInfo, status: 'nou' }).id;
    } catch (storeError) {
      console.error('Failed to persist booking:', storeError);
    }

    console.log('=== NEW BOOKING RECEIVED ===');
    console.log('Timestamp:', bookingInfo.timestamp);
    console.log('Customer:', bookingInfo.name);
    console.log('Phone:', bookingInfo.phone);
    console.log('Email:', bookingInfo.email);
    console.log('Date:', bookingInfo.date);
    console.log('Time:', bookingInfo.time);
    console.log('Car:', bookingInfo.carModel, '|', bookingInfo.sizeLabel);
    console.log('Package:', bookingInfo.packageName);
    console.log('Condition:', bookingInfo.conditionLabel);
    console.log('Add-ons:', bookingInfo.addonNames.join(', ') || 'none');
    console.log('Estimated:', bookingInfo.priceText);
    console.log('Notes:', bookingInfo.notes);
    console.log('===========================');

    const emailSubject = `Rezervare nouă - ${bookingInfo.name}`;
    const emailBody = `
Rezervare nouă primită:

DETALII CLIENT:
- Nume: ${bookingInfo.name}
- Telefon: ${bookingInfo.phone}
- Email: ${bookingInfo.email}

PROGRAMARE:
- Data: ${bookingInfo.date}
- Ora: ${bookingInfo.time}

MAȘINĂ:
- Model: ${bookingInfo.carModel}
- Clasă: ${bookingInfo.sizeLabel}
- Stare: ${bookingInfo.conditionLabel}

PACHET SELECTAT: ${bookingInfo.packageName}
${bookingInfo.addonNames.length ? `Add-on-uri: ${bookingInfo.addonNames.join(', ')}` : 'Fără add-on-uri'}

PREȚ ESTIMAT: ${bookingInfo.priceText}

${bookingInfo.notes ? `NOTIȚE:\n${bookingInfo.notes}` : ''}

Plata se va face la fața locului.
`;

    const customerEmailSubject = 'Confirmare rezervare - Nova Detailing';
    const customerEmailBody = `
Bună ziua ${bookingInfo.name},

Îți mulțumim pentru rezervarea făcută la Nova Detailing!

DETALII REZERVARE:
- Data: ${bookingInfo.date}
- Ora: ${bookingInfo.time}
- Preț estimat: ${bookingInfo.priceText}

MAȘINĂ:
- ${bookingInfo.carModel} (${bookingInfo.sizeLabel})

PACHET: ${bookingInfo.packageName}
${bookingInfo.addonNames.length ? `Add-on-uri: ${bookingInfo.addonNames.join(', ')}\n` : ''}
Prețul final se confirmă după inspecția mașinii.
Plata se va face la fața locului (numerar sau card).

Dacă ai întrebări sau dorești să modifici rezervarea, te rugăm să ne contactezi:
- Telefon: +40 742 122 222
- Email: office@novadetailing.ro

Cu stimă,
Echipa Nova Detailing
Excelenta in fiecare detaliu.
`;

    console.log('=== EMAILS TO SEND ===');
    console.log('Business Email To: office@novadetailing.ro');
    console.log('Customer Email To:', bookingInfo.email);
    console.log('Subject:', emailSubject);
    console.log('======================');

    if (process.env.EMAIL_SERVICE_URL && process.env.EMAIL_API_KEY) {
      try {
        await fetch(process.env.EMAIL_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EMAIL_API_KEY}`
          },
          body: JSON.stringify({
            from: 'rezervari@novadetailing.ro',
            to: 'office@novadetailing.ro',
            subject: emailSubject,
            text: emailBody
          })
        });
        console.log('Business email sent successfully to office@novadetailing.ro');
      } catch (emailError) {
        console.error('Failed to send business email:', emailError);
      }

      try {
        await fetch(process.env.EMAIL_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EMAIL_API_KEY}`
          },
          body: JSON.stringify({
            from: 'rezervari@novadetailing.ro',
            to: bookingInfo.email,
            subject: customerEmailSubject,
            text: customerEmailBody
          })
        });
        console.log('Customer email sent successfully to', bookingInfo.email);
      } catch (emailError) {
        console.error('Failed to send customer email:', emailError);
      }
    } else {
      console.log('=== EMAIL CONTENT (Business) ===');
      console.log('To: office@novadetailing.ro');
      console.log('Subject:', emailSubject);
      console.log('Body:', emailBody);
      console.log('===============================');

      console.log('=== EMAIL CONTENT (Customer) ===');
      console.log('To:', bookingInfo.email);
      console.log('Subject:', customerEmailSubject);
      console.log('Body:', customerEmailBody);
      console.log('================================');
    }

    return res.status(200).json({
      success: true,
      message: 'Rezervare confirmată',
      bookingId: bookingId || `BK-${Date.now()}`
    });
  } catch (error) {
    console.error('Error processing booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Eroare la procesarea rezervării'
    });
  }
}

