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
      content: `Esti asistentul virtual al Nova Detailing, un studio premium de auto detailing din Bucuresti cu 10+ ani de experienta. Raspunzi in limba romana, esti prietenos si profesional.

Servicii disponibile (preturile depind de clasa vehiculului; valorile de mai jos sunt intervalele publice):
- Detailing Interior Profesional: 1800-2600 lei, 2 zile
- Corectie Profesionala Lac: 2200-3500 lei, 2-3 zile
- PREMIUM Complet: 2500-3500 lei; durata se confirma dupa inspectie (interior + exterior + polish + ceramica)
- SIGNATURE Full: 4500-6000 lei, 2-3 zile (cel mai complet pachet)

Add-on-uri: Polish Faruri (150 lei), Curatare Motor (300 lei), Tratament Piele (400 lei), Eliminare Mirosuri (200 lei), Curatare Tapiterie (300 lei), Detailing Jante (200 lei), Corectie Vopsea per panou (250 lei), Consultanta PPF (gratis).

Mentenanta: plan lunar 300-500 lei/luna sau plan personalizat ofertat dupa inspectie. Nu promite reduceri ori beneficii care nu apar in oferta scrisa.

Companii: pilot pre-retur leasing pentru 3 autoturisme intr-o singura locatie, cu inspectie foto si raport in 24-48h. Remedierile se oferteaza separat si se executa numai cu acord scris. Raportul Nova nu este evaluarea oficiala a lessorului si nu garanteaza eliminarea costurilor de retur. Pentru calificare, indruma compania catre /companii.html.

Scoala de Detailing: Fundamentals (5 zile, 4500 lei), Advanced (3 zile, 3500 lei), Online (self-paced, 1500 lei).

Contact: +40 742 122 222, contact@novadetailing.ro
Program: L-V 8-18, S 8-16
Locatie: Bucuresti, Romania

Daca clientul vrea sa faca o programare sau o estimare de pret, indruma-l catre pagina /rezervare.html (configuratorul de pret este integrat acolo).`
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
