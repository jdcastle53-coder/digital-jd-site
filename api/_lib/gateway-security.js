import { Redis } from "@upstash/redis";
import { createClient } from "@supabase/supabase-js";

/* =========================================================
   DIGITAL JD — GATEWAY SECURITY (Step 9)
   Server-side enforcement for /api/jd-brain-gateway:
   1. Auth: verify the Supabase JWT for the authenticated app path.
   2. Trial/tier gate: reject expired trials (closes Step 7 gap).
   3. Rate limiting: Upstash Redis, shared across serverless instances.
      - Authenticated users: generous per-user cap.
      - Public demo: stricter per-IP cap so it can't be abused.
   All limits fail OPEN on infrastructure errors (never block a paying
   user because Redis hiccuped) but fail CLOSED on auth/trial (an invalid
   token or expired trial is always rejected).
========================================================= */

export const LIMITS = {
  // Authenticated users (logged in, active trial/subscription)
  user: { requests: 60, windowSec: 60 * 60 }, // 60 questions/hour/user
  // Public no-signup demo (demo.html) — much tighter, per IP
  demo: { requests: 5, windowSec: 24 * 60 * 60 }, // 5 questions/day/IP
};

let _redis = null;
function getRedis() {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

/* ---------- Client IP (behind Vercel's proxy) ---------- */
export function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

/* ---------- Bearer token extraction ---------- */
function getBearerToken(req) {
  const h = req.headers["authorization"] || req.headers["Authorization"];
  if (!h || typeof h !== "string") return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/**
 * Verify the caller's Supabase session and evaluate trial/tier.
 * Returns:
 *   { ok:true, user, plan, trial, expiresAt }        - allowed
 *   { ok:false, status, code, message }              - rejected
 * `status:null` with ok:false means "no token" (caller decides if that's
 * allowed — the demo path permits anonymous, the app path does not).
 */
export async function verifyAccess(req) {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, status: null, code: "no_token", message: "Not signed in." };
  }

  const supabase = getSupabase();
  if (!supabase) {
    // Server misconfig (no BAM creds). Fail closed for the app path.
    return {
      ok: false, status: 503, code: "auth_unavailable",
      message: "Authentication is temporarily unavailable.",
    };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, code: "invalid_token", message: "Your session is invalid or has expired. Please sign in again." };
  }

  const user = data.user;
  const meta = user.user_metadata || {};
  const plan = meta.plan || "trial";
  const isTrial = meta.trial !== false; // default true unless explicitly paid
  const expiresAt = meta.expires_at || null;

  // Trial/tier gate (closes the Step 7 client-side gap).
  if (isTrial && expiresAt) {
    const expMs = Date.parse(expiresAt);
    if (!Number.isNaN(expMs) && Date.now() > expMs) {
      return {
        ok: false, status: 402, code: "trial_expired",
        message: "Your trial has ended. Upgrade to keep working with JD.",
        userId: user.id,
      };
    }
  }

  return { ok: true, user, userId: user.id, plan, trial: isTrial, expiresAt };
}

/**
 * Fixed-window rate limit backed by Upstash. `kind` selects the limit set.
 * Fails OPEN (allowed:true) if Redis is unavailable — availability over
 * strictness for real users.
 * Returns { allowed, remaining, limit, resetSec, degraded }.
 */
export async function checkRateLimit(kind, identifier) {
  const cfg = LIMITS[kind] || LIMITS.user;
  const redis = getRedis();
  if (!redis) {
    return { allowed: true, remaining: cfg.requests, limit: cfg.requests, resetSec: cfg.windowSec, degraded: true };
  }

  const key = `jdbrain:rl:${kind}:${identifier}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      // First hit in this window — start the TTL.
      await redis.expire(key, cfg.windowSec);
    }
    let ttl = await redis.ttl(key);
    if (ttl < 0) ttl = cfg.windowSec; // safety if TTL wasn't set
    const remaining = Math.max(0, cfg.requests - count);
    return {
      allowed: count <= cfg.requests,
      remaining, limit: cfg.requests, resetSec: ttl, degraded: false,
    };
  } catch (e) {
    // Redis error: do not punish the user.
    return { allowed: true, remaining: cfg.requests, limit: cfg.requests, resetSec: cfg.windowSec, degraded: true, error: e.message };
  }
}
