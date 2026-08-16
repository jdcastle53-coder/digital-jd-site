import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Membership payment gate (JD's decision, 2026-08-11): the Supabase account
// for a Membership signup must NOT exist until Stripe confirms payment.
// This webhook is the only thing that creates that account. It listens for
// checkout.session.completed, then invites the paying customer by email —
// Supabase sends its own confirmation email, and that link lands on
// welcome-membership.html (only reachable because the account now exists).
//
// This uses the Web Standard `fetch` export (not the req/res helper style
// used by the other files in this folder) so we can read the exact raw
// request body via request.text() — Stripe's signature check fails against
// a body that has been JSON-parsed and re-serialized.

export async function POST(request) {
  const stripeKey = process.env.STRIPE_ACCESS_TOKEN || process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[STRIPE-WEBHOOK] Missing required server configuration");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey);
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[STRIPE-WEBHOOK] Signature verification failed:", error.message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (event.type !== "checkout.session.completed") {
    // Acknowledge everything else so Stripe doesn't retry unrelated events.
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const session = event.data.object;
  const email = session.customer_details?.email || session.customer_email;
  const tier = session.metadata?.tier;

  if (!email) {
    console.error("[STRIPE-WEBHOOK] checkout.session.completed with no email on session", session.id);
    // Nothing we can do without an email — acknowledge so Stripe stops retrying.
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const origin =
    request.headers.get("origin") ||
    (request.headers.get("host") ? `https://${request.headers.get("host")}` : "https://digitaljd.org");

  try {
    // Try to invite directly rather than looking up first — Supabase's
    // inviteUserByEmail fails clearly with an "already registered" style
    // error when the account exists, which we handle below by upgrading
    // that existing account instead.
    const paidMetadata = {
      plan: tier || "essentials",
      membership: true,
      trial: false,
      stripe_customer_id: session.customer || null,
      stripe_checkout_session_id: session.id,
    };

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/welcome-membership.html`,
      data: paidMetadata,
    });

    if (inviteError) {
      const alreadyRegistered = /already registered|already exists/i.test(inviteError.message || "");
      if (!alreadyRegistered) {
        console.error("[STRIPE-WEBHOOK] inviteUserByEmail failed:", inviteError.message);
        return new Response(JSON.stringify({ error: "Could not create account" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }

      // Existing account: fetch it and upgrade the plan metadata directly.
      // They're already confirmed, so there's no letter/confirm step —
      // they'll see paid access next time they sign in.
      const { data: usersPage, error: findError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (findError) {
        console.error("[STRIPE-WEBHOOK] Could not list users to upgrade existing account:", findError.message);
        return new Response(JSON.stringify({ error: "Could not upgrade account" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
      const match = (usersPage?.users || []).find(
        (u) => (u.email || "").toLowerCase() === email.toLowerCase()
      );
      if (!match) {
        console.error("[STRIPE-WEBHOOK] Supabase reported existing user but none found for", email);
        return new Response(JSON.stringify({ error: "Could not find existing account" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(match.id, {
        user_metadata: { ...match.user_metadata, ...paidMetadata },
      });
      if (updateError) {
        console.error("[STRIPE-WEBHOOK] Failed to upgrade existing account:", updateError.message);
        return new Response(JSON.stringify({ error: "Could not upgrade account" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
      console.log("[STRIPE-WEBHOOK] Upgraded existing account to paid plan:", email, tier);
    } else {
      console.log("[STRIPE-WEBHOOK] Invited new Membership account:", email, tier, inviteData?.user?.id);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error("[STRIPE-WEBHOOK] Unexpected error:", error.message);
    return new Response(JSON.stringify({ error: "Unexpected server error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
