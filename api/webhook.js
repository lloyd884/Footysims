let _stripe, _admin, _db;
async function getClients() {
    if (!_stripe) {
        const { default: Stripe } = await import('stripe');
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
    if (!_admin) {
        const { default: admin } = await import('firebase-admin');
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(
                    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
                )
            });
        }
        _admin = admin;
        _db = admin.firestore();
    }
    return { stripe: _stripe, admin: _admin, db: _db };
}
const ZENDIT_KEY = process.env.ZENDIT_KEY;
const BASE = 'https://api.zendit.io/v1';

async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(Buffer.from(data)));
        req.on('error', reject);
    });
}

async function sendESIMEmail({ email, offerId, transactionId, smdpAddress, activationCode, iccid }) {
    const matchingId = activationCode || "";
    const qrData = "LPA:1$" + smdpAddress + "$" + matchingId;
    const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(qrData);
    const appleUrl = "https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=LPA:1$" + smdpAddress + "$" + matchingId;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f7f4;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="background:#1a7a1a;border-radius:14px;padding:24px;text-align:center;margin-bottom:20px;">
      <h1 style="color:white;font-size:26px;margin:0;">Footy<span style="color:#7fff00;">SIMs</span></h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Your eSIM is ready </p>
    </div>
    <div style="background:white;border-radius:14px;padding:28px;text-align:center;margin-bottom:16px;">
      <h2 style="color:#1a7a1a;font-size:20px;margin:0 0 8px;"> Your eSIM is Ready!</h2>
      <p style="color:#555;font-size:14px;margin:0 0 20px;">Scan the QR code below to install your eSIM</p>
      <a href="${appleUrl}" style="display:inline-block;background:#1a7a1a;color:white;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;margin-bottom:16px;">Tap to Install eSIM (iPhone)</a><br><br>
      <img src="${qrUrl}" alt="eSIM QR Code" width="240" height="240"
        style="border:6px solid #1a7a1a;border-radius:12px;display:block;margin:0 auto 20px;" />
      <p style="font-size:12px;color:#888;margin:0 0 20px;">
         Open Camera -> point at QR -> tap notification -> install eSIM
      </p>
      <div style="background:#f0faf0;border-radius:10px;padding:16px;text-align:left;margin-bottom:16px;">
        <p style="font-size:13px;font-weight:700;color:#1a7a1a;margin:0 0 12px;"> Can't scan? Enter manually in Settings:</p>
        <p style="font-size:11px;color:#666;font-weight:700;margin:0 0 2px;text-transform:uppercase;">SM-DP+ Address</p>
        <p style="font-size:13px;font-family:monospace;background:white;padding:8px 10px;border-radius:6px;margin:0 0 10px;word-break:break-all;">${smdpAddress}</p>
        <p style="font-size:11px;color:#666;font-weight:700;margin:0 0 2px;text-transform:uppercase;">Activation Code</p>
        <p style="font-size:13px;font-family:monospace;background:white;padding:8px 10px;border-radius:6px;margin:0;word-break:break-all;">${activationCode || 'N/A'}</p>
      </div>
      <div style="background:#fff8e1;border-radius:8px;padding:12px;text-align:left;font-size:12px;color:#6d4c00;line-height:1.6;">
        <strong>iPhone:</strong> Settings -> Mobile Data -> Add eSIM -> Enter Details Manually<br>
        <strong>Android:</strong> Settings -> Connections -> SIM Manager -> Add eSIM -> Enter Manually
      </div>
    </div>
    <div style="background:white;border-radius:14px;padding:20px;margin-bottom:16px;">
      <h3 style="color:#1a7a1a;font-size:16px;margin:0 0 12px;">Order Details</h3>
      <table style="width:100%;font-size:13px;color:#444;">
        <tr><td style="padding:4px 0;color:#888;">ICCID</td><td style="padding:4px 0;text-align:right;font-family:monospace;">${iccid || 'N/A'}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Plan</td><td style="padding:4px 0;text-align:right;">${offerId}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Transaction</td><td style="padding:4px 0;text-align:right;font-family:monospace;font-size:11px;">${transactionId}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin-bottom:16px;">
      <a href="https://footysims.com/dashboard.html"
        style="display:inline-block;background:#1a7a1a;color:white;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
        View in Dashboard ->
      </a>
    </div>
    <div style="text-align:center;font-size:12px;color:#888;line-height:1.8;">
      <p>Need help? <a href="mailto:footysims@proton.me" style="color:#1a7a1a;">footysims@proton.me</a></p>
      <p style="margin-top:8px;">&copy; 2026 FootySIMs</p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'FootySIMs <noreply@footysims.com>',
            to: email,
            subject: ' Your FootySIMs eSIM is Ready!',
            html
        })
    });

    if (!res.ok) console.error('Resend error:', await res.text());
}

async function purchaseAndSaveESIM(sessionId, offerId, uid, email, stripe, admin, db) {
    //    Deduplication check                                           
    // Use Firestore to claim this sessionId atomically.
    // If another process (browser or webhook) already claimed it, skip.
    const sessionRef = db.collection('stripe_sessions').doc(sessionId);
    const claimed = await db.runTransaction(async t => {
        const doc = await t.get(sessionRef);
        if (doc.exists) return false; // already claimed
        t.set(sessionRef, { claimedAt: admin.firestore.FieldValue.serverTimestamp(), uid, email, offerId });
        return true;
    });

    if (!claimed) {
        console.log('Session already claimed, skipping duplicate:', sessionId);
        return;
    }
    //                                                                 

    const zenditHeaders = {
        'Authorization': `Bearer ${ZENDIT_KEY}`,
        'Content-Type': 'application/json'
    };

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

    let smdpAddress = null;
    let activationCode = null;
    let iccid = null;

    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await fetch(`${BASE}/esim/purchases/${transactionId}`, { headers: zenditHeaders });
        const status = await statusRes.json();
        if (status.confirmation?.smdpAddress) {
            smdpAddress = status.confirmation.smdpAddress;
            activationCode = status.confirmation.externalReferenceId || status.confirmation.activationCode;
            iccid = status.confirmation.iccid;
            break;
        }
        if (status.status === 'FAILED') {
            console.error('eSIM provisioning failed:', transactionId);
            return;
        }
    }

    if (!smdpAddress) {
        console.error('eSIM timed out:', transactionId);
        return;
    }

    await db.collection('purchases').add({
        uid,
        email,
        transactionId,
        offerId,
        sessionId,
        smdpAddress,
        activationCode,
        iccid,
        source: 'webhook',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('eSIM saved for:', email, transactionId);

    await sendESIMEmail({ email, offerId, transactionId, smdpAddress, activationCode, iccid });
    console.log('Email sent to:', email);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end('Method not allowed');

    const { stripe, admin, db } = await getClients();

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

        purchaseAndSaveESIM(session.id, offerId, uid, email, stripe, admin, db).catch(console.error);
    }

    return res.status(200).json({ received: true });
}
