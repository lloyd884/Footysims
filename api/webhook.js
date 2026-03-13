import Stripe from ‘stripe’;
import admin from ‘firebase-admin’;

// Disable Vercel body parsing — Stripe needs raw body to verify signature
export const config = { api: { bodyParser: false } };

// Init Firebase Admin once
if (!admin.apps.length) {
admin.initializeApp({
credential: admin.credential.cert(
JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
)
});
}
const db = admin.firestore();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const ZENDIT_KEY = process.env.ZENDIT_KEY;
const BASE = ‘https://api.zendit.io/v1’;

async function getRawBody(req) {
return new Promise((resolve, reject) => {
let data = ‘’;
req.on(‘data’, chunk => data += chunk);
req.on(‘end’, () => resolve(Buffer.from(data)));
req.on(‘error’, reject);
});
}

async function purchaseAndSaveESIM(offerId, uid, email) {
const zenditHeaders = {
‘Authorization’: `Bearer ${ZENDIT_KEY}`,
‘Content-Type’: ‘application/json’
};

```
// Purchase eSIM from Zendit
const transactionId = `footysims-wh-${Date.now()}`;
const purchaseRes = await fetch(`${BASE}/esim/purchases`, {
    method: 'POST',
    headers: zenditHeaders,
    body: JSON.stringify({ offerId, transactionId })
});
const purchase = await purchaseRes.json();

if (!purchase.transactionId) {
    console.error('Zendit purchase failed:', JSON.stringify(purchase));
    return;
}

// Poll for eSIM status — up to 90 seconds
let smdpAddress = null;
let activationCode = null;
let iccid = null;

for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const statusRes = await fetch(`${BASE}/esim/purchases/${transactionId}`, { headers: zenditHeaders });
    const status = await statusRes.json();
    if (status.confirmation?.smdpAddress) {
        smdpAddress = status.confirmation.smdpAddress;
        activationCode = status.confirmation.activationCode;
        iccid = status.confirmation.iccid;
        break;
    }
    if (status.status === 'FAILED') {
        console.error('eSIM provisioning failed for tx:', transactionId);
        return;
    }
}

if (!smdpAddress) {
    console.error('eSIM timed out for tx:', transactionId);
    return;
}

// Save to Firestore
await db.collection('purchases').add({
    uid,
    email,
    transactionId,
    offerId,
    smdpAddress,
    activationCode,
    iccid,
    source: 'webhook',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
});

console.log('Webhook eSIM saved for:', email, transactionId);
```

}

export default async function handler(req, res) {
if (req.method !== ‘POST’) return res.status(405).end(‘Method not allowed’);

```
const rawBody = await getRawBody(req);
const sig = req.headers['stripe-signature'];

let event;
try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
} catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
}

if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { offerId, uid, email } = session.metadata || {};

    if (!offerId || !uid || !email) {
        console.error('Missing metadata in session:', session.id);
        return res.status(200).json({ received: true });
    }

    // Run async — don't make Stripe wait
    purchaseAndSaveESIM(offerId, uid, email).catch(console.error);
}

return res.status(200).json({ received: true });
```

}
