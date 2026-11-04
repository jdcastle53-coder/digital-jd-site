import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Tells success.html whether the person who just paid is a brand-new customer
// (a confirmation email is on its way) or already had an account (no email is
// sent). It decides from the paying email on the Stripe session, never from
// whoever happens to be signed in on the browser. It returns only a status and
// a plan label, never an email address.

export function decideStatus(user, sessionCreatedSeconds) {
  if (!user) return "new";
  const createdMs = Date.parse(user.created_at || "");
  if (Number.isNaN(createdMs)) return "new";
  // An account that existed before this checkout began is a returning customer.
  // The invite the webhook creates for a new customer is made after checkout starts.
  return createdMs < sessionCreatedSeconds * 1000 ? "returning" : "new";
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function GET(request) {
  const stripeKey = process.env.STRIPE_ACCESS_TOKEN || process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripeKey || !supabaseUrl || !supabaseServiceRoleKey) {
    return json({ error: "Server configuration error" }, 500);
  }

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return json({ error: "Missing or invalid session" }, 400);
  }

  try {
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
    if (!paid) return json({ error: "Payment not completed" }, 402);

    const email = (session.customer_details?.email || session.customer_email || "").toLowerCase();
    const plan = session.metadata?.tier === "executive" ? "Executive" : "Essentials";
    if (!email) return json({ status: "new", plan });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let match = null;
    for (let page = 1; page <= 50 && !match; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) {
        console.error("[CHECKOUT-STATUS] Could not list users:", error.message);
        return json({ error: "Lookup failed" }, 500);
      }
      const users = data?.users || [];
      match = users.find((u) => (u.email || "").toLowerCase() === email) || null;
      if (users.length < 200) break;
    }

    const status = decideStatus(match, session.created);
    if (new URL(request.url).searchParams.get("debug") === "1") {
      return json({
        status,
        plan,
        debug: {
          accountFound: Boolean(match),
          accountCreatedAt: match?.created_at || null,
          sessionCreatedAt: new Date(session.created * 1000).toISOString(),
          invitedAt: match?.invited_at || null,
          emailConfirmedAt: match?.email_confirmed_at || null,
          lastSignInAt: match?.last_sign_in_at || null,
          provider: match?.app_metadata?.provider || null,
          membershipFlag: match?.user_metadata?.membership ?? null,
          trialFlag: match?.user_metadata?.trial ?? null,
          paidForThisSession: match?.user_metadata?.stripe_checkout_session_id === session.id,
        },
      });
    }
    return json({ status, plan });
  } catch (error) {
    console.error("[CHECKOUT-STATUS] Unexpected error:", error.message);
    return json({ error: "Unexpected server error" }, 500);
  }
}
