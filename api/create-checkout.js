import Stripe from "stripe";

// Live price IDs for the three-tier lineup (Essentials / Executive / Enterprise).
// Enterprise is sales-led (contact.html) and is intentionally not purchasable here.
// Each key maps to a recurring Stripe price. `plan` is what gets recorded on the
// Supabase account (access gates check plan === "executive"), so yearly prices
// must still resolve to the plain plan name.
const CHECKOUT_OPTIONS = {
  essentials: {
    priceId: "price_1USdTkAADeI7ymn3jLLCORjs", // $399/month
    plan: "essentials",
    interval: "month",
  },
  essentials_yearly: {
    priceId: "price_1USdTlAADeI7ymn3ZDwsf4cT", // $3,990/year
    plan: "essentials",
    interval: "year",
  },
  executive: {
    priceId: "price_1U3EsIAADeI7ymn35kw67WTg", // $899/month
    plan: "executive",
    interval: "month",
  },
  executive_yearly: {
    priceId: "price_1USdTlAADeI7ymn3UufihbcY", // $8,990/year
    plan: "executive",
    interval: "year",
  },
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
    const option = Object.prototype.hasOwnProperty.call(CHECKOUT_OPTIONS, tier)
      ? CHECKOUT_OPTIONS[tier]
      : null;

    if (!option) {
      return res.status(400).json({ error: "Invalid plan selected" });
    }

    const origin =
      req.headers.origin ||
      (req.headers.host ? `https://${req.headers.host}` : "https://digitaljd.org");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: option.priceId, quantity: 1 }],
      // Pre-fill and bind the customer to the signed-in email when available
      customer_email: typeof email === "string" && email ? email : undefined,
      allow_promotion_codes: true,
      // Recorded so the Stripe webhook (api/stripe-webhook.js) can create
      // the Supabase account for the correct plan after payment clears.
      metadata: { tier: option.plan, interval: option.interval },
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel.html`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("[CREATE-CHECKOUT] Error:", error.message);
    return res.status(500).json({ error: "Could not start checkout" });
  }
}
