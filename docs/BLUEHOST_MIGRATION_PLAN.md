# Bluehost → Vercel Migration — Authoritative Runbook

> **Status of this document:** RECONSTRUCTED on 2026-07-27 from the approved
> memory note (`v0_memories/user/migration-plan.md`). The original
> `docs/BLUEHOST_MIGRATION_PLAN.md` and its companion docs
> (`BLUEHOST_DISCOVERY_ANALYSIS.md`, `BLUEHOST_MIGRATION_EXECUTIVE_SUMMARY.md`,
> `BLUEHOST_RETRIEVAL_CHECKLIST.md`) are NOT present in the repo. The step order,
> end-state, and watch-items below are faithful to the approved plan; the deep
> per-step verification detail from the original discovery docs must be
> re-derived as we execute. Treat every "Verify" line as a gate: do not advance
> until it passes, and record the evidence.

---

## >>> RESUME HERE (next session) <<<
Steps 0-4 DONE. Step 5 DESIGN done. Production points at BAM correctly.
BLOCKER: the v0 SANDBOX env is stuck showing the OLD project
`waevqqrqelloacoxywqq` (not BAM `hiejaayyeprfnrrukbam`) — a sandbox snapshot that
did NOT refresh this session despite the user re-entering the key and
redeploying. This is a v0-side refresh issue, NOT a production problem and NOT a
user error. It is expected to clear in a FRESH session.

FIRST ACTION next session: run the BAM check —
  node --env-file-if-exists=/vercel/share/.env.project -e "const k=process.env.SUPABASE_SERVICE_ROLE_KEY||'';let r='';try{r=JSON.parse(Buffer.from(k.split('.')[1],'base64').toString()).ref}catch(e){};console.log(process.env.SUPABASE_URL, r)"
  - If it shows `hiejaayyeprfnrrukbam`: read tables, resolve
    `application_logs` vs `messages`, flip Steps 2 & 5 to [x], continue at Step 6.
  - If it STILL shows `waevqqrqelloacoxywqq`: do NOT send the user clicking again
    — production is already fixed. Investigate the v0↔Supabase integration
    binding instead (the integration is still tied to the deleted orange-elephant
    store; the env vars need to originate from BAM).

---

## End-state (current decision)

- **Interim:** reduce Bluehost to STATIC-ONLY hosting (HTML/CSS/presentation JS,
  images, fonts, legal pages) without breaking production.
- **Vercel:** single origin for ALL programmatic logic — auth, trial/access,
  Stripe, and the full Digital JD AI brain, consolidated under `jd-brain`.
- **Supabase:** unchanged identity provider. Production project
  `hiejaayyeprfnrrukbam` (ends in "bam").
- **GHL:** moving marketing to Go High Level is DEFERRED (Phase 13), out of
  scope until the 12 steps are complete.

---

## Critical verified watch-items (carry through every step)

- **Supabase connection:** PRODUCTION now points at `hiejaayyeprfnrrukbam`
  ("bam") — env vars repointed + redeployed 2026-07-27. The old
  `waevqqrqelloacoxywqq` project was deleted. NOTE: the v0 sandbox's env copy may
  still lag showing the old ref until it re-syncs; that is a v0 refresh delay,
  not a production issue (see Step 2).
- **Tiers are FROZEN during migration.** Live gating + Payment Links use
  `lite/core/pro`. A different, UNUSED set (`essentials/pro/founding/executive`)
  sits in `api/create-checkout.js`. All tier work is DEFERRED to Phase 14.
- **AI brain:** `api/jd-brain-gateway.js` is a thin stub, NOT a port of
  `jd-brain.php`. Real parity is Step 8.
- **Stripe:** live checkout = hardcoded Payment Links; `create-checkout.js` and
  `create-portal.js` exist but are NOT wired. No Stripe→Supabase webhook exists.
- **enterprise.html:** referenced by `index.html`/`contact.html`. Live copy now
  archived at `docs/bluehost-archive/enterprise.html`, but still ABSENT from the
  deployed repo root — must be restored/ported during the route work (Step 4/10).
  It is presentation-only (accordion + Calendly CTA); no auth/Stripe/Supabase.

---

## Gated 12-step order

Legend: `[ ]` = not started · `[~]` = in progress · `[x]` = done + verified.

### [x] Step 0 — Retrieve Bluehost-only files
Pull the live PHP source (`jd-access.php`, live `jd-brain.php`,
`reset-password.php`, and possibly `enterprise.html`) off Bluehost and diff the
live files against the repo's `jd-demo.php`.
**Verify:** all live PHP files are captured into an offline archive and their
behavior is documented before anything is changed.
**DONE 2026-07-27:** `jd-brain.php` (617), `jd-access.php` (211),
`reset-password.php` (100), and `enterprise.html` (352) archived to
`docs/bluehost-archive/`. Findings + diff vs stub recorded in
`docs/PHP_TO_VERCEL_PARITY.md`. Step 0 fully closed — all four Bluehost-only
files captured.

### [x] Step 1 — PHP→Vercel feature-parity spec
Write down exactly what the PHP app does (inputs, outputs, auth checks, access
gates, AI calls) so Vercel can replicate it feature-for-feature.
**Verify:** every PHP behavior maps to a planned Vercel route/function.
**DONE 2026-07-27:** full route/behavior map in `docs/PHP_TO_VERCEL_PARITY.md`
(verified against current `api/` + root `*.html`). Every Bluehost behavior maps
to a concrete Vercel route. Findings: app shell (`jd-brain.html`) + billing
portal already wired; `signin.html` present (verify); substantive work is
concentrated in Step 6 (auth), Step 7 (trials), Step 8 (brain IP), plus a Step 4
cutover of three outbound `jd-demo.php`/`reset-password.php` links in
`index.html` (L1570, L1974, L2040).

### [~] Step 2 — Verify Vercel/Supabase production config  (PROD FIXED — sandbox verify pending)
Confirm production Vercel + Supabase settings and point production at the "bam"
project.
**Verify:** production env points at `hiejaayyeprfnrrukbam`; prod schema introspectable.

**HISTORY 2026-07-27:**
- CONFIRMED original mismatch: env vars pointed at `waevqqrqelloacoxywqq`; live
  code (`auth.js`, `index.html`, `jd-brain.html`, archived `reset-password.php`)
  uses production `hiejaayyeprfnrrukbam`.
- ROOT CAUSE found: the Supabase env vars were owned by the Vercel↔Supabase
  MARKETPLACE integration for the OLD "orange-elephant" (`waevqqrqelloacoxywqq`,
  FREE org). BAM was created directly in Supabase under a DIFFERENT org
  ("jdcastle53-coder's Org", PRO) and was never a Vercel-managed store — so it
  never appeared in "Connect Database" and the integration-owned vars could not
  be edited in place.
- FIX APPLIED (user, in Vercel): deleted orphaned `SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY`, deleted the uninstalled orange-elephant store,
  re-added both as PLAIN vars with BAM values
  (`https://hiejaayyeprfnrrukbam.supabase.co` + BAM service_role key), and
  REDEPLOYED production to green "Ready".
- The old `waevqqrqelloacoxywqq` project was DELETED in Supabase (a backup was
  offered; user confident all data is on BAM). Confirmed no migration writes
  ever targeted it.

**Verification state:**
  - [x] Production env repointed to BAM + redeployed (user-verified: Ready).
  - [ ] PENDING: v0 SANDBOX env copy still shows `waevqqrqelloacoxywqq` (stale;
        not re-synced with the Vercel change). NOT a production problem — a v0
        sandbox refresh lag. Re-run the decode+schema-read once the sandbox env
        re-syncs (or next session), then flip this step to [x] and record the
        table snapshot (expect auth users + `messages` logging table).
  - This pending item does NOT block Step 3. It DOES need to clear before Step 8
    (brain port) so v0 can read/write BAM directly.

### [x] Step 3 — Documentation & coding standards
Establish the coding + documentation standards the ported code must follow.
**Verify:** standards doc exists and is agreed before porting begins.
**DONE 2026-07-27:** `docs/CODING_STANDARDS.md` written, grounded in the real
`api/jd-brain-gateway.js` + `auth.js` patterns (ES-module handlers, env-only
secrets, dual-write structured logging, generic client errors). Surfaced TWO
discrepancies to resolve before their steps (NOT assumed away):
  1. Log table name: gateway writes `application_logs` but plan/`jd-brain.html`
     reference `messages` — confirm real table(s) in Step 5.
  2. Trial length: `auth.js` uses 24h (`TRIAL_HOURS=24`) vs marketing "7-day
     Sprint" vs `jd-access.php` 7-day file trial — decide with JD before Step 7.
**PENDING USER AGREEMENT:** standards to be confirmed by JD (esp. plain JS / no
TS, and the two discrepancies above).

### [x] Step 4 — Non-breaking route-transition map
Map every current URL to its future Vercel route with zero production breakage.
**Verify:** each live URL has a defined target route + redirect strategy.
**DONE 2026-07-27:** full inventory in `docs/ROUTE_TRANSITION_MAP.md`. Bluehost
PHP dependency is isolated to exactly 3 links in `index.html` (L1570, L1974,
L2040). Also catalogued broken placeholder links (dead Stripe link + `#` /
`hello@your-domain.com` placeholders) and a tier-vocabulary discrepancy
(`essentials/pro/executive` vs `lite/core/pro`) deferred to Phase 14. Cutover
ordering defined: don't edit the 3 links until Steps 6/7/8 targets work; keep
PHP live until Step 12; change in one verified commit.

### [~] Step 5 — Initial Supabase logging  (DESIGN done; live verify BLOCKED)
Add baseline event logging in Supabase (deeper Phase-2 logging deferred).
**Verify:** core auth/access/AI events are logged in the prod project.
**STATUS 2026-07-27:** DESIGN complete in `docs/LOGGING_PLAN.md`, grounded in the
gateway's existing structured logger (dual-write to `application_logs` with
level/action/request_id/user_id/etc.). LIVE portion BLOCKED: sandbox env still
resolves to `waevqqrqelloacoxywqq` (rechecked 2026-07-27, not yet re-synced to
BAM), so cannot confirm real tables or resolve the `application_logs` vs
`messages` discrepancy yet. Re-run the BAM read once the sandbox env re-syncs
(or next session), then finish + flip to [x].

### [~] Step 6 — Consolidate auth into Supabase Auth  (CODE done; 1 Supabase setting pending)
Move all authentication into Supabase Auth and replace `reset-password.php`.
**Verify:** login + password reset work end-to-end on Vercel; PHP auth retired.
**DONE 2026-07-27 (code):**
  - Login + signup were already Vercel-native Supabase Auth (`signin.html` +
    `auth.js`, both on BAM). Left as-is.
  - NEW `reset-password.html` (Vercel-native) replaces archived
    `reset-password.php`. Matches signin/expired design system (Space Grotesk /
    Newsreader / --ink). Reuses `window.Auth.client` (no new hardcoded keys).
    Handles BOTH Supabase v2 PKCE (`?code=`) and legacy implicit (`#access_token`)
    flows. All links point to `signin.html` (NOT the old digitaljd.org/jd-demo.php).
  - Added "Forgot your password?" flow to `signin.html` → calls
    `resetPasswordForEmail(email, { redirectTo: origin + '/reset-password.html' })`.
**PENDING USER ACTION (blocks true end-to-end):** Supabase dashboard →
  Authentication → URL Configuration must allowlist the Vercel origin +
  `/reset-password.html` as a Redirect URL (and set Site URL to the Vercel
  domain). Per memory these still point at Bluehost/digitaljd.org. Until then the
  reset EMAIL link may bounce to the old domain. NOT verified live yet (dev
  server wasn't running; static pages code-reviewed only).
**NOTE (defer to Step 7):** `auth.js` `TRIAL_HOURS=24` + "24-hour" copy in
  `signin.html`/`expired.html` still say 24h — must become 7-day @ Pro in Step 7.
**PHP retirement:** the 3 `index.html` links stay pointed at Bluehost until
  cutover (per ROUTE_TRANSITION_MAP ordering) — do not flip yet.

### [~] Step 7 — Consolidate trial/access logic into Vercel  (CLIENT done; server-side gating in Step 9)
Bring trial and access-gating logic out of PHP into Vercel.
**Verify:** trial start/expiry + tier gating enforced server-side on Vercel.
**DONE 2026-07-27 (client-side, in `auth.js`):**
  - Trial is now 7 DAYS at PRO level (per JD decision). Single source of truth:
    `TRIAL_DAYS=7` (`TRIAL_HOURS` derived), `TRIAL_TIER="pro"`.
  - `ensureExpiry()` on first login stamps `user_metadata` with
    `{ expires_at, plan:"pro", trial:true }` — so "Pro during trial" is real
    data the gateway can read, not an assumption.
  - Copy fixed to match: `signin.html` ("7-day trial with full Pro-level
    access") and `expired.html` ("Your 7-day trial has ended"). `index.html`
    marketing already said "7 Days Full Access" — code was the thing out of sync.
**HONEST GAPS (must close before claiming full parity):**
  1. ENFORCEMENT IS CLIENT-SIDE ONLY. Expiry lives in `user_metadata` and is
     checked in the browser (`requireActiveSession`) — a technical user could
     edit it. TRUE server-side gating (gateway rejects expired/over-tier calls)
     is Step 9. Do NOT mark this [x] until then. Plan's "server-side" verify is
     intentionally deferred to Step 9.
  2. EXISTING trial users created under the old 24h rule already have a
     24h-from-first-login `expires_at` stamped; the new 7-day value only applies
     to users whose `expires_at` is not yet set. If any real trials exist on BAM,
     decide whether to bulk-extend them (needs live BAM access — still pending).
  3. `expired.html` still has a placeholder `mailto:hello@your-domain.com` — fix
     with real support address (tracked in ROUTE_TRANSITION_MAP broken-links).

### [~] Step 8 — Port the FULL AI brain to Vercel  (CODE done; live LLM run not yet verified)
Replace the stub gateway with a real port of `jd-brain.php` (the 3-part output
system + knowledge-base reasoning).
**Verify:** Vercel gateway output matches PHP brain behavior on test prompts.
**DONE 2026-07-27:** `api/jd-brain-gateway.js` fully rewritten from the 8-line
stub to a real port of `jd-brain.php`:
  - JD MIND ported verbatim in substance: identity block, altitude principle,
    reasoning sequence + foundations (values-as-compass, never quoted).
  - 3-PART STRUCTURED OUTPUT: SITUATIONAL ANALYSIS / JD INSIGHT / EXECUTION PLAN
    (+ optional COMMUNICATION DRAFT) and DOCUMENT MODE (EXECUTIVE DRAFT). Exact
    headings preserved because the UI depends on them.
  - KB WIRED IN (this step, per JD): loads `data/jd-knowledge-base.json`
    (55 concepts, 3 rules, 6 chains). Rules+chains always injected; concepts are
    relevance-scored against the user input and capped at 14 to bound tokens.
    Instructed to reason FROM the KB in JD's voice, never cite/name it.
  - RESEARCH GROUNDING ported (Semantic Scholar, theme->query map, fail-silent,
    12s AbortController timeout, SUPPORTING RESEARCH section + citations array).
  - Supabase `application_logs` logging preserved exactly (same structured logger).
  - RESPONSE CONTRACT kept backward compatible: returns { reply } (jd-brain.html
    reads data.reply); adds { mode, model, citations } additively. Optional
    `mode:"clarify"` supported in gateway (two-step flow) — UI still single-shot
    (UI wiring intentionally deferred, matches Step 6/7 gateway-first approach).
**VERIFIED:** node --check passes; KB loads and concept selection returns the
  right concepts (accountability/trust/morale prompt -> Lencioni Avoidance of
  Accountability, Absence of Trust, Fear of Conflict, Edmondson Psych Safety).
**NOT YET VERIFIED (honest):**
  1. No live end-to-end LLM run (needs OPENAI_API_KEY + running server; not
     executed this session). Confirm a real advisory + a real clarify response
     next session.
  2. Semantic Scholar returned HTTP 429 (rate-limited) from this env on the
     free keyless endpoint. Gateway fails silent (answer still proceeds), so
     citations will be INTERMITTENT in production. Same limitation existed in
     the PHP version. If reliable citations are wanted, add a Semantic Scholar
     API key later.
  3. Not compared side-by-side against live PHP output (PHP is being retired).

### [ ] Step 9 — Secure the AI gateway
Lock down the gateway: authenticated access, rate limits, secret handling.
**Verify:** gateway rejects unauthenticated/abusive calls; no secrets exposed.

### [ ] Step 10 — Consolidate app under jd-brain
Unify the app into one modular `jd-brain` surface (retire `jd-demo.php`).
**Verify:** single app entry point; legacy PHP app no longer used.

### [ ] Step 11 — Keep Stripe FULLY STATIC
Leave Payment Links, portal link, and `lite/core/pro` gating untouched. Do NOT
wire `create-checkout.js` / `create-portal.js`. NO tier work.
**Verify:** checkout still flows through existing Payment Links; nothing changed.

### [ ] Step 12 — Reduce Bluehost to static-only
Strip Bluehost to static hosting, rotate all secrets, keep an offline archive.
**Verify:** no programmatic code runs on Bluehost; secrets rotated; archive kept.

---

## Deferred phases (DO NOT start until Steps 0–12 complete)

### Phase 13 — Marketing to GHL
Move marketing content to Go High Level as pure marketing (no auth, no Stripe,
no Supabase SDK) that links out to Vercel.

### Phase 14 — Stripe tier restructure — DECIDED: PRICING MODEL C
Verify live `plan_tier`, define new tiers, remap products/prices, redesign
entitlement sync.
- **Tier names:** Essentials, Pro (Most Popular), Executive, Enterprise.
- **Prices:** Essentials **$99/mo**, Pro **$299/mo**, Executive **$899/mo**
  (AI + human time with Dr. JD), Enterprise **custom**.
- Rename live gating vocabulary `lite/core/pro` → `essentials/pro/executive`.
- Founding "Lifetime $99" becomes a **Pro-tier** hook.
- Add-on modules: **Pro-and-up upsells only, never on Essentials.**
- Model B ($199/$499/$999) explicitly NOT chosen.
