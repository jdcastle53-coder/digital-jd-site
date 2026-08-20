// Mirrors api/create-checkout.js's exact session-creation logic (metadata,
// success/cancel URL shape, mode, allow_promotion_codes) but points at
// TEST-MODE prices/key so we can complete a real Stripe Checkout session
// with a test card, without touching the live PRICE_IDS or spending money.
import Stripe from "stripe";

const TEST_PRICE_IDS = {
  essentials: "price_1U6f3XBXEZJGOUGj0Auu02Tz",
  pro: "price_1U6f3YBXEZJGOUGjDSJOX2WI",
  executive: "price_1U6f3YBXEZJGOUGjNGQJpPr5",
};

const tier = process.argv[2];
const email = process.argv[3];
if (!tier || !TEST_PRICE_IDS[tier]) {
  console.error("Usage: node simulate-checkout.mjs <essentials|pro|executive> <email>");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // test-mode key

const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: TEST_PRICE_IDS[tier], quantity: 1 }],
  customer_email: email || undefined,
  allow_promotion_codes: true,
  metadata: { tier },
  success_url: `https://digitaljd.org/success.html?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `https://digitaljd.org/cancel.html`,
});

console.log(JSON.stringify({ id: session.id, url: session.url, tier, email }, null, 2));
