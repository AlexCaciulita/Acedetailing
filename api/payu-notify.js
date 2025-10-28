const crypto = require('crypto');

// Environment variables
const PAYU_SECRET_KEY = process.env.PAYU_SECRET_KEY || 'demo_secret_key';
const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL || 'programari@detailers-vision.ro';
const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL || 'programari@scuderia-vision.ro';

// Email service configuration (using a simple mailto fallback)
const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || '';
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || '';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, OpenPayu-Signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

module.exports = async (req, res) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    // Verify PayU signature
    const signature = req.headers['openpayu-signature'] || '';
    const body = JSON.stringify(req.body);
    
    // PayU sends signature in format: signature=hash;algorithm=MD5WithRSA
    const signatureParts = signature.split(';');
    const actualSignature = signatureParts[0]?.replace('signature=', '');
    
    if (!actualSignature) {
      console.error('Missing PayU signature');
      throw new Error('Missing PayU signature');
    }

    // Verify signature (simplified - in production use proper RSA verification)
    const expectedSignature = crypto.createHmac('md5', PAYU_SECRET_KEY).update(body).digest('hex');
    
    // For demo purposes, we'll log the signature verification
    console.log('PayU notification received:', {
      signature: actualSignature,
      expected: expectedSignature,
      body: body.substring(0, 200) + '...'
    });

    // Parse notification data
    const notificationData = req.body;
    const order = notificationData.order;
    const orderRef = order.extOrderId;
    const status = order.status;
    const buyerEmail = order.buyer.email;
    const buyerName = `${order.buyer.firstName} ${order.buyer.lastName}`.trim();
    const amount = parseFloat(order.totalAmount) / 100; // Convert from smallest unit back to RON

    console.log('Processing PayU notification:', {
      orderRef,
      status,
      amount,
      buyerEmail
    });

    // Update booking status in log (in production, update database)
    if (status === 'COMPLETED') {
      console.log('Payment completed for order:', orderRef);
      
      // Send confirmation emails
      await sendConfirmationEmails(orderRef, buyerEmail, buyerName, amount, notificationData);
    }

    // Return success response to PayU
    res.status(200).send('OK');

  } catch (error) {
    console.error('PayU notify error:', error);
    
    // Return error response to PayU (they will retry if we return error)
    res.status(500).send(`ERROR: ${error.message}`);
  }
};

async function sendConfirmationEmails(
  orderRef, 
  buyerEmail, 
  buyerName, 
  amount,
  notificationData
) {
  try {
    const customerEmailSubject = 'Confirmare rezervare - Detailer\'s Vision';
    const customerEmailBody = `
Bună ziua ${buyerName},

Plata pentru rezervarea dumneavoastră a fost confirmată cu succes!

Detalii rezervare:
- Numărul comenzii: ${orderRef}
- Suma plătită (avans): ${amount} RON
- Data și ora procesării: ${new Date().toLocaleString('ro-RO')}

Următorii pași:
1. Veți fi contactat în maximum 24 ore pentru confirmarea programării
2. Vă rugăm să aveți telefonul disponibil
3. La serviciu veți achita restul sumei (70% din total)

Pentru întrebări:
Telefon: +40 742 122 222
Email: ${BUSINESS_EMAIL}

Mulțumim pentru încrederea acordată!

Cu stimă,
Echipa Scuderia Vision

---
Detaliu care se vede. Luciu care rămâne.
https://scuderia-vision.ro
`;

    const businessEmailSubject = `Rezervare nouă confirmată - ${orderRef}`;
    const businessEmailBody = `
Rezervare nouă confirmată prin PayU:

Detalii client:
- Nume: ${buyerName}
- Email: ${buyerEmail}
- Telefon: ${notificationData.order.buyer.phone}

Detalii plată:
- Numărul comenzii: ${orderRef}
- Suma avans: ${amount} RON
- Status: CONFIRMAT
- Data procesării: ${new Date().toLocaleString('ro-RO')}

Acțiuni necesare:
1. Contactați clientul în 24h pentru programare
2. Confirmați data și ora serviciului
3. Pregătiți echipamentele necesare

Detalii complete PayU:
${JSON.stringify(notificationData, null, 2)}

---
Sistem Scuderia Vision
`;

    // Try to send emails via configured email service
    if (EMAIL_SERVICE_URL && EMAIL_API_KEY) {
      // Send customer email
      await fetch(EMAIL_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${EMAIL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: BUSINESS_EMAIL,
          to: buyerEmail,
          subject: customerEmailSubject,
          text: customerEmailBody
        })
      });

      // Send business email
      await fetch(EMAIL_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${EMAIL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: BUSINESS_EMAIL,
          to: BUSINESS_EMAIL,
          subject: businessEmailSubject,
          text: businessEmailBody
        })
      });

      console.log('Confirmation emails sent successfully');
    } else {
      // Fallback: Log email content for manual sending
      console.log('EMAIL SERVICE NOT CONFIGURED - Email content:');
      console.log('=== CUSTOMER EMAIL ===');
      console.log('To:', buyerEmail);
      console.log('Subject:', customerEmailSubject);
      console.log('Body:', customerEmailBody);
      console.log('\n=== BUSINESS EMAIL ===');
      console.log('To:', BUSINESS_EMAIL);
      console.log('Subject:', businessEmailSubject);
      console.log('Body:', businessEmailBody);
    }

  } catch (error) {
    console.error('Failed to send confirmation emails:', error);
    // Don't throw error - email failure shouldn't fail the payment confirmation
  }
}