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

- **Supabase connection:** v0 is currently connected to `waevqqrqelloacoxywqq`,
  NOT the production `hiejaayyeprfnrrukbam`. The production DB cannot be
  introspected until "bam" is connected (Step 2).
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

### [~] Step 1 — PHP→Vercel feature-parity spec
Write down exactly what the PHP app does (inputs, outputs, auth checks, access
gates, AI calls) so Vercel can replicate it feature-for-feature.
**Verify:** every PHP behavior maps to a planned Vercel route/function.
**IN PROGRESS:** brain request/response contract, two-mode behavior, research
grounding, and trial-gating captured in `docs/PHP_TO_VERCEL_PARITY.md`. Next:
map each behavior to a concrete Vercel route/function.

### [ ] Step 2 — Verify Vercel/Supabase production config
Confirm production Vercel + Supabase settings and connect the "bam" production
project to v0.
**Verify:** v0 is connected to `hiejaayyeprfnrrukbam`; prod schema introspectable.

### [ ] Step 3 — Documentation & coding standards
Establish the coding + documentation standards the ported code must follow.
**Verify:** standards doc exists and is agreed before porting begins.

### [ ] Step 4 — Non-breaking route-transition map
Map every current URL to its future Vercel route with zero production breakage.
**Verify:** each live URL has a defined target route + redirect strategy.

### [ ] Step 5 — Initial Supabase logging
Add baseline event logging in Supabase (deeper Phase-2 logging deferred).
**Verify:** core auth/access/AI events are logged in the prod project.

### [ ] Step 6 — Consolidate auth into Supabase Auth
Move all authentication into Supabase Auth and replace `reset-password.php`.
**Verify:** login + password reset work end-to-end on Vercel; PHP auth retired.

### [ ] Step 7 — Consolidate trial/access logic into Vercel
Bring trial and access-gating logic out of PHP into Vercel.
**Verify:** trial start/expiry + tier gating enforced server-side on Vercel.

### [ ] Step 8 — Port the FULL AI brain to Vercel
Replace the stub gateway with a real port of `jd-brain.php` (the 3-part output
system + knowledge-base reasoning).
**Verify:** Vercel gateway output matches PHP brain behavior on test prompts.

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
