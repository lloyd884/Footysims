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
      // Log exactly what we're sending back so we can debug
      const requestBody = JSON.stringify({ offerId, transactionId });
      const r = await fetch(`${BASE}/esims/purchases`, {
        method: 'POST',
        headers,
        body: requestBody
      });
      const statusCode = r.status;
      const responseText = await r.text();
      // Return full debug info
      return res.status(200).json({
        zenditStatus: statusCode,
        zenditResponse: responseText,
        requestSent: requestBody
      });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
