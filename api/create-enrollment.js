import { append } from './admin/_store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const enrollmentData = req.body ?? {};

    const asText = (value, max = 500) =>
      typeof value === 'string' ? value.trim().slice(0, max) : '';

    if (asText(enrollmentData.website, 200)) {
      return res.status(200).json({ success: true, message: 'Inscriere confirmata' });
    }

    const enrollmentInfo = {
      timestamp: asText(enrollmentData.timestamp, 40) || new Date().toISOString(),
      name: asText(enrollmentData.name, 120),
      phone: asText(enrollmentData.phone, 40),
      email: asText(enrollmentData.email, 160),
      course: asText(enrollmentData.course, 160) || 'N/A',
      experience: asText(enrollmentData.experience, 500) || 'N/A',
      notes: asText(enrollmentData.notes, 2000)
    };

    const missing = ['name', 'phone', 'email'].filter((field) => !enrollmentInfo[field]);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Câmpuri obligatorii lipsă: ${missing.join(', ')}`
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enrollmentInfo.email)) {
      return res.status(400).json({ success: false, message: 'Adresa de email nu este validă' });
    }

    if (enrollmentInfo.phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ success: false, message: 'Numărul de telefon nu este valid' });
    }

    let storedId = null;
    try {
      storedId = append('enrollments', 'enr', { ...enrollmentInfo, status: 'nou' }).id;
    } catch (storeError) {
      console.error('Failed to persist enrollment:', storeError);
    }

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

    const studentEmailSubject = 'Confirmare inscriere - Nova Detailing Scoala';
    const studentEmailBody = `
Buna ziua ${enrollmentInfo.name},

Iti multumim pentru inscrierea la Scoala de Detailing Nova Detailing!

DETALII INSCRIERE:
- Curs: ${enrollmentInfo.course}

Te vom contacta in curand pentru a confirma data de inceput si detaliile de plata.

Avans necesar: 50% din valoarea cursului la inscriere.

Daca ai intrebari, ne poti contacta:
- Telefon: +40 742 122 222
- Email: contact@novadetailing.ro

Cu stima,
Echipa Nova Detailing
Excelenta in fiecare detaliu.
`;

    console.log('=== EMAILS TO SEND ===');
    console.log('Business Email To: contact@novadetailing.ro');
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
            from: 'scoala@novadetailing.ro',
            to: process.env.BUSINESS_EMAIL || 'contact@novadetailing.ro',
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
            from: 'scoala@novadetailing.ro',
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
      console.log('To: contact@novadetailing.ro');
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
      enrollmentId: storedId || `EN-${Date.now()}`
    });
  } catch (error) {
    console.error('Error processing enrollment:', error);
    return res.status(500).json({
      success: false,
      message: 'Eroare la procesarea inscrierii'
    });
  }
}
