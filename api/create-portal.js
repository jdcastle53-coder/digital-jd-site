import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error("[CREATE-PORTAL] STRIPE_SECRET_KEY not set");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const stripe = new Stripe(stripeKey);

  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find the Stripe customer that matches the signed-in user's email
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];

    if (!customer) {
      return res
        .status(404)
        .json({ error: "No subscription found for this account." });
    }

    const origin =
      req.headers.origin ||
      (req.headers.host ? `https://${req.headers.host}` : "https://digitaljd.org");

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${origin}/jd-brain.html`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("[CREATE-PORTAL] Error:", error.message);
    return res.status(500).json({ error: "Could not open billing portal" });
  }
}
