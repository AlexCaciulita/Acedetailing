export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const bookingData = req.body;

    const bookingInfo = {
      timestamp: bookingData.timestamp || new Date().toISOString(),
      name: bookingData.name,
      phone: bookingData.phone,
      email: bookingData.email,
      date: bookingData.date,
      time: bookingData.time,
      carBrand: bookingData.carBrand || 'N/A',
      carModel: bookingData.carModel || 'N/A',
      carYear: bookingData.carYear || 'N/A',
      notes: bookingData.notes || '',
      estimatedAmount: bookingData.estimatedAmount || 0,
      configuration: bookingData.configuration || null
    };

    console.log('=== NEW BOOKING RECEIVED ===');
    console.log('Timestamp:', bookingInfo.timestamp);
    console.log('Customer:', bookingInfo.name);
    console.log('Phone:', bookingInfo.phone);
    console.log('Email:', bookingInfo.email);
    console.log('Date:', bookingInfo.date);
    console.log('Time:', bookingInfo.time);
    console.log('Car:', `${bookingInfo.carBrand} ${bookingInfo.carModel} (${bookingInfo.carYear})`);
    console.log('Estimated Amount:', bookingInfo.estimatedAmount, 'RON');
    console.log('Notes:', bookingInfo.notes);

    if (bookingInfo.configuration) {
      console.log('Configuration:', JSON.stringify(bookingInfo.configuration, null, 2));
    }
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
- Marca: ${bookingInfo.carBrand}
- Model: ${bookingInfo.carModel}
- An: ${bookingInfo.carYear}

PREȚ ESTIMAT: ${bookingInfo.estimatedAmount} RON

${bookingInfo.configuration ? `
SERVICII SELECTATE:
${bookingInfo.configuration.services?.exterior ? '✓ Spălare Exterior\n' : ''}${bookingInfo.configuration.services?.interior ? '✓ Curățare Interior\n' : ''}${bookingInfo.configuration.services?.motor ? '✓ Curățare Motor\n' : ''}${bookingInfo.configuration.services?.ceramic ? '✓ Protecție Ceramică\n' : ''}${bookingInfo.configuration.services?.headlights ? '✓ Polish Faruri\n' : ''}${bookingInfo.configuration.services?.odor ? '✓ Eliminare Mirosuri\n' : ''}
Dimensiune: ${bookingInfo.configuration.carSize || 'N/A'}
Stare: ${bookingInfo.configuration.condition || 'N/A'}
Durată estimată: ${bookingInfo.configuration.totalTime || 0} minute
` : ''}

${bookingInfo.notes ? `NOTIȚE:\n${bookingInfo.notes}` : ''}

Plata se va face la fața locului.
`;

    const customerEmailSubject = 'Confirmare rezervare - Scuderia Vision';
    const customerEmailBody = `
Bună ziua ${bookingInfo.name},

Îți mulțumim pentru rezervarea făcută la Scuderia Vision!

DETALII REZERVARE:
- Data: ${bookingInfo.date}
- Ora: ${bookingInfo.time}
${bookingInfo.configuration ? `- Preț estimat: ${bookingInfo.estimatedAmount} RON
` : ''}
MASINA:
- ${bookingInfo.carBrand} ${bookingInfo.carModel} (${bookingInfo.carYear})

${bookingInfo.configuration ? `SERVICII SELECTATE:
${bookingInfo.configuration.services?.exterior ? '✓ Spălare Exterior\n' : ''}${bookingInfo.configuration.services?.interior ? '✓ Curățare Interior\n' : ''}${bookingInfo.configuration.services?.motor ? '✓ Curățare Motor\n' : ''}${bookingInfo.configuration.services?.ceramic ? '✓ Protecție Ceramică\n' : ''}${bookingInfo.configuration.services?.headlights ? '✓ Polish Faruri\n' : ''}${bookingInfo.configuration.services?.odor ? '✓ Eliminare Mirosuri\n' : ''}
` : ''}
Plata se va face la fața locului (numerar sau card).

Dacă ai întrebări sau dorești să modifici rezervarea, te rugăm să ne contactezi:
- Telefon: +40 742 122 222
- Email: contact@scuderiavision.ro

Cu stimă,
Echipa Scuderia Vision
Detaliu care se vede. Luciu care rămâne.
`;

    console.log('=== EMAILS TO SEND ===');
    console.log('Business Email To: contact@scuderiavision.ro');
    console.log('Customer Email To:', bookingInfo.email);
    console.log('Subject:', emailSubject);
    console.log('======================');

    if (process.env.EMAIL_SERVICE_URL && process.env.EMAIL_API_KEY) {
      try {
        await fetch(process.env.EMAIL_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`
          },
          body: JSON.stringify({
            from: 'rezervari@scuderiavision.ro',
            to: 'contact@scuderiavision.ro',
            subject: emailSubject,
            text: emailBody
          })
        });
        console.log('Business email sent successfully to contact@scuderiavision.ro');
      } catch (emailError) {
        console.error('Failed to send business email:', emailError);
      }

      try {
        await fetch(process.env.EMAIL_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`
          },
          body: JSON.stringify({
            from: 'rezervari@scuderiavision.ro',
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
      console.log('To: contact@scuderiavision.ro');
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
      bookingId: `BK-${Date.now()}`
    });

  } catch (error) {
    console.error('Error processing booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Eroare la procesarea rezervării'
    });
  }
}
