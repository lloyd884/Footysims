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

    if (action === 'offers') {
      const endpoints = [
        `${BASE}/esim/offers?_limit=100&_offset=0`,
        `${BASE}/esims/offers?_limit=100&_offset=0`,
        `${BASE}/esim/offers`,
        `${BASE}/catalog/esim`,
      ];
      const results = {};
      for (const url of endpoints) {
        try {
          const r = await fetch(url, { headers });
          results[url] = { status: r.status, body: (await r.text()).substring(0, 300) };
        } catch(e) {
          results[url] = { error: e.message };
        }
      }
      return res.status(200).json(results);
    }

    if (action === 'purchase') {
      const offerId = req.body?.offerId || 'ESIM-TH-1D-ULE-NOROAM';
      const transactionId = `footysims-${Date.now()}`;
      const r = await fetch(`${BASE}/esim/purchases`, {
        method: 'POST', headers,
        body: JSON.stringify({ offerId, transactionId })
      });
      return res.status(200).send(await r.text());
    }

    if (action === 'status') {
      const { transactionId } = req.query;
      const r = await fetch(`${BASE}/esim/purchases/${transactionId}`, { headers });
      const data = await r.json();
      const conf = data.confirmation || {};
      if (conf.smdpAddress) {
        data.qrData = `LPA:1$${conf.smdpAddress}$${conf.activationCode || ''}`;
        data.smdpAddress = conf.smdpAddress;
        data.iccid = conf.iccid;
        data.activationCode = conf.activationCode;
      }
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
