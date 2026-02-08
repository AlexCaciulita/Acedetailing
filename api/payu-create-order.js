import crypto from 'crypto';

// Environment variables for PayU integration
const PAYU_MERCHANT_ID = process.env.PAYU_MERCHANT_ID || 'DEMO_MERCHANT';
const PAYU_POS_ID = process.env.PAYU_POS_ID || 'DEMO_POS';
const PAYU_SECRET_KEY = process.env.PAYU_SECRET_KEY || 'demo_secret_key';
const PAYU_API_URL = process.env.PAYU_API_URL || 'https://secure.snd.payu.com/api/v2_1/orders';
const PAYU_RETURN_URL = process.env.PAYU_RETURN_URL || 'https://novadetailing.ro/rezervare.html?status=return';
const PAYU_NOTIFY_URL = process.env.PAYU_NOTIFY_URL || 'https://novadetailing.ro/api/payu-notify';
const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL || 'contact@novadetailing.ro';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const bookingData = req.body;
    
    // Validate required fields
    if (!bookingData.name || !bookingData.phone || !bookingData.email || 
        !bookingData.date || !bookingData.time || !bookingData.advanceAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required booking data'
      });
    }

    // Generate unique order reference
    const orderRef = `DV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare PayU order data
    const payuOrder = {
      merchantPosId: PAYU_POS_ID,
      description: `Avans rezervare auto detailing - ${bookingData.name}`,
      currencyCode: 'RON',
      totalAmount: Math.round(bookingData.advanceAmount * 100), // PayU expects amounts in smallest currency unit (bani)
      extOrderId: orderRef,
      buyer: {
        email: bookingData.email,
        phone: bookingData.phone,
        firstName: bookingData.name.split(' ')[0] || bookingData.name,
        lastName: bookingData.name.split(' ').slice(1).join(' ') || '',
        language: 'ro'
      },
      products: [
        {
          name: 'Avans servicii auto detailing',
          unitPrice: Math.round(bookingData.advanceAmount * 100),
          quantity: 1
        }
      ],
      continueUrl: `${PAYU_RETURN_URL}&order_ref=${orderRef}`,
      notifyUrl: PAYU_NOTIFY_URL
    };

    // Create signature for PayU request
    const signatureString = `${PAYU_MERCHANT_ID}${orderRef}${Math.round(bookingData.advanceAmount * 100)}RON${PAYU_SECRET_KEY}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    // Log booking data to CSV (simple logging solution)
    const logEntry = {
      timestamp: new Date().toISOString(),
      orderRef,
      customerName: bookingData.name,
      customerEmail: bookingData.email,
      customerPhone: bookingData.phone,
      appointmentDate: bookingData.date,
      appointmentTime: bookingData.time,
      carInfo: `${bookingData.carBrand || ''} ${bookingData.carModel || ''} ${bookingData.carYear || ''}`.trim(),
      totalAmount: bookingData.totalAmount,
      advanceAmount: bookingData.advanceAmount,
      configuration: JSON.stringify(bookingData.configuration),
      status: 'initiated',
      notes: bookingData.notes || ''
    };

    // Convert to CSV format
    const csvLine = [
      logEntry.timestamp,
      logEntry.orderRef,
      `"${logEntry.customerName}"`,
      logEntry.customerEmail,
      logEntry.customerPhone,
      logEntry.appointmentDate,
      logEntry.appointmentTime,
      `"${logEntry.carInfo}"`,
      logEntry.totalAmount,
      logEntry.advanceAmount,
      `"${logEntry.configuration.replace(/"/g, '""')}"`,
      logEntry.status,
      `"${logEntry.notes.replace(/"/g, '""')}"`
    ].join(',');

    // In a real implementation, you would write to a file or database
    console.log('Booking logged:', csvLine);

    // Make request to PayU API
    const payuResponse = await fetch(PAYU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAYU_SECRET_KEY}`
      },
      body: JSON.stringify(payuOrder)
    });

    const payuResult = await payuResponse.json();

    if (!payuResponse.ok) {
      console.error('PayU API error:', payuResult);
      throw new Error(`PayU API error: ${payuResult.error?.message || 'Unknown error'}`);
    }

    // Return redirect URL for client
    res.status(200).json({
      success: true,
      redirectUrl: payuResult.redirectUri,
      orderRef: orderRef
    });

  } catch (error) {
    console.error('PayU create order error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'A apărut o eroare la procesarea comenzii'
    });
  }
}