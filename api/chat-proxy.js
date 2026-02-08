export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY not configured');
    return res.status(500).json({ success: false, message: 'Serviciul de chat nu este configurat' });
  }

  try {
    const { messages } = req.body ?? {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'Mesajele sunt obligatorii' });
    }

    const systemMessage = {
      role: 'system',
      content: `Esti asistentul virtual al Nova Detailing, un studio premium de auto detailing din Bucuresti cu 17+ ani de experienta. Raspunzi in limba romana, esti prietenos si profesional.

Servicii disponibile:
- ESSENTIAL Interior: 800-1200 lei, 3-4 ore
- ESSENTIAL Exterior: 800-1200 lei, 3-4 ore
- PREMIUM Complet: 2500-3500 lei, 1-2 zile (interior + exterior + polish + ceramica)
- SIGNATURE Full: 4500-6000 lei, 2-3 zile (cel mai complet pachet)

Add-on-uri: Polish Faruri (150 lei), Curatare Motor (300 lei), Tratament Piele (400 lei), Eliminare Mirosuri (200 lei), Curatare Tapiterie (300 lei), Detailing Jante (200 lei), Corectie Vopsea per panou (250 lei), Consultanta PPF (gratis).

Abonamente: Lunar (300-500 lei/luna), VIP Anual (6000-9000 lei/an).

Scoala de Detailing: Fundamentals (5 zile, 4500 lei), Advanced (3 zile, 3500 lei), Online (self-paced, 1500 lei).

Contact: +40 742 122 222, contact@novadetailing.ro
Program: L-V 8-18, S 8-16
Locatie: Bucuresti, Romania

Daca clientul vrea sa faca o programare, indruma-l catre pagina /rezervare.html sau /configurator.html pentru estimare pret.`
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://novadetailing.ro',
        'X-Title': 'Nova Detailing Chat'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [systemMessage, ...messages],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return res.status(502).json({ success: false, message: 'Eroare la serviciul de chat' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Ne pare rau, nu am putut genera un raspuns.';

    return res.status(200).json({ success: true, reply });
  } catch (error) {
    console.error('Chat proxy error:', error);
    return res.status(500).json({ success: false, message: 'Eroare la procesarea mesajului' });
  }
}
