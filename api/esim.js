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
      const r = await fetch(`${BASE}/esim/purchases`, {
        method: 'POST', headers,
        body: JSON.stringify({ offerId, transactionId })
      });
      const data = await r.json();
      // Poll for QR up to 10 times
      if (data.transactionId) {
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const poll = await fetch(`${BASE}/esim/purchases/${data.transactionId}`, { headers });
          const pollData = await poll.json();
          if (pollData.qrCode || pollData.activationCode) {
            return res.status(200).json(pollData);
          }
        }
      }
      return res.status(200).json(data);
    }

    if (action === 'getesim') {
      const { transactionId } = req.query;
      const r = await fetch(`${BASE}/esim/purchases/${transactionId}`, { headers });
      return res.status(200).send(await r.text());
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
