const ZENDIT_KEY = process.env.ZENDIT_KEY;
const fetch = require("node-fetch");

const ZENDIT_KEY = functions.config().zendit.key;
const ZENDIT_BASE = "https://api.zendit.io/v1";

const headers = {
    "Authorization": `Bearer ${ZENDIT_KEY}`,
    "Content-Type": "application/json"
};

function cors(res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
}

exports.getOffers = functions.https.onRequest(async (req, res) => {
    cors(res);
    if (req.method === "OPTIONS") return res.status(204).send("");
    try {
        const response = await fetch(
            `${ZENDIT_BASE}/esims/offers?limit=100&offset=0`,
            { method: "GET", headers }
        );
        const data = await response.json();
        if (!response.ok) return res.status(response.status).json({ error: data });
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

exports.purchaseESIM = functions.https.onRequest(async (req, res) => {
    cors(res);
    if (req.method === "OPTIONS") return res.status(204).send("");
    const { offerId } = req.body;
    if (!offerId) return res.status(400).json({ error: "offerId is required" });
    const transactionId = `footysims-${Date.now()}`;
    try {
        const response = await fetch(`${ZENDIT_BASE}/esims/purchases`, {
            method: "POST",
            headers,
            body: JSON.stringify({ offerId, transactionId })
        });
        const data = await response.json();
        if (!response.ok) return res.status(response.status).json({ error: data });
        return res.status(200).json({
            iccid: data.iccid || null,
            qrCode: data.qrCode || null,
            activationCode: data.activationCode || null,
            status: data.status || null,
            transactionId
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

exports.getBalance = functions.https.onRequest(async (req, res) => {
    cors(res);
    if (req.method === "OPTIONS") return res.status(204).send("");
    try {
        const response = await fetch(`${ZENDIT_BASE}/transactions/balance`, {
            method: "GET", headers
        });
        const data = await response.json();
        return res.status(response.ok ? 200 : response.status).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
