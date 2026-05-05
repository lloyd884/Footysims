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

  // Exactly the plans shown publicly on footysims.com before any sign-up wall.
  // Each entry: { unlimited, dataGB (if not unlimited), days }
  // Slots chosen to match actually available Zendit offers per country.
  const SITE_PLANS = {
    'TH': [{ unlimited: false, dataGB: 1, days: 1  }, { unlimited: false, dataGB: 3, days: 7  }, { unlimited: true,  days: 15 }],
    'JP': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: false, dataGB: 10, days: 30 }],
    'KR': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'CN': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: false, dataGB: 3, days: 15 }, { unlimited: true,  days: 30 }],
    'IN': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'ID': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'MY': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'SG': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'PH': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'VN': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'HK': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'TW': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'KH': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: false, dataGB: 5, days: 30 }, { unlimited: true,  days: 7  }],
    'MM': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: false, dataGB: 5, days: 30 }, { unlimited: true,  days: 30 }],
    'LK': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: false, dataGB: 5, days: 30 }, { unlimited: true,  days: 30 }],
    'NP': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: false, dataGB: 5, days: 30 }, { unlimited: true,  days: 30 }],
    'BD': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: false, dataGB: 5, days: 30 }, { unlimited: true,  days: 30 }],
    'PK': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: false, dataGB: 5, days: 30 }, { unlimited: true,  days: 30 }],
    'AE': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'SA': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'QA': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'KW': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'BH': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'OM': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'IL': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'JO': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'TR': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'ZA': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'EG': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'MA': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'NG': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'KE': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: false, dataGB: 5, days: 30 }],
    'GH': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'ET': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: false, dataGB: 5, days: 30 }, { unlimited: true,  days: 7  }],
    'TZ': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: false, dataGB: 5, days: 30 }, { unlimited: true,  days: 7  }],
    'GB': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'IE': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'ES': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'DE': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'FR': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'IT': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'NL': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'PT': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'BE': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'CH': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'AT': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'PL': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'SE': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'NO': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'DK': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'FI': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'CZ': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'HU': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'RO': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'GR': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'HR': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'RS': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'UA': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'SK': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'BG': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'AL': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'US': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'CA': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'MX': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'BR': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'AR': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'CO': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'CL': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'PE': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'EC': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'UY': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'CR': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'PA': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'JM': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: false, dataGB: 10, days: 30 }],
    'AU': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'NZ': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: true,  days: 7  }, { unlimited: true,  days: 30 }],
    'FJ': [{ unlimited: false, dataGB: 1, days: 7  }, { unlimited: false, dataGB: 5, days: 30 }, { unlimited: true,  days: 7  }],
  };

  try {
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

    const enabled = all
      .filter(o =>
        o.enabled &&
        o.country &&
        o.country.length === 2 &&
        SITE_PLANS[o.country]
      )
      .map(o => {
        const costFixed = o.cost?.fixed || o.costFixed || 0;
        const costDivisor = o.cost?.currencyDivisor || o.costDivisor || 100;
        const cost = costFixed / costDivisor;
        const MARKUP = 1.35;
        const priceFixed = o.price?.fixed || o.priceFixed || 0;
        const priceDivisor = o.price?.currencyDivisor || o.priceDivisor || 100;
        const sellPrice = cost > 0 ? Math.ceil(cost * MARKUP * 100) / 100 : priceFixed / priceDivisor;
        return { ...o, _sellPrice: sellPrice };
      });

    function getFUP(offerId) {
      const id = offerId.toUpperCase();
      if (id.includes('-ULP-'))       return { dataCap: 2, reducedSpeed: 2048, dataCapPer: 'day' };
      if (id.includes('-ULE-'))       return { dataCap: 1, reducedSpeed: 1280, dataCapPer: 'day' };
      if (id.includes('-UNLIMITED-')) return { dataCap: 1, reducedSpeed: 512,  dataCapPer: 'day' };
      return                                 { dataCap: 1, reducedSpeed: 512,  dataCapPer: 'day' };
    }

    const plans = [];

    for (const [countryCode, allowedPlans] of Object.entries(SITE_PLANS)) {
      const countryOffers = enabled.filter(o => o.country === countryCode);

      for (const slot of allowedPlans) {
        const matches = countryOffers.filter(o => {
          if (slot.unlimited) {
            return o.dataUnlimited === true && o.durationDays === slot.days;
          } else {
            return o.dataUnlimited === false && o.dataGB === slot.dataGB && o.durationDays === slot.days;
          }
        });

        if (matches.length === 0) continue;

        const best = matches.reduce((a, b) => a._sellPrice < b._sellPrice ? a : b);

        const isUnlimited = best.dataUnlimited || false;
        const dataGB = best.dataGB || 0;
        const days = best.durationDays || 0;
        const sellPrice = parseFloat(best._sellPrice.toFixed(2));

        const fup = isUnlimited ? getFUP(best.offerId) : null;

        const dataCap      = isUnlimited ? fup.dataCap      : dataGB;
        const dataCapPer   = isUnlimited ? fup.dataCapPer   : null;
        const reducedSpeed = isUnlimited ? fup.reducedSpeed : null;

        const dataLabel = isUnlimited ? 'Unlimited' : `${dataGB}GB`;
        const rawName = `${countryCode} ${dataLabel} ${days}d`;
        const planName = rawName.length > 35 ? rawName.substring(0, 35) : rawName;

        plans.push({
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
          coverages: [{ code: countryCode }]
        });
      }
    }

    return res.status(200).json(plans);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
