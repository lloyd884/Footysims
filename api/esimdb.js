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

    // Filter enabled only, must have a valid 2-letter country code
    const enabled = all
      .filter(o => o.enabled && o.country && o.country.length === 2)
      .map(o => {
        const costFixed = o.cost?.fixed || o.costFixed || 0;
        const costDivisor = o.cost?.currencyDivisor || o.costDivisor || 100;
        const priceFixed = o.price?.fixed || o.priceFixed || 0;
        const priceDivisor = o.price?.currencyDivisor || o.priceDivisor || 100;
        const cost = costFixed / costDivisor;
        const MARKUP = 1.35;
        const sellPrice = cost > 0 ? Math.ceil(cost * MARKUP * 100) / 100 : priceFixed / priceDivisor;
        return { ...o, _sellPrice: sellPrice };
      });

    // Deduplicate — keep cheapest plan per country + duration + data combo
    const bestMap = {};
    for (const o of enabled) {
      const key = `${o.country}-${o.durationDays}-${o.dataUnlimited ? 'unlimited' : o.dataGB + 'gb'}`;
      if (!bestMap[key] || o._sellPrice < bestMap[key]._sellPrice) {
        bestMap[key] = o;
      }
    }

    // Map to eSIMDB schema
    const plans = Object.values(bestMap)
      .filter(o => {
        // Must have valid data info — either unlimited flag or a positive dataGB
        return o.dataUnlimited || (o.dataGB && o.dataGB > 0);
      })
      .map(o => {
        const country = o.country;
        const days = o.durationDays || 0;
        const isUnlimited = o.dataUnlimited || false;
        const dataGB = o.dataGB || 0;
        const speeds = o.dataSpeeds || [];
        const sellPrice = parseFloat(o._sellPrice.toFixed(2));

        // dataCap: high-speed data before throttling
        // 0 = truly unlimited high speed, otherwise the GB cap
        const dataCap = isUnlimited ? 0 : dataGB;

        // planName max 35 chars
        const dataLabel = isUnlimited ? 'Unlimited' : `${dataGB}GB`;
        const rawName = `${country} ${dataLabel} ${days}d`;
        const planName = rawName.length > 35 ? rawName.substring(0, 35) : rawName;

        // Max speed from data speeds array
        const maxSpeed = speeds.includes('5G') ? 1000000 :
                         speeds.includes('4G') ? 150000 :
                         speeds.includes('3G') ? 7200 :
                         speeds.includes('2G') ? 384 : null;

        return {
          planName: planName,
          validity: days,
          dataCap: dataCap,
          dataUnit: 'GB',
          dataCapPer: null,
          maxSpeed: maxSpeed,
          reducedSpeed: isUnlimited ? 128 : null,
          prices: {
            GBP: sellPrice
          },
          link: `https://footysims.com?ref=esimdb`,
          telephony: null,
          subscription: false,
          canTopUp: false,
          eKYC: false,
          tethering: true,
          promoEnabled: true,
          hasAds: false,
          payAsYouGo: false,
          newUserOnly: false,
          coverages: [
            {
              code: country
            }
          ]
        };
      });

    return res.status(200).json(plans);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
