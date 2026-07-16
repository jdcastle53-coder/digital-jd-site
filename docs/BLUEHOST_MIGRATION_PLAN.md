# Digital JD — Bluehost → Vercel Migration Plan (Gated Runbook)

> **Status:** Authoritative migration runbook. Supersedes the summary in
> `v0_memories/user/migration-plan.md` (which now links here).
> **Type:** Documentation only. No code, Supabase, or Stripe changes are
> authorized by this document. Each step is human-gated: do not advance until
> the listed verification passes and you explicitly approve.
> **Last updated:** 2026-07-16

---

## Guiding rules (apply to every step)

- **VERIFY EVERYTHING. DO NOT ASSUME.** Every step has an explicit
  verification gate. Do not advance until it passes and the human approves.
- **WORK FROM THE LATEST CODE.** Base all work on the most recent PR/branch.
- **NON-BREAKING.** Existing production functionality must keep working until
  its verified replacement is live. Every step has a rollback.
- **Objective:** Reduce Bluehost to static HTML, CSS, presentation-only JS,
  images, fonts, and legal pages — without breaking production.
- **Marketing end-state:** Bluehost static-only is the **interim** milestone.
  Moving marketing to **Go High Level (GHL)** remains a **deferred future
  phase** (see Phase 13) and is out of scope until Steps 1–12 are complete.

---

## Verified starting facts (as of last update)

These were confirmed by reading the current code. They shape the plan.

- **Single production Supabase project in code:** `hiejaayyeprfnrrukbam`
  (hardcoded in `auth.js`, `jd-demo.php`, `jd-brain.html`, `index.html`).
- **v0 is connected to a DIFFERENT Supabase project** (`waevqqrqelloacoxywqq`),
  which appears **nowhere** in production code. v0 cannot introspect the real
  production DB until `...bam` is connected (Step 2).
- **Live checkout = hardcoded Stripe Payment Links** in `index.html`
  (`buy.stripe.com/...`). `api/create-checkout.js` exists but is **NOT wired**.
- **Live billing management = hardcoded Stripe billing-portal link** in
  `index.html`. `api/create-portal.js` exists but is **NOT wired**.
- **Tier vocabulary mismatch (UNRESOLVED — see Step 11):** live gating
  (`jd-demo.php`) and live Payment Links use **`lite` / `core` / `pro`**. The
  target canonical set is **`essentials` / `pro` / `founding` / `executive`**
  (matches the unused `create-checkout.js`). This MUST be reconciled by
  verification before any tier change.
- **AI brain parity gap:** `api/jd-brain-gateway.js` is currently a thin stub
  (single model call, minimal prompt) — **not** a port of the sophisticated
  `jd-brain.php`. Full parity is Step 8.
- **Files NOT in repo (Bluehost-only, must be retrieved):** `jd-access.php`,
  the live `jd-brain.php`, `reset-password.php`, and possibly `enterprise.html`.
- **Conversation history:** no PHP or Vercel component persists conversation
  content (verified against available copies). `jd-brain-gateway.js` writes
  operational logs to a Supabase `application_logs` table only.

---

## Step 0 — Retrieval & baseline (prerequisite gate)

**Objective:** Have every Bluehost-only asset in hand before analysis.

**Actions**
- Complete the pull described in `docs/BLUEHOST_RETRIEVAL_CHECKLIST.md`.
- Confirm receipt of `jd-access.php`, live `jd-brain.php`, `reset-password.php`,
  and (if it exists) `enterprise.html`.
- Diff the **live** `jd-demo.php` against the repo copy; record any differences.

**Verification gate**
- [ ] All HIGH-priority files retrieved and readable.
- [ ] Live-vs-repo `jd-demo.php` diff documented.
- [ ] Human approves advance to Step 1.

**Rollback:** N/A (read-only retrieval).

---

## Step 1 — PHP-to-Vercel feature-parity specification

**Objective:** Document every capability of `jd-demo.php` + `jd-brain.php`
versus the current Vercel app.

**Actions**
- Capture: Dr. Castle persona/advisory behavior, prompt construction, required
  response structure/headings, clarifying-question mode, research + citation
  logic (Semantic Scholar), AI model settings, timeout/retry behavior,
  trial/access checks, request/response formats, error handling, UI behavior,
  conversation handling.
- Classify each capability: **Already present / Must be migrated / Must be
  redesigned / Can be retired / Requires admin decision.**

**Verification gate**
- [ ] Every capability listed and classified.
- [ ] "Requires admin decision" items raised to you and resolved.
- [ ] Human approves the spec.

**Rollback:** N/A (documentation).

---

## Step 2 — Verify Vercel & Supabase production configuration

**Objective:** Confirm the real production environment before any change.
**No database structures created in this step.**

**Actions**
- **Connect v0/Vercel tooling to the production Supabase project `...bam`
  (`hiejaayyeprfnrrukbam`).** (Human action — v0 cannot self-connect.)
- Verify production / preview / development environment separation.
- Verify required Vercel env-var **names** (note existing inconsistency:
  `STRIPE_ACCESS_TOKEN` vs `STRIPE_SECRET_KEY`; standardize).
- Confirm no privileged Supabase credentials (service-role) are exposed
  client-side.
- Confirm Stripe, OpenAI, Supabase, and future GHL secrets are server-side only.
- Identify credentials to rotate post-migration.

**Verification gate**
- [ ] `...bam` connected and its real schema reviewed (read-only).
- [ ] Env separation + var names confirmed; no secret leakage client-side.
- [ ] Rotation list drafted.
- [ ] Human approves.

**Rollback:** N/A (verification only).

---

## Step 3 — Documentation & coding standards

**Objective:** Establish authoritative repo documentation.

**Actions**
- Create/update docs for: architecture, routes, integrations, env vars,
  existing Supabase architecture, authentication, trial/access logic, logging,
  migration status, troubleshooting, change history.
- Label/document every file, route, function, external dependency, env var, and
  every replacement or legacy component.

**Verification gate**
- [ ] Docs reviewed against verified Step 1–2 facts.
- [ ] Human approves.

**Rollback:** N/A (documentation).

---

## Step 4 — Non-breaking route-transition plan

**Objective:** A route map that guarantees no downtime.

**Actions**
- Map: existing Bluehost routes, existing Vercel routes, new intuitive routes,
  temporary aliases, redirects, retirement order, rollback behavior.
- Enforce: `jd-demo.php` stays until `jd-brain` reaches parity;
  `reset-password.php` stays until Supabase recovery works via Vercel; legacy AI
  routes stay until the Vercel gateway is proven.

**Verification gate**
- [ ] Every legacy route has a keep-until condition + rollback.
- [ ] Human approves.

**Rollback:** N/A (planning).

---

## Step 5 — Initial Supabase logging

**Objective:** Baseline observability using existing Supabase architecture
where possible.

**Actions**
- Log: auth events, authorization decisions, trial events, AI-gateway
  transactions, Stripe-related app events, Supabase/OpenAI dependency calls,
  health/dependency checks, application transactions, silent partial failures,
  administrative actions, redirect/migration activity.
- Include transaction/correlation identifiers.
- **Defer** log drains, advanced alerting, tracing, performance monitoring to
  Phase 2.

**Verification gate**
- [ ] Log events verified appearing in the `...bam` project.
- [ ] No message/content or secret logged.
- [ ] Human approves.

**Rollback:** Disable new logging writes; no data model depends on them yet.

---

## Step 6 — Consolidate authentication into Supabase Auth

**Objective:** One Vercel-hosted Supabase Auth experience.

**Actions**
- Implement registration, email verification, login, logout, password recovery,
  session validation on Vercel.
- Remove duplicate login/registration logic; replace `reset-password.php`;
  remove PHP session dependence; preserve legacy route redirects.
- Test existing users AND new users.

**Verification gate**
- [ ] All six auth flows pass for existing + new users.
- [ ] Legacy redirects still resolve.
- [ ] **Bluehost auth NOT removed** until admin validation complete.
- [ ] Human approves.

**Rollback:** Re-point auth routes to Bluehost; Vercel auth is additive until
validated.

---

## Step 7 — Consolidate trial & application-access logic

**Objective:** Move trial enforcement to Vercel, preserving business rules.

**Actions**
- Retrieve and understand `jd-access.php`; preserve valid **business rules**
  (not necessarily the PHP implementation).
- Move server-side trial enforcement into Vercel; store protected access state
  in existing Supabase structures where possible.
- Require account creation before trial access; block anonymous AI-gateway
  access.
- Define/verify trial start, duration, expiration, conversion behavior.
- Log every trial grant, denial, expiration, override.

**Verification gate**
- [ ] Trial lifecycle verified end-to-end against the documented rules.
- [ ] Anonymous access blocked.
- [ ] Human approves.

**Rollback:** Keep legacy PHP access checks live until Vercel enforcement is
verified.

---

## Step 8 — Port the full Digital JD AI brain to Vercel

**Objective:** Bring the Vercel gateway to **functional parity** with
`jd-brain.php` (closing the verified stub gap).

**Actions**
- Migrate + test: Dr. Castle persona, advisory reasoning, required output
  headings, clarifying-question mode, Semantic Scholar research, citation
  generation, model configuration, retry/timeout handling, safe error handling,
  access checks, operational logging.
- Preserve **exact response contracts** required by the current UI.

**Verification gate**
- [ ] Output matches PHP brain on a documented test set (headings, citations,
      clarifying mode, persona).
- [ ] UI renders identically against the new gateway.
- [ ] Human approves.

**Rollback:** Legacy AI route stays live (Step 4) until parity is signed off.

---

## Step 9 — Secure the AI gateway

**Objective:** Enforce access on every AI request.

**Actions**
- Require: valid Supabase session, valid trial/paid access, appropriate tier
  where relevant, valid input, allowed request size, usage controls, sanitized
  errors, transaction logging.
- Explicitly reject: anonymous users, invalid sessions, expired trials,
  unauthorized accounts, oversized/malformed requests.

**Verification gate**
- [ ] Each reject condition verified with a test request.
- [ ] Legitimate requests unaffected.
- [ ] Human approves.

**Rollback:** Relax to prior gateway behavior if legitimate traffic is blocked.

---

## Step 10 — Consolidate the application under jd-brain

**Objective:** `jd-brain` becomes the single application experience.

**Actions**
- Consolidate login, trial, billing, AI, and access states into the Vercel app.
- Keep code **modular** (not one giant file); remove duplicated page logic;
  preserve required legacy route aliases.
- Confirm all existing PHP-app functions are covered.

**Verification gate**
- [ ] Function-coverage checklist (from Step 1) fully mapped to jd-brain.
- [ ] No regression vs. `jd-demo.php`.
- [ ] Human approves.

**Rollback:** `jd-demo.php` remains available until sign-off.

---

## Step 11 — Preserve the existing Stripe purchase flow

**Objective:** Do not disturb payments during migration.

**Actions**
- Keep current Stripe Payment Links **unchanged**.
- **Do NOT wire `api/create-checkout.js`.**
- Do NOT redesign subscription synchronization yet.
- Preserve purchase buttons and return paths; confirm Payment Links functional.
- Verify no Bluehost server-side Stripe dependency remains.

**Tier reconciliation (VERIFY-FIRST — flagged conflict)**
- Target canonical tiers: **`essentials` / `pro` / `founding` / `executive`.**
- **VERIFIED CONFLICT:** live gating + live Payment Links currently use
  **`lite` / `core` / `pro`.** Before ANY tier change, verify the live
  entitlement writer (the Stripe→Supabase path) and confirm what `plan_tier`
  values production actually stores. **Do not rename/replace tiers until this
  is verified**, or production access could break.
- The improved Stripe→Supabase entitlement process is a **post-migration
  phase**.

**Verification gate**
- [ ] Payment Links confirmed working; buttons/return paths intact.
- [ ] Live `plan_tier` values documented from `...bam`.
- [ ] Tier reconciliation decision made WITH verified data.
- [ ] Human approves.

**Rollback:** No change to Stripe = inherently safe; revert any button edits.

---

## Step 12 — Reduce Bluehost to static-only hosting

**Objective:** Bluehost hosts only static presentation content.

**Actions (only after Vercel replacements are verified operational)**
- Repoint application links to Vercel; redirect legacy PHP routes.
- Remove from Bluehost: AI logic, authentication logic, password-reset logic,
  trial/access logic, application DB dependencies, webhooks, application cron
  jobs, secrets.
- Rotate migrated credentials; preserve an offline archive.

**Verification gate**
- [ ] Every removed function verified working on Vercel first.
- [ ] Redirects resolve; no dead links.
- [ ] Credentials rotated; archive stored.
- [ ] Bluehost verified to contain only static content.
- [ ] Human approves migration complete.

**Rollback:** Restore from the offline archive; re-enable redirects to Bluehost.

---

## Phase 13 (DEFERRED) — Marketing to Go High Level (GHL)

Out of scope until Steps 0–12 are complete and signed off. When resumed:
marketing/legal pages move from Bluehost static hosting to GHL as pure
marketing (no auth, no checkout logic, CTAs link out to Vercel). Bluehost
static hosting is the interim host until this phase runs.

---

## Open items requiring your decision

1. **Production Supabase connection:** you must connect `...bam`
   (`hiejaayyeprfnrrukbam`) to v0/Vercel tooling (Step 2). v0 cannot self-connect.
2. **Tier vocabulary:** confirm the reconciliation approach at Step 11 once live
   `plan_tier` values are verified.
3. **`enterprise.html`:** confirm whether it exists live (referenced by
   `index.html`/`contact.html` but absent from the repo).
