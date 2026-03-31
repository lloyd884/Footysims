export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const ZENDIT_KEY = process.env.ZENDIT_KEY;
  const BASE = 'https://api.zendit.io/v1';
  const headers = {
    'Authorization': `Bearer ${ZENDIT_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // Fetch all offers from Zendit
    let all = [];
    let offset = 0;
    while (true) {
      const r = await fetch(`${BASE}/esim/offers?_limit=100&_offset=${offset}`, { headers });
      const data = await r.json();
      const list = data.list || [];
      all = all.concat(list);
      if (all.length >= data.total || list.length === 0 || offset > 5500) break;
      offset += 100;
    }

    // Filter enabled only and map to eSIMDB schema
    const plans = all
      .filter(o => o.enabled)
      .map(o => {
        const price = o.price?.fixed
          ? (o.price.fixed / (o.price.currencyDivisor || 100))
          : (o.priceFixed / (o.priceDivisor || 100));

        const dataAmount = o.dataUnlimited
          ? null
          : (o.dataGB > 0 ? o.dataGB : null);

        // Build country list — use regions if multi-country, else single country
        const countries = o.regions && o.regions.length > 0 && o.country === 'GLOBAL'
          ? o.regions
          : [o.country];

        return {
          id: o.offerId,
          provider: 'FootySIMs',
          providerUrl: 'https://footysims.com',
          name: o.offerId,
          countries: countries,
          regions: o.regions || [],
          dataAmount: dataAmount,       // GB, null if unlimited
          dataUnlimited: o.dataUnlimited || false,
          durationDays: o.durationDays,
          dataSpeeds: o.dataSpeeds || [],
          price: parseFloat(price.toFixed(2)),
          currency: 'GBP',
          purchaseUrl: 'https://footysims.com',
          promoCode: 'ESIMDB',          // referral tracking code for eSIMDB
          updatedAt: new Date().toISOString()
        };
      });

    return res.status(200).json({
      provider: 'FootySIMs',
      providerUrl: 'https://footysims.com',
      totalPlans: plans.length,
      updatedAt: new Date().toISOString(),
      plans: plans
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
