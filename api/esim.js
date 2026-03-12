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

  const action = req.query.action;

  try {
    if (action === 'balance') {
      const r = await fetch(`${BASE}/balance`, { headers });
      return res.status(200).send(await r.text());
    }

    if (action === 'purchase') {
      const offerId = req.body?.offerId || 'ESIM-TH-10D-ULE-NOROAM';
      const transactionId = `footysims-${Date.now()}`;
      const body = JSON.stringify({ offerId, transactionId });

      // Try all possible endpoint variations
      const endpoints = [
        `${BASE}/esims/purchases`,
        `${BASE}/esim/purchases`,
        `${BASE}/esims/purchase`,
        `${BASE}/eSIMs/purchases`,
      ];

      const results = {};
      for (const url of endpoints) {
        try {
          const r = await fetch(url, { method: 'POST', headers, body });
          results[url] = { status: r.status, body: await r.text() };
        } catch(e) {
          results[url] = { error: e.message };
        }
      }
      return res.status(200).json(results);
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
