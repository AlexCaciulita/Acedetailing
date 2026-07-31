import { append } from './admin/_store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const contactData = req.body ?? {};

    const asText = (value, max = 500) =>
      typeof value === 'string' ? value.trim().slice(0, max) : '';

    const contactInfo = {
      timestamp: contactData.timestamp || new Date().toISOString(),
      name: asText(contactData.name, 120),
      phone: asText(contactData.phone, 40),
      email: asText(contactData.email, 160),
      subject: asText(contactData.subject, 160) || 'Mesaj de pe site',
      message: asText(contactData.message, 4000)
    };

    const missing = ['name', 'email', 'message'].filter((field) => !contactInfo[field]);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Câmpuri obligatorii lipsă: ${missing.join(', ')}`
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.email)) {
      return res.status(400).json({ success: false, message: 'Adresa de email nu este validă' });
    }

    let messageId = null;
    try {
      messageId = append('messages', 'msg', { ...contactInfo, read: false }).id;
    } catch (storeError) {
      console.error('Failed to persist contact message:', storeError);
    }

    console.log('=== NEW CONTACT MESSAGE ===');
    console.log('Timestamp:', contactInfo.timestamp);
    console.log('From:', contactInfo.name, `<${contactInfo.email}>`);
    console.log('Phone:', contactInfo.phone || 'n/a');
    console.log('Subject:', contactInfo.subject);
    console.log('Message:', contactInfo.message);
    console.log('===========================');

    const emailSubject = `Mesaj nou de pe site - ${contactInfo.name}`;
    const emailBody = `
Mesaj nou primit prin formularul de contact:

DE LA:
- Nume: ${contactInfo.name}
- Email: ${contactInfo.email}
- Telefon: ${contactInfo.phone || 'nespecificat'}

SUBIECT: ${contactInfo.subject}

MESAJ:
${contactInfo.message}
`;

    if (process.env.EMAIL_SERVICE_URL && process.env.EMAIL_API_KEY) {
      try {
        await fetch(process.env.EMAIL_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EMAIL_API_KEY}`
          },
          body: JSON.stringify({
            // Always to the business inbox. The submitted address goes in
            // replyTo, never in `to` — `to` must never be caller-controlled or
            // this endpoint becomes an open relay.
            to: 'contact@novadetailing.ro',
            replyTo: contactInfo.email,
            subject: emailSubject,
            text: emailBody
          })
        });
      } catch (emailError) {
        console.error('Failed to send contact email:', emailError);
      }
    } else {
      console.log('=== EMAIL CONTENT (Business) ===');
      console.log('To: contact@novadetailing.ro');
      console.log('Subject:', emailSubject);
      console.log('Body:', emailBody);
      console.log('================================');
    }

    return res.status(200).json({
      success: true,
      message: 'Mesaj trimis',
      contactId: messageId || `CT-${Date.now()}`
    });
  } catch (error) {
    console.error('Error processing contact message:', error);
    return res.status(500).json({
      success: false,
      message: 'Eroare la trimiterea mesajului'
    });
  }
}
