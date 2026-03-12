export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const ZENDIT_KEY = process.env.ZENDIT_KEY;
  const BASE = 'https://api.zendit.io/v1';
  const headers = {
    'Authorization': `Bearer ${ZENDIT_KEY}`,
    'Content-Type': 'application/json'
  };

  const { action } = req.query;

  try {
    if (action === 'balance') {
      const r = await fetch(`${BASE}/balance`, { headers });
      const text = await r.text();
      return res.status(200).send(text);
    }
    if (action === 'offers') {
      const r = await fetch(`${BASE}/topups/offers`, { headers });
      const text = await r.text();
      return res.status(200).send(text);
    }
    if (action === 'purchase') {
      const { offerId } = req.body;
      const r = await fetch(`${BASE}/esims/purchases`, {
        method: 'POST', headers,
        body: JSON.stringify({ offerId, transactionId: `footysims-${Date.now()}` })
      });
      const text = await r.text();
      return res.status(200).send(text);
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
