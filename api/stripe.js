import Stripe from 'stripe';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const action = req.query.action;

    try {
        if (action === 'create-checkout') {
            const { offerId, offerName, price, uid, email } = req.body;
            const amountPence = Math.round(price * 100);

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'gbp',
                        product_data: { name: offerName },
                        unit_amount: amountPence,
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: 'https://footysims.com/dashboard.html?session_id={CHECKOUT_SESSION_ID}&offer=' + offerId,
                cancel_url: 'https://footysims.com/dashboard.html',
                customer_email: email || undefined,
                metadata: {
                    offerId,
                    uid: uid || '',
                    email: email || ''
                }
            });

            return res.status(200).json({ url: session.url });
        }

        if (action === 'verify') {
            const { sessionId } = req.query;
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            return res.status(200).json({
                paid: session.payment_status === 'paid',
                offerId: session.metadata ? session.metadata.offerId : null
            });
        }

        return res.status(400).json({ error: 'Unknown action' });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
