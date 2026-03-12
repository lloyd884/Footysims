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
      return res.status(200).json(await r.json());
    }
    if (action === 'offers') {
      const r = await fetch(`${BASE}/esims/offers?limit=100&offset=0`, { headers });
      return res.status(200).json(await r.json());
    }
    if (action === 'purchase') {
      const { offerId } = req.body;
      const r = await fetch(`${BASE}/esims/purchases`, {
        method: 'POST', headers,
        body: JSON.stringify({ offerId, transactionId: `footysims-${Date.now()}` })
      });
      return res.status(200).json(await r.json());
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
