# DigitalJD — Coding & Documentation Standards (Migration)

Status: Step 3 deliverable. Grounded in the ACTUAL current code
(`api/jd-brain-gateway.js`, `auth.js`), not aspiration. Applies to all code
ported from Bluehost PHP into Vercel during Steps 4–12.

> RULE #1 reminder: verify before you write. Read the real file / schema / env
> value first. If it can't be verified, say so — don't guess.

---

## 1. Runtime & language
- **Vercel serverless functions** in `api/`, Node.js, ES modules (`import`/`export
  default handler`), matching the existing `jd-brain-gateway.js` style.
- Plain JavaScript (no TypeScript) to match the current codebase. Don't introduce
  a build step or framework unless a step explicitly calls for it.
- Front end stays static HTML + vanilla JS (`auth.js` pattern: an IIFE that
  attaches a single global like `window.Auth`). No SPA framework mid-migration.

## 2. Secrets & configuration
- **Server code** reads config from `process.env` ONLY. Never hardcode keys in
  `api/`. Pattern to follow (from the gateway):
  `const supabaseUrl = process.env.SUPABASE_URL;`
- Canonical env var names (already live in Vercel, now pointed at BAM):
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`.
- **Never log secret values.** Log only presence/booleans, e.g.
  `apiKeyExists: !!OPENAI_API_KEY` (existing pattern — keep it).
- KNOWN DEBT to fix during port: `auth.js` hardcodes the Supabase URL + anon key,
  and `reset-password.php` hardcoded creds. Anon key in browser is acceptable
  (public by design), but URL/keys should be centralized. Do not add NEW
  hardcoded secrets.

## 3. Database access (BAM Supabase)
- Server: `@supabase/supabase-js` `createClient(url, serviceRoleKey)`. Guard for
  missing creds and degrade gracefully (return `null` client) as the gateway does
  — never crash the request because logging is down.
- Service role bypasses RLS, so it is SERVER-ONLY. Browser uses the anon key.
- Every query touching user data must be scoped to the authenticated user.
- Introspect the live BAM schema before writing queries (blocked until the v0
  sandbox env re-syncs — see migration plan Step 2).

## 4. Logging (existing pattern — reuse, don't reinvent)
- Structured log helper writes to BOTH `console.log("[COMPONENT] ", json)` AND a
  Supabase table. Keep this dual-write shape.
- Each entry: `level, action, request_id, timestamp, component, message,
  context, duration_ms, user_id`.
- Generate a `request_id` per request (`req_${Date.now()}_${rand}`) and log
  `request_received` → … → `request_completed` with a duration.
- DB-write failures are caught and logged to console, never thrown.
- **DISCREPANCY TO RESOLVE:** the gateway currently inserts into
  **`application_logs`**, but the migration plan/`jd-brain.html` reference a
  **`messages`** table. Confirm the real table name(s) in BAM during Step 5 and
  standardize. Do NOT assume which is correct.

## 5. HTTP handler conventions
- Validate method first; return `405` for non-POST on POST-only routes.
- Validate body; return `400` with a JSON `{ error }` on missing input.
- Return `500` with a GENERIC `{ error }` to the client; log the detailed cause
  server-side. Never leak stack traces or provider errors to the client.
- Always send exactly one response; log `request_completed` with status + duration
  on every exit path (existing pattern).

## 6. Naming & structure
- Files in `api/` use kebab-case matching the route (`jd-brain-gateway.js`).
- Actions/log `action` values use snake_case verbs (`request_received`,
  `openai_request_started`).
- Keep one concern per function file; extract shared helpers only when reused.

## 7. AI brain specifics (for Step 8)
- The port must reproduce the PHP brain's 3-part output contract and JD voice
  (see `docs/PHP_TO_VERCEL_PARITY.md`), not the current stub's generic prompt.
- Model IDs are config, not magic strings scattered in code — centralize.
- Knowledge base (`data/jd-knowledge-base.json`) is the reasoning source; load it
  server-side, never ship it wholesale to the browser.

## 8. Trial / access (for Step 7)
- **DECIDED (JD, 2026-07-27): the trial is 7 DAYS, and during the trial the user
  gets full PRO-level access.** The current `auth.js` `TRIAL_HOURS = 24` is WRONG
  and must be changed to 7 days (168h) during Step 7. Make trial length a single
  server-side constant and grant Pro entitlements for its duration.
- Trial state must move OFF the flat file (`jd-trials.json`) into BAM (no
  persistent disk on Vercel). Enforce expiry server-side, not just in the browser.

## 9. Documentation discipline
- Every migration step updates `docs/BLUEHOST_MIGRATION_PLAN.md` (check the box +
  a dated note of what was verified).
- Record DISCREPANCIES as explicit TODOs (like §4 and §8) rather than resolving
  them by assumption.
- Commit messages: imperative summary + what was verified. Include the
  `Co-authored-by: v0` trailer.

## 10. Git & safety
- Work on the migration branch; never push straight to `main`/default.
- Keep the Bluehost archive (`docs/bluehost-archive/`) untouched as the reference
  source of truth.
- Verify (browser or query) user-visible behavior after each substantive change —
  a clean compile is not proof it works.
