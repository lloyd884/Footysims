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
      // Fetch all offers in batches of 100
      let all = [];
      let offset = 0;
      const limit = 100;
      while (true) {
        const r = await fetch(`${BASE}/esim/offers?_limit=${limit}&_offset=${offset}`, { headers });
        const data = await r.json();
        const list = data.list || [];
        all = all.concat(list);
        if (all.length >= data.total || list.length === 0) break;
        offset += limit;
        if (offset > 5500) break; // safety
      }
      // Return simplified list
      const simplified = all
        .filter(o => o.enabled)
        .map(o => ({
          offerId: o.offerId,
          country: o.country,
          regions: o.regions,
          durationDays: o.durationDays,
          dataGB: o.dataGB,
          dataUnlimited: o.dataUnlimited,
          cost: o.cost,
          price: o.price,
          priceCurrencyDivisor: o.priceCurrencyDivisor || 100,
          dataSpeeds: o.dataSpeeds
        }));
      return res.status(200).json({ total: simplified.length, offers: simplified });
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
