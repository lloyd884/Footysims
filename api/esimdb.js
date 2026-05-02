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

  // EXACT countries shown on footysims.com — API must match site exactly
  const SITE_COUNTRIES = new Set([
    'TH','JP','KR','CN','IN','ID','MY','SG','PH','VN','HK','TW','KH','MM','LK','NP','BD','PK', // Asia
    'AE','SA','QA','KW','BH','OM','IL','JO','TR',                                                // Middle East
    'ZA','EG','MA','NG','KE','GH','ET','TZ',                                                     // Africa
    'GB','IE','ES','DE','FR','IT','NL','PT','BE','CH','AT','PL','SE','NO','DK','FI',             // Europe
    'CZ','HU','RO','GR','HR','RS','UA','SK','BG','AL',                                           // Europe cont.
    'US','CA','MX','BR','AR','CO','CL','PE','EC','UY','CR','PA','JM',                            // Americas
    'AU','NZ','FJ'                                                                                // Oceania
  ]);

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

    // Filter: enabled, valid 2-letter country code, must be in site country list
    const enabled = all
      .filter(o =>
        o.enabled &&
        o.country &&
        o.country.length === 2 &&
        SITE_COUNTRIES.has(o.country)
      )
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

    // FUP tier mapping from Zendit offerId subtype (confirmed by Zendit support)
    // UNLIMITED = Fast:    1GB/day HS, throttled at 512kbps
    // ULE       = Faster:  1GB/day HS, throttled at 1280kbps (1.25Mbps)
    // ULP       = Fastest: 2GB/day HS, throttled at 2048kbps (2Mbps)
    function getFUP(offerId) {
      const id = offerId.toUpperCase();
      if (id.includes('-ULP-'))       return { dataCap: 2, reducedSpeed: 2048, dataCapPer: 'day' };
      if (id.includes('-ULE-'))       return { dataCap: 1, reducedSpeed: 1280, dataCapPer: 'day' };
      if (id.includes('-UNLIMITED-')) return { dataCap: 1, reducedSpeed: 512,  dataCapPer: 'day' };
      return                                 { dataCap: 1, reducedSpeed: 512,  dataCapPer: 'day' };
    }

    // Map to eSIMDB schema
    const plans = Object.values(bestMap)
      .filter(o => o.dataUnlimited || (o.dataGB && o.dataGB > 0))
      .map(o => {
        const country = o.country;
        const days = o.durationDays || 0;
        const isUnlimited = o.dataUnlimited || false;
        const dataGB = o.dataGB || 0;
        const sellPrice = parseFloat(o._sellPrice.toFixed(2));

        const fup = isUnlimited ? getFUP(o.offerId) : null;

        const dataCap     = isUnlimited ? fup.dataCap     : dataGB;
        const dataCapPer  = isUnlimited ? fup.dataCapPer  : null;
        const reducedSpeed = isUnlimited ? fup.reducedSpeed : null;

        const dataLabel = isUnlimited ? 'Unlimited' : `${dataGB}GB`;
        const rawName = `${country} ${dataLabel} ${days}d`;
        const planName = rawName.length > 35 ? rawName.substring(0, 35) : rawName;

        return {
          planName,
          validity: days,
          dataCap,
          dataUnit: 'GB',
          dataCapPer,
          maxSpeed: null,
          reducedSpeed,
          prices: { GBP: sellPrice },
          link: 'https://footysims.com?ref=esimdb',
          telephony: null,
          subscription: false,
          canTopUp: false,
          eKYC: false,
          tethering: true,
          promoEnabled: false,
          hasAds: false,
          payAsYouGo: false,
          newUserOnly: false,
          coverages: [{ code: country }]
        };
      });

    return res.status(200).json(plans);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
