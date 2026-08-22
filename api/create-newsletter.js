import { append } from './admin/_store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const body = req.body ?? {};
  const asText = (value, max = 200) =>
    typeof value === 'string' ? value.trim().slice(0, max) : '';

  // Honeypot: respond successfully so automated submissions do not learn how
  // they were detected, while never writing them to the subscriber list.
  if (asText(body.website)) {
    return res.status(200).json({ success: true, message: 'Abonare confirmată' });
  }

  const email = asText(body.email, 160).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Introdu o adresă de email validă' });
  }

  try {
    const subscriber = append('subscribers', 'sub', {
      email,
      source: 'blog',
      status: 'activ',
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'Abonare confirmată',
      subscriberId: subscriber.id
    });
  } catch (error) {
    console.error('Failed to persist newsletter subscription:', error);
    return res.status(500).json({ success: false, message: 'Abonarea nu a putut fi salvată' });
  }
}
