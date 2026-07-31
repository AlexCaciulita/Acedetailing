import { append } from './admin/_store.js';

const asText = (value, max = 500) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const raw = req.body ?? {};

    // Honeypot: answer successfully without creating a record.
    if (asText(raw.website, 200)) {
      return res.status(200).json({ success: true, message: 'Solicitare primită' });
    }

    const lead = {
      timestamp: new Date().toISOString(),
      company: asText(raw.company, 160),
      contactName: asText(raw.contactName, 120),
      role: asText(raw.role, 120),
      email: asText(raw.email, 160),
      phone: asText(raw.phone, 40),
      fleetSize: asText(raw.fleetSize, 60),
      leaseReturns: asText(raw.leaseReturns, 60),
      returnWindow: asText(raw.returnWindow, 80),
      location: asText(raw.location, 160),
      lessor: asText(raw.lessor, 160),
      notes: asText(raw.message, 2000),
      privacy: raw.privacy === true
    };

    const missing = ['company', 'contactName', 'fleetSize', 'returnWindow']
      .filter((field) => !lead[field]);

    if (missing.length || (!lead.email && !lead.phone) || !lead.privacy) {
      return res.status(400).json({
        success: false,
        message: 'Completează câmpurile obligatorii, un email sau telefon și acordul de confidențialitate.'
      });
    }

    if (lead.email && !isEmail(lead.email)) {
      return res.status(400).json({ success: false, message: 'Adresa de email nu este validă.' });
    }

    const summary = [
      `Companie: ${lead.company}`,
      `Contact / rol: ${lead.contactName}${lead.role ? ` / ${lead.role}` : ''}`,
      `Flotă: ${lead.fleetSize}`,
      `Retururi estimate: ${lead.leaseReturns || 'nespecificat'}`,
      `Fereastră retur: ${lead.returnWindow}`,
      `Locație: ${lead.location || 'nespecificată'}`,
      `Lessor: ${lead.lessor || 'nespecificat'}`,
      `Context: ${lead.notes || 'fără observații'}`
    ].join('\n');

    let messageId = null;
    try {
      messageId = append('messages', 'b2b', {
        timestamp: lead.timestamp,
        name: `${lead.contactName} — ${lead.company}`,
        phone: lead.phone,
        email: lead.email,
        subject: 'Solicitare B2B — pilot pre-retur leasing',
        message: summary,
        read: false,
        leadType: 'b2b',
        qualification: lead
      }).id;
    } catch (storeError) {
      console.error('Failed to persist B2B lead:', storeError);
    }

    if (process.env.EMAIL_SERVICE_URL && process.env.EMAIL_API_KEY) {
      try {
        await fetch(process.env.EMAIL_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EMAIL_API_KEY}`
          },
          body: JSON.stringify({
            to: 'contact@novadetailing.ro',
            replyTo: lead.email || undefined,
            subject: `Lead B2B nou — ${lead.company}`,
            text: `${summary}\n\nTelefon: ${lead.phone || 'nespecificat'}\nEmail: ${lead.email || 'nespecificat'}`
          })
        });
      } catch (emailError) {
        console.error('Failed to send B2B lead email:', emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Solicitarea a fost trimisă. Revenim pentru calificare în maximum o zi lucrătoare.',
      leadId: messageId || `B2B-${Date.now()}`
    });
  } catch (error) {
    console.error('Error processing B2B lead:', error);
    return res.status(500).json({
      success: false,
      message: 'Solicitarea nu a putut fi trimisă. Încearcă din nou sau sună-ne.'
    });
  }
}
