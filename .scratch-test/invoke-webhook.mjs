// Feeds a REAL, already-completed checkout.session.completed event
// (retrieved from Stripe test mode) into the actual production webhook
// handler (api/stripe-webhook.js), signed with a locally-scoped secret so
// we test the real code path -- signature verification, Supabase account
// creation, tier metadata mapping -- without touching the production
// STRIPE_WEBHOOK_SECRET or needing a real inbound HTTP request.
import Stripe from "stripe";
import { POST } from "../api/stripe-webhook.js";

const sessionId = process.argv[2];
if (!sessionId) {
  console.error("Usage: node invoke-webhook.mjs <checkout_session_id>");
  process.exit(1);
}

const LOCAL_TEST_SECRET = "whsec_local_simulation_only_not_real";
// Override so the webhook handler verifies against our local secret instead
// of touching the real production STRIPE_WEBHOOK_SECRET.
process.env.STRIPE_WEBHOOK_SECRET = LOCAL_TEST_SECRET;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // test-mode key
const session = await stripe.checkout.sessions.retrieve(sessionId);

// Build the same event envelope Stripe would send.
const eventPayload = {
  id: "evt_sim_" + session.id,
  object: "event",
  type: "checkout.session.completed",
  data: { object: session },
};
const rawBody = JSON.stringify(eventPayload);
const header = stripe.webhooks.generateTestHeaderString({
  payload: rawBody,
  secret: LOCAL_TEST_SECRET,
});

const request = new Request("https://digitaljd.org/api/stripe-webhook", {
  method: "POST",
  headers: {
    "stripe-signature": header,
    "content-type": "application/json",
    "origin": "https://digitaljd.org",
  },
  body: rawBody,
});

const response = await POST(request);
const body = await response.text();
console.log("HTTP status:", response.status);
console.log("Body:", body);
