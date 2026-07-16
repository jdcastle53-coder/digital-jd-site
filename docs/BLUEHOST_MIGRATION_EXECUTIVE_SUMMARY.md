# Bluehost → Vercel Migration — Executive Summary

> **Companion to:** `docs/BLUEHOST_DISCOVERY_ANALYSIS.md`
> **Branch:** `discovery/bluehost-analysis` (discovery/documentation only — no production code, PHP, routes, Supabase, Stripe, auth, trial, or AI functionality was modified)
> **Date:** 2026-07-15
> **Repository:** `jdcastle53-coder/digital-jd-site`
> **Primary production domain:** `digitaljd.org` (currently served from Bluehost)

---

## 1. Migration Objective (the guiding principle)

**Reduce Bluehost to a static-only website — HTML, CSS, presentation-only JavaScript, images, fonts, legal pages, and other static content — without breaking any existing production functionality.**

Every recommendation below serves that single goal. All *dynamic* behavior (authentication, payments, AI generation, access/trial control, password reset) moves off Bluehost to the platform that should own it (Vercel, Supabase, or Stripe). Bluehost keeps only content that never executes server-side logic.

---

## 2. What Bluehost Currently Does

Bluehost today is doing **two very different jobs at once**:

**A. Static presentation (should stay):**
- Serves the public marketing site at `digitaljd.org` (`index.html` and supporting pages).
- Hosts images, fonts, styling, and legal/informational pages (privacy, terms, contact, etc.).

**B. Dynamic application logic (must move):**
- Runs the **legacy PHP application** — the login-gated demo app (`jd-demo.php`).
- Runs **`jd-brain.php`**, the AI "brain" that actually produces Digital JD's answers — including Dr. Castle's persona, the enforced answer structure, the clarifying-questions flow, and peer-reviewed research/citations.
- Runs **`jd-access.php`**, the trial/access-control layer and shared configuration/helpers.
- Runs **`reset-password.php`**, the password-reset handler that Supabase recovery emails point to.

The critical point: **Bluehost is not just a static host today — it is running the single most valuable piece of the product (the AI brain) and the access gate that protects it.**

---

## 3. Which Digital JD Functions Appear Dependent on Bluehost

| Function | Bluehost-dependent? | Why |
|---|---|---|
| Marketing / landing pages | Only as static content | Pure presentation; safe to keep as static |
| Login-gated app (`jd-demo.php`) | **Yes** | PHP page; requires `jd-access.php`; calls `./jd-brain.php` via same-origin relative path |
| AI answer generation (`jd-brain.php`) | **Yes — critical** | The differentiated "Digital JD Mind" logic exists only here |
| Trial / access control (`jd-access.php`) | **Yes** | Token validation + `$CONFIG` (keys, model, toggles) live only here |
| Password reset (`reset-password.php`) | **Yes** | Supabase recovery emails point directly at this Bluehost URL |
| Research + citations (Semantic Scholar) | **Yes** | Implemented only inside `jd-brain.php` |
| Payments | No | Stripe Payment Links are Stripe-hosted; Stripe API functions run on Vercel |
| Identity / user accounts | Indirectly | Supabase is the provider, but redirect URLs point back at Bluehost/PHP |

---

## 4. What Must Move to Vercel

Vercel becomes the home for **all programmatic application logic**:

1. **The AI brain — highest priority.** Port the entire `jd-brain.php` logic into `api/jd-brain-gateway.js`: Dr. Castle identity, the "altitude" principle, the 4-step reasoning model, the **exact answer headings** (`SITUATIONAL ANALYSIS` / `JD INSIGHT` / `EXECUTION PLAN` / `COMMUNICATION DRAFT`), the clarifying-questions mode, Semantic Scholar research/citations, configurable model, and trial gating. *(The current Vercel function is a bare stub and is NOT at parity — retiring PHP first would silently downgrade the product.)*
2. **The surviving app UI.** Standardize on the Vercel HTML app (`jd-brain.html`) and retire the PHP app (`jd-demo.php`), once the brain above is at parity.
3. **Password reset.** Rebuild `reset-password.php` as a Vercel page (`reset-password.html` + logic).
4. **Access / trial control.** Re-implement the `jd-access.php` responsibilities (token validation, config) in the Vercel stack.
5. **Redirect targets.** All links currently pointing to `digitaljd.org/jd-demo.php` and `/reset-password.php` repointed to the surviving Vercel pages.

---

## 5. What Must Move to (or be authoritative in) Supabase Auth

Supabase remains the **single source of truth for identity**, but its configuration must be moved off Bluehost:

1. **Dashboard Site URL & Redirect URLs** — currently pointing at Bluehost/PHP; repoint to the surviving Vercel domain/pages.
2. **Email templates** (confirmation, recovery) — update any Bluehost/PHP URLs.
3. **In-code redirect URLs** — fix `emailRedirectTo`/`redirectTo` values that reference `jd-demo.php` and `reset-password.php`.
4. **Consolidate duplicated auth logic** — sign-in/up/reset flows are currently duplicated across `index.html`, `signin.html`, and `auth.js`; collapse to one source of truth.
5. **Confirm tables** — `messages` (chat history) and `application_logs` remain in Supabase.

*Authentication remains a Supabase responsibility — it does not move to Vercel; only its URLs/redirects get repointed.*

---

## 6. What Must Remain Authoritative in Stripe

Stripe stays the **system of record for all payments and subscription state**:

1. **Stripe Payment Links** (Essentials / Pro / Executive) — Stripe-hosted; already independent of Bluehost. No change needed except verifying each link.
2. **Stripe API functions** (`create-portal.js`, and `create-checkout.js` if retained) — run on Vercel, read secrets from Vercel env vars.
3. **Subscription tier as truth** — the customer's plan/tier lives in Stripe; the app should treat Stripe (via its webhook) as authoritative, not hardcode entitlements.
4. **Open item:** the **`plan_tier` writer** (a Stripe webhook) lives *outside this repository* and must be located; its exact tier values must be confirmed before any tier-gating (e.g. Executive-only features) can be trusted. There is a known naming mismatch (`essentials/pro/executive` vs. app logic referencing `lite/core/pro`).

---

## 7. What Can Remain Temporarily as Static Content in Bluehost

The following can stay on Bluehost during and after the transition **as static content only** (no server-side execution), consistent with the end-state objective:

- `index.html` marketing landing (once its login links and auth logic are repointed to Vercel/Supabase).
- Static supporting/legal pages: `privacy.html`, `terms.html`, `contact.html`, `concepts.html`, `cancel.html`, `success.html`, `expired.html`, `founding-preview.html`, `digitaljd-vs-ai.html`.
- Images, fonts, CSS, and presentation-only JavaScript.

**Condition:** these are only truly "static-safe" once every dynamic hook inside them (Supabase redirect URLs, login links to `jd-demo.php`, the placeholder Stripe link in `digitaljd-vs-ai.html`, the missing `enterprise.html`) has been repointed or resolved. Until then they *look* static but still depend on Bluehost-hosted PHP.

---

## 8. Information That Remains Unknown

These items could not be confirmed from the repository and must be retrieved/verified before execution:

1. **Full live `jd-brain.php`** — only a partial captured copy exists; the top `$CONFIG` block and helper definitions are unconfirmed.
2. **`jd-access.php`** — never seen; entire trial/access + config layer is inferred, not confirmed.
3. **`reset-password.php`** — exact recovery-token handling unknown.
4. **`.htaccess` / server rewrites / PHP version** — no Bluehost server config is in the repo.
5. **Live-vs-repo drift** — direct edits on Bluehost mean the live `jd-demo.php` may differ from the repo copy.
6. **The `plan_tier` webhook** and its exact tier values — outside the repo.
7. **`api/create-checkout.js`** — unclear whether it is future functionality or dead code (no caller found).
8. **Vercel secrets** — presence of `STRIPE_*`, `OPENAI_API_KEY`, `SUPABASE_*`, and whatever `$CONFIG` expects is unverified.
9. **`enterprise.html`** — linked but missing.

---

## 9. Clarifying Questions

1. **Can you retrieve the live Bluehost files** (`jd-brain.php`, `jd-access.php`, `reset-password.php`, any `.htaccess`) so the brain and access layers can be ported accurately? This is the gating dependency for everything else.
2. **Which app is the survivor** — is the approved decision still to standardize on the Vercel `jd-brain.html` app and retire the PHP `jd-demo.php`?
3. **Is `api/create-checkout.js` meant to be used** going forward, or should the site stay on Stripe Payment Links and treat that function as removable?
4. **Where is the `plan_tier` Stripe webhook hosted**, and what are its exact tier values? (Needed before Executive-only gating can be trusted.)
5. **Do you want `index.html` and the legal pages to remain on Bluehost** as static content long-term, or eventually move them to Vercel too so everything lives in one place?
6. **Is there an `enterprise.html`** somewhere, or should the Enterprise link route to a contact/sales flow instead?

---

## 10. One-Line Summary

Bluehost is currently running the product's crown-jewel AI logic and access gate as PHP; the migration moves **all dynamic logic to Vercel (AI, app, reset, access), keeps identity authoritative in Supabase and payments authoritative in Stripe**, and leaves Bluehost holding **only static content** — with the hard prerequisite that `jd-brain.php`/`jd-access.php` are retrieved and ported to parity *before* anything is retired, so production never breaks.
