export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const enrollmentData = req.body ?? {};

    const enrollmentInfo = {
      timestamp: enrollmentData.timestamp || new Date().toISOString(),
      name: enrollmentData.name,
      phone: enrollmentData.phone,
      email: enrollmentData.email,
      course: enrollmentData.course || 'N/A',
      experience: enrollmentData.experience || 'N/A',
      notes: enrollmentData.notes || ''
    };

    console.log('=== NEW ENROLLMENT RECEIVED ===');
    console.log('Timestamp:', enrollmentInfo.timestamp);
    console.log('Student:', enrollmentInfo.name);
    console.log('Phone:', enrollmentInfo.phone);
    console.log('Email:', enrollmentInfo.email);
    console.log('Course:', enrollmentInfo.course);
    console.log('Experience:', enrollmentInfo.experience);
    console.log('Notes:', enrollmentInfo.notes);
    console.log('===============================');

    const emailSubject = `Inscriere noua curs - ${enrollmentInfo.name}`;
    const emailBody = `
Inscriere noua primita pentru Scoala de Detailing:

DETALII STUDENT:
- Nume: ${enrollmentInfo.name}
- Telefon: ${enrollmentInfo.phone}
- Email: ${enrollmentInfo.email}

CURS SELECTAT: ${enrollmentInfo.course}
EXPERIENTA: ${enrollmentInfo.experience}

${enrollmentInfo.notes ? `NOTE:\n${enrollmentInfo.notes}` : ''}
`;

    const studentEmailSubject = 'Confirmare inscriere - Ace Detailing Scoala';
    const studentEmailBody = `
Buna ziua ${enrollmentInfo.name},

Iti multumim pentru inscrierea la Scoala de Detailing Ace Detailing!

DETALII INSCRIERE:
- Curs: ${enrollmentInfo.course}

Te vom contacta in curand pentru a confirma data de inceput si detaliile de plata.

Avans necesar: 50% din valoarea cursului la inscriere.

Daca ai intrebari, ne poti contacta:
- Telefon: +40 742 122 222
- Email: contact@acedetailing.ro

Cu stima,
Echipa Ace Detailing
Excelenta in fiecare detaliu.
`;

    console.log('=== EMAILS TO SEND ===');
    console.log('Business Email To: contact@acedetailing.ro');
    console.log('Student Email To:', enrollmentInfo.email);
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
            from: 'scoala@acedetailing.ro',
            to: process.env.BUSINESS_EMAIL || 'contact@acedetailing.ro',
            subject: emailSubject,
            text: emailBody
          })
        });
        console.log('Business email sent successfully');
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
            from: 'scoala@acedetailing.ro',
            to: enrollmentInfo.email,
            subject: studentEmailSubject,
            text: studentEmailBody
          })
        });
        console.log('Student email sent successfully to', enrollmentInfo.email);
      } catch (emailError) {
        console.error('Failed to send student email:', emailError);
      }
    } else {
      console.log('=== EMAIL CONTENT (Business) ===');
      console.log('To: contact@acedetailing.ro');
      console.log('Subject:', emailSubject);
      console.log('Body:', emailBody);
      console.log('===============================');

      console.log('=== EMAIL CONTENT (Student) ===');
      console.log('To:', enrollmentInfo.email);
      console.log('Subject:', studentEmailSubject);
      console.log('Body:', studentEmailBody);
      console.log('================================');
    }

    return res.status(200).json({
      success: true,
      message: 'Inscriere confirmata',
      enrollmentId: `EN-${Date.now()}`
    });
  } catch (error) {
    console.error('Error processing enrollment:', error);
    return res.status(500).json({
      success: false,
      message: 'Eroare la procesarea inscrierii'
    });
  }
}
