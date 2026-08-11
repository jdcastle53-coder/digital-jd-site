import Stripe from "stripe";

// Live price IDs for each Digital JD tier (created in the live Stripe account)
// Updated 2026-08: new pricing $199 / $399 / $899 per month (all recurring).
// "founding" = first-50 offer, $99/mo recurring rate locked for life (unchanged price).
const PRICE_IDS = {
  essentials: "price_1U3EsHAADeI7ymn398ulRjWF", // $199/mo
  pro: "price_1U3EsHAADeI7ymn3DPNDuHLs", // $399/mo
  executive: "price_1U3EsIAADeI7ymn35kw67WTg", // $899/mo
  founding: "price_1Tj8AdAADeI7ymn3KwYMeDKi", // $99/mo locked for life
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Live secret key is stored under STRIPE_ACCESS_TOKEN; fall back to STRIPE_SECRET_KEY
  const stripeKey = process.env.STRIPE_ACCESS_TOKEN || process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error("[CREATE-CHECKOUT] No Stripe secret key set");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const stripe = new Stripe(stripeKey);

  try {
    const { tier, email } = req.body || {};
    const priceId = PRICE_IDS[tier];

    if (!priceId) {
      return res.status(400).json({ error: "Invalid plan selected" });
    }

    const origin =
      req.headers.origin ||
      (req.headers.host ? `https://${req.headers.host}` : "https://digitaljd.org");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Pre-fill and bind the customer to the signed-in email when available
      customer_email: email || undefined,
      allow_promotion_codes: true,
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel.html`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("[CREATE-CHECKOUT] Error:", error.message);
    return res.status(500).json({ error: "Could not start checkout" });
  }
}
