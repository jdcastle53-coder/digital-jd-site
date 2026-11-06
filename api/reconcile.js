import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import { classifyCheckouts } from "./_lib/reconcile-core.js";

// Daily check (Vercel Cron) that every settled Stripe checkout has a matching
// paid Supabase account. This is the safety net for silent webhook failures:
// a payment that cleared but never produced an account shows up here as an
// ERROR log entry, and the run always ends with a "reconcile_completed"
// heartbeat entry, so a day with NO heartbeat means the check itself did not run.
//
// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when the CRON_SECRET
// environment variable is set, so the same header protects manual calls.

export const config = { maxDuration: 60 };

const COMPONENT = "reconcile";
const DEFAULT_LOOKBACK_DAYS = 7;
const MAX_LOOKBACK_DAYS = 30;

function secretMatches(header, secret) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header || "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function listAllUsers(supabase) {
  const users = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Supabase listUsers failed: ${error.message}`);
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < 200) break;
  }
  return users;
}

export default async function handler(req, res) {
  const startTime = Date.now();
  const requestId = `req_${startTime}_${Math.random().toString(36).substring(2, 9)}`;

  const cronSecret = process.env.CRON_SECRET;
  const stripeKey = process.env.STRIPE_ACCESS_TOKEN || process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

  let logWritten = true;
  const log = async (level, action, data = {}) => {
    const { message = null, durationMs = null, ...context } = data;
    const entry = {
      timestamp: new Date().toISOString(), level, component: COMPONENT, action,
      message, context, duration_ms: durationMs, request_id: requestId, user_id: null,
    };
    console.log(`[RECONCILE] ${JSON.stringify(entry)}`);
    if (!supabase) { logWritten = false; return; }
    try {
      // supabase-js returns { error } instead of throwing, so check it explicitly.
      const { error } = await supabase.from("application_logs").insert(entry);
      if (error) {
        logWritten = false;
        console.error("[RECONCILE] Failed to write log row:", error.message);
      }
    } catch (dbError) {
      logWritten = false;
      console.error("[RECONCILE] Failed to write log row:", dbError.message);
    }
  };

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!cronSecret) {
    console.error("[RECONCILE] CRON_SECRET is not set; refusing to run unauthenticated.");
    return res.status(500).json({ error: "Server configuration error" });
  }
  if (!secretMatches(req.headers.authorization, cronSecret)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const missing = [
    !stripeKey && "STRIPE_ACCESS_TOKEN/STRIPE_SECRET_KEY",
    !supabaseUrl && "SUPABASE_URL",
    !supabaseServiceKey && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);
  if (missing.length) {
    await log("ERROR", "reconcile_failed", { message: "Missing required configuration", missing });
    return res.status(500).json({ error: "Server configuration error", missing });
  }

  const requestedDays = Number.parseInt(req.query?.days, 10);
  const lookbackDays = Number.isFinite(requestedDays)
    ? Math.min(Math.max(requestedDays, 1), MAX_LOOKBACK_DAYS)
    : DEFAULT_LOOKBACK_DAYS;
  const since = Math.floor(Date.now() / 1000) - lookbackDays * 86400;

  await log("INFO", "reconcile_started", { lookbackDays });

  try {
    const stripe = new Stripe(stripeKey);
    const sessions = await stripe.checkout.sessions.list({ limit: 100, created: { gte: since } }).autoPagingToArray({ limit: 5000 });
    const users = await listAllUsers(supabase);

    const { checked, ok, findings } = classifyCheckouts(sessions, users);

    for (const finding of findings) {
      await log("ERROR", "reconcile_finding", { message: finding.kind, ...finding });
    }

    const durationMs = Date.now() - startTime;
    await log("INFO", "reconcile_completed", {
      message: findings.length ? "Payments found without a matching paid account" : "All settled payments have a paid account",
      lookbackDays, sessionsListed: sessions.length, checked, ok, findings: findings.length, durationMs,
    });

    return res.status(200).json({
      ok: findings.length === 0, lookbackDays, sessionsListed: sessions.length, checked, matched: ok, findings, logWritten,
    });
  } catch (error) {
    await log("ERROR", "reconcile_failed", { message: error.message, durationMs: Date.now() - startTime });
    return res.status(500).json({ error: "Reconciliation failed" });
  }
}
