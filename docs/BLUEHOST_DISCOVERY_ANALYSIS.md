# Bluehost Discovery & Dependency Analysis — Digital JD

> **Purpose:** A plain-language inventory of everything the Digital JD product currently
> has on, or depends upon, **Bluehost** and **legacy `.php` functionality**, so that a
> decision can be made about what must be **retrieved, analyzed, migrated, redirected,
> archived, or retired** before Bluehost can be reduced to a static-only website.
>
> **This is a discovery and documentation task only.** No production code, PHP, routes,
> Supabase structures, Stripe, authentication, trial, or AI functionality was modified in
> the creation of this document.

---

## 1. Analysis Metadata

| Field | Value |
|---|---|
| **Date & time of analysis** | 2026-07-15, 23:50 UTC |
| **Repository name** | `jdcastle53-coder/digital-jd-site` |
| **Branch analyzed** | `v0/jdcastle53-coder-50b63f95` (latest commit `59f4783`) |
| **Branch this document is committed to** | `discovery/bluehost-analysis` (NOT the production branch) |
| **Production / base branch** | `main` |
| **Vercel project analyzed** | `digital-jd-site` (project id `prj_UJZGTulsph0MbVIngVZXBa7SNFKf`) |
| **Analyst / session identifier** | v0 assistant session (chat `t450`), operating on the connected GitHub repo |
| **Primary production domain** | `digitaljd.org` (currently served from Bluehost) |

### Bluehost materials AVAILABLE for inspection
- `jd-demo.php` — the legacy PHP application page (present in the repository, 2,524 lines).
- A near-complete **copy of `jd-brain.php`** (the PHP AI gateway) was pasted into the working
  session earlier and is preserved as a reference attachment. Its core logic (identity,
  prompts, research, OpenAI call, trial gating, `MAIN` block) is therefore known and is
  documented in Section 4. **Note:** this is a captured copy, not the live production file.
- All Vercel-side source (the `api/*` functions, all `.html` pages, `auth.js`, `package.json`).

### Bluehost materials NOT available for inspection
The following are referenced by code but are **not present in the repository** and were **not**
available to inspect directly. Their behavior is inferred from how they are called:
- **`jd-access.php`** — required at the top of `jd-demo.php` (`require_once __DIR__ . '/jd-access.php'`).
  Provides the trial/access-control layer and shared helper functions (see Section 4.3).
- **`jd-brain.php`** — the live PHP AI gateway called by `jd-demo.php`. Only a captured copy of
  its **lower half** is available; the top of the file (the `$CONFIG` array, its `require`
  statements, and the definitions of `respond()`, `get_request_data()`, `clean_text()`,
  `require_post_method()`, `validate_api_key()`, `jd_clean_token()`, `jd_get_trial_token_from_request()`)
  was **not** captured and is **unconfirmed**.
- **`reset-password.php`** — the password-reset handler that Supabase recovery emails point to.
- **`enterprise.html`** — linked from the pricing/tier section of `index.html` (`/enterprise.html`),
  not present in the repository.
- **Server configuration** — no `.htaccess`, no `vercel.json`, and no environment/`.env` file exists
  in the repository. Any Bluehost URL rewrites, PHP version pinning, or redirects live only on the
  Bluehost server and could not be inspected.

### Important limitations discovered during analysis
1. **The most valuable intellectual property lives in a file we cannot fully see.** The
   "Digital JD Mind" (Dr. Castle's identity, reasoning model, and answer structure) is defined in
   **`jd-brain.php`**, which is Bluehost-only. A captured copy exists but must be treated as a
   snapshot, not the source of truth. The live file must be pulled from Bluehost before decommissioning.
2. **The Vercel AI function is NOT equivalent to the PHP AI gateway** (see Section 4.4). Retiring
   Bluehost without first porting `jd-brain.php`'s logic would silently downgrade the product.
3. **Two separate, diverging versions of the app exist** (PHP vs. HTML) with two different back ends
   (see Section 3). They are not in sync.
4. **Config/secret values referenced in PHP (`$CONFIG[...]`) could not be confirmed** because the top
   of `jd-brain.php` and all of `jd-access.php` were unavailable.
5. This analysis is based on the repository connected to this session. If the **live Bluehost files
   differ from the repository** (which is likely, given editing has happened directly on Bluehost),
   a file-by-file comparison against the live server is required before retirement.

---

## 2. Executive Summary (plain language)

Digital JD today runs across **three platforms at once**:

- **Bluehost** hosts the public site at `digitaljd.org` and, critically, runs the **legacy PHP
  application** — the login-gated demo app (`jd-demo.php`), the "brain" that actually produces the
  AI answers (`jd-brain.php`), the access/trial control layer (`jd-access.php`), and the
  password-reset page (`reset-password.php`).
- **Vercel** hosts a newer set of Node.js serverless functions (`/api/*`) and a newer HTML version
  of the app (`jd-brain.html`, `signin.html`, `demo.html`, etc.).
- **Supabase** is the identity provider (user accounts, sign-in, password reset) and also stores
  application logs and chat messages.

The single biggest finding: **the sophisticated, differentiated AI logic only exists on Bluehost
(`jd-brain.php`).** The Vercel equivalent (`api/jd-brain-gateway.js`) is a bare-bones placeholder.
Before Bluehost can be reduced to static-only, that PHP logic must be retrieved and ported, or the
product loses the very thing that makes it "Digital JD."

---

## 3. The Two Parallel Application Stacks

There are **two versions of the working app**, and they do not share a back end.

### 3.1 Legacy stack (Bluehost / PHP) — the one currently linked from marketing
| Piece | File | Status |
|---|---|---|
| App page (UI + trial gate) | `jd-demo.php` | In repo; depends on Bluehost PHP |
| Access / trial control | `jd-access.php` | **Missing** — Bluehost only |
| AI gateway ("the brain") | `jd-brain.php` | **Missing** (partial copy only) — Bluehost only |
| Password reset | `reset-password.php` | **Missing** — Bluehost only |

- `index.html`'s Login link points to **`https://digitaljd.org/jd-demo.php`** (lines 1622, 1637, 2245).
- `jd-demo.php` calls its AI back end at **`./jd-brain.php`** (lines 1696, 1994, 2059) — a **same-origin
  relative path that only works on Bluehost.**
- `jd-demo.php` post-signup/redirect points to **`https://digitaljd.org/jd-demo.php`** (lines 2490, 2501, 2515)
  and password reset to **`https://digitaljd.org/reset-password.php`** (line 2522).

### 3.2 Modern stack (Vercel / HTML + serverless) — newer, not yet the linked default
| Piece | File | Back end it calls |
|---|---|---|
| App page | `jd-brain.html` | `/api/jd-brain-gateway` and `/api/create-portal` |
| Sign-in | `signin.html` | Supabase directly → redirects to `jd-brain.html` |
| Free demo (no signup) | `demo.html` | `/api/jd-brain-gateway` |
| AI gateway | `api/jd-brain-gateway.js` | OpenAI `gpt-4o-mini` + Supabase logging |
| Billing portal | `api/create-portal.js` | Stripe |
| Checkout (see 5) | `api/create-checkout.js` | Stripe (appears **orphaned** — see §5.2) |

**Consequence:** The migration must pick ONE stack as the survivor. The approved plan
(`v0_memories/user/migration-plan.md`) is to **standardize on the Vercel HTML app and retire the PHP
app** — but that is only safe once `jd-brain.php`'s logic is ported (Section 4.4).

---

## 4. Deep Dive: The PHP Layer (what must be preserved)

### 4.1 `jd-demo.php` (available)
- A full single-file app: HTML + CSS + a large JavaScript block.
- **Server-side PHP is minimal but load-bearing:** the first 14 lines require `jd-access.php` and call
  `jd_get_trial_token_from_request()` / `jd_validate_trial_token()` to gate access before the page renders.
- Recent feature work (Executive Advisor vs. Executive Content Workshop fork, handoff button, outline
  indentation) lives here in JavaScript.
- Talks to the AI via `fetch('./jd-brain.php')` in three places (advisor, clarify, and content flows).
- Hardcodes upgrade links to `https://digitaljd.org/#pricing` and `/#sprint`.

### 4.2 `jd-brain.php` (partial copy available — HIGH VALUE / HIGH RISK)
This is the product's crown jewel. The captured copy documents:
- **`jd_identity_block()`** — Dr. J.D. Castle's persona and authority.
- **`jd_altitude_principle()`** — the "get out of the plane, drive the road with them" differentiator.
- **`jd_reasoning_sequence()`** — Dr. Castle's 4-step decision model and hidden "foundations."
- **`build_system_prompt()`** — enforces the EXACT answer headings the UI depends on:
  `SITUATIONAL ANALYSIS` / `JD INSIGHT` / `EXECUTION PLAN` / `COMMUNICATION DRAFT`.
- **`build_clarifying_prompt()`** — the "ask 2–4 clarifying questions first" behavior.
- **Semantic Scholar research integration** (`jd_fetch_research`, `jd_format_research_for_prompt`,
  `jd_build_citation_section`) — grounds final answers in peer-reviewed studies, fails silently on error.
- **`call_openai()`** — calls OpenAI with a configurable model, temperature, and `max_tokens`, 90s timeout.
- **`MAIN` block** — validates trial token, supports a `test_mode`, branches on `mode === 'clarify'`,
  returns JSON `{ success, reply, citations, trial }`.

> ⚠️ **The heading strings in `build_system_prompt()` are a hard contract with the UI.** Any port must
> preserve them exactly, or the interface parsing breaks.

### 4.3 `jd-access.php` (missing — inferred)
Referenced but never seen. Based on call sites, it provides at minimum:
- `jd_get_trial_token_from_request()`, `jd_validate_trial_token()`, `jd_clean_token()` — trial/access control.
- Very likely also the shared helpers used by `jd-brain.php`: `respond()`, `get_request_data()`,
  `clean_text()`, `require_post_method()`, `require_post_method()`, `validate_api_key()`, and the `$CONFIG`
  array (OpenAI key/model/url, `test_mode`, research toggles).
- **Action required:** retrieve this file from Bluehost. Without it, both the trial system and the AI
  gateway's configuration are undocumented.

### 4.4 Feature gap: PHP brain vs. Vercel brain (CRITICAL)
| Capability | `jd-brain.php` (Bluehost) | `api/jd-brain-gateway.js` (Vercel) |
|---|---|---|
| Dr. Castle identity / altitude / reasoning model | ✅ Full | ❌ One generic sentence |
| Enforced answer structure (4 headings) | ✅ Yes | ❌ No |
| Clarifying-questions mode | ✅ Yes (`mode=clarify`) | ❌ No |
| Peer-reviewed research + citations | ✅ Yes (Semantic Scholar) | ❌ No |
| Trial-token gating | ✅ Yes | ❌ No |
| Model | Configurable (`$CONFIG['openai_model']`) | Hardcoded `gpt-4o-mini` |
| Supabase logging of requests | ❌ Not in captured copy | ✅ Yes (`application_logs`) |

**Interpretation:** the Vercel function is an early stub. It must be brought up to parity with the PHP
brain **before** the PHP version is retired, or the migration silently degrades answer quality and
removes the trial gate.

---

## 5. Payments (Stripe)

### 5.1 Live checkout actually in use — Stripe Payment Links
The marketing pricing section in `index.html` sends buyers to **hardcoded Stripe Payment Links**
(`https://buy.stripe.com/...`), one per tier:
- Essentials — `00w9ASftn1aueZ6eYDdEs02` (line 1858)
- Pro — `fZu4gychbbP84kseYDdEs01` (line 1907)
- Executive — `3cI14mgxr1au4ks2bRdEs00` (line 1952)
- Enterprise — links to `/enterprise.html` (missing file)
- `digitaljd-vs-ai.html` contains a **placeholder** link `buy.stripe.com/YOUR_STARTER_LINK` (line 33) — a broken/unfinished link to fix.

These Payment Links are **hosted by Stripe, not Bluehost**, so they are safe from the Bluehost retirement.

### 5.2 `api/create-checkout.js` — appears ORPHANED
- Defines server-side **Price IDs** (`essentials`, `pro`, `founding`, `executive`) and creates a Checkout
  Session. **However, no HTML/JS file calls `/api/create-checkout`** anywhere in the repo. The live site
  uses the Payment Links above instead.
- **Action:** confirm whether `create-checkout.js` is intended future functionality or dead code. It is
  not a Bluehost dependency either way, but the redundancy should be resolved.

### 5.3 `api/create-portal.js` — in use
- Called by `jd-brain.html` (line 247) to open the Stripe billing portal. Looks up the customer by email.
- Not a Bluehost dependency (runs on Vercel), but note its `return_url` defaults to `.../jd-brain.html`.

### 5.4 Secrets
- Both Stripe functions read `STRIPE_ACCESS_TOKEN` (falling back to `STRIPE_SECRET_KEY`) from environment
  variables. These must be confirmed present in **Vercel** project settings (they are not in the repo).

---

## 6. Authentication & Identity (Supabase)

- **Provider:** Supabase project `hiejaayyeprfnrrukbam` (`https://hiejaayyeprfnrrukbam.supabase.co`).
- The **anon key is hardcoded** in `auth.js` (line 3), `index.html` (line 7), `jd-brain.html` (line 14),
  and `signin.html` loads the Supabase SDK. This is expected for a public anon key, but it means the key
  is duplicated in several files.
- **`auth.js`** implements a client-side trial model: a `TRIAL_HOURS = 24` window stored in the user's
  `user_metadata.expires_at`, with `requireActiveSession()` redirecting to `signin.html` or `expired.html`.
- **Auth logic is duplicated:** full sign-in / sign-up / reset / sign-out flows exist in **`index.html`**
  (lines ~2108–2237) AND a separate **`signin.html`**, plus the `auth.js` helper. These should be
  consolidated to one source of truth during migration.

### 6.1 Bluehost-coupled Supabase settings (MUST be repointed)
These redirect URLs point back at Bluehost/PHP and will break once PHP is gone:
- `index.html` line 2161 — signup `emailRedirectTo: 'https://digitaljd.org/jd-demo.php'`
- `index.html` line 2199 — reset `redirectTo: 'https://digitaljd.org/reset-password.php'`
- `jd-demo.php` line 2522 — reset `redirectTo: "https://digitaljd.org/reset-password.php"`
- **Also (outside the repo):** the **Supabase dashboard** "Site URL" and "Redirect URLs" and the
  **email templates** almost certainly reference Bluehost and must be updated to the surviving domain.

### 6.2 Supabase tables referenced in code
- `messages` — chat history, written/read by `jd-brain.html` (lines 312, 321, 339).
- `application_logs` — structured logs written by `api/jd-brain-gateway.js`.
- ⚠️ **`plan_tier` mismatch:** Stripe/checkout uses tier names `essentials/pro/founding/executive`, but
  earlier app gating logic referenced `lite/core/pro`. Whatever writes `plan_tier` into Supabase is a
  **Stripe webhook that lives outside this repository** and was not found. This must be located and its
  exact values confirmed before any tier-gating work (e.g. Executive-only features) is trusted.

---

## 7. Complete File Inventory (repository)

### Server-side / dynamic (PHP — Bluehost-coupled)
| File | Present? | Notes |
|---|---|---|
| `jd-demo.php` | ✅ | Legacy app; requires `jd-access.php`; calls `./jd-brain.php` |
| `jd-access.php` | ❌ | Trial/access + shared helpers; Bluehost only |
| `jd-brain.php` | ❌ (partial copy) | The AI "brain"; Bluehost only; **highest-value asset** |
| `reset-password.php` | ❌ | Password reset target; Bluehost only |

### Vercel serverless functions (`/api`)
| File | Present? | Status |
|---|---|---|
| `api/jd-brain-gateway.js` | ✅ | Live (modern stack); **not** at feature parity with PHP brain |
| `api/create-portal.js` | ✅ | Live; used by `jd-brain.html` |
| `api/create-checkout.js` | ✅ | Appears orphaned (no caller) |

### Static / front-end HTML
| File | Present? | Notes |
|---|---|---|
| `index.html` | ✅ | Marketing landing + duplicated auth + Stripe Payment Links; links to `jd-demo.php` |
| `jd-brain.html` | ✅ | Modern Vercel app |
| `signin.html` | ✅ | Modern sign-in |
| `demo.html` | ✅ | No-signup free demo |
| `digitaljd-vs-ai.html` | ✅ | Marketing; contains a **placeholder** Stripe link |
| `concepts.html`, `contact.html`, `privacy.html`, `terms.html`, `cancel.html`, `success.html`, `expired.html`, `founding-preview.html` | ✅ | Static supporting pages |
| `enterprise.html` | ❌ | Linked from `index.html` but missing |
| `comcastle-digitaljd-promo.html` | ✅ | New cross-promo snippet (not part of Bluehost app) |

### Client script / config / assets
| File | Present? | Notes |
|---|---|---|
| `auth.js` | ✅ | Supabase client + 24h trial gate; hardcoded anon key |
| `package.json` | ✅ | Deps: `@supabase/supabase-js`, `stripe`; `dev` = `vercel dev` |
| `package-lock.json` | ✅ | Lockfile |
| `images/` | ✅ | Asset directory (has `README.md`) |
| `.github/copilot-instructions.md` | ✅ | Tooling instructions |
| `vercel.json` / `.htaccess` / `.env*` | ❌ | No deployment/rewrite/secret config in repo |

---

## 8. External Dependencies & Integrations (summary)

| Dependency | Where it runs | Bluehost-coupled? | Notes |
|---|---|---|---|
| Supabase (auth, `messages`, `application_logs`) | Cloud | Indirectly (redirect URLs) | Repoint dashboard URLs + email templates |
| Stripe Payment Links | Stripe-hosted | No | Safe from retirement |
| Stripe API (`create-portal`, `create-checkout`) | Vercel | No | Confirm secrets in Vercel |
| OpenAI | Called from `jd-brain.php` (Bluehost) AND `api/jd-brain-gateway.js` (Vercel) | Partially | PHP path dies with Bluehost |
| Semantic Scholar (research/citations) | Called from `jd-brain.php` (Bluehost) | **Yes** | Logic exists ONLY in PHP brain |
| Supabase JS SDK (CDN) | Browser | No | Loaded via jsDelivr in several pages |

---

## 9. What Must Happen Before Bluehost Can Be Static-Only

Grouped by required action. (Ordering/execution is out of scope for this discovery task; the approved
sequence lives in `v0_memories/user/migration-plan.md`.)

### RETRIEVE (pull from the live Bluehost server before anything else)
1. **`jd-brain.php`** — the complete, live file (the captured copy is partial; the `$CONFIG` block and
   helper definitions at the top are unconfirmed).
2. **`jd-access.php`** — the entire trial/access layer and shared helpers.
3. **`reset-password.php`** — to understand the exact recovery-token handling.
4. **Any `.htaccess`** or server rewrite rules on Bluehost.
5. The **live `jd-demo.php`** for a diff against the repo copy (direct Bluehost edits may exist).

### ANALYZE / CONFIRM
6. The **`plan_tier` writer** (Stripe webhook) that lives outside this repo, and its exact tier values.
7. Whether **`api/create-checkout.js`** is future functionality or dead code.
8. Presence of all **secrets in Vercel**: `STRIPE_ACCESS_TOKEN`/`STRIPE_SECRET_KEY`, `OPENAI_API_KEY`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, plus whatever `jd-brain.php`'s `$CONFIG` expects.

### MIGRATE / PORT (the make-or-break work)
9. Port the **entire "Digital JD Mind"** from `jd-brain.php` into the Vercel `api/jd-brain-gateway.js`
   (identity, altitude, reasoning, exact answer headings, clarifying mode, Semantic Scholar research,
   configurable model, trial gating). **This is the single most important migration item.**
10. Rebuild **`reset-password.php` → `reset-password.html`** on Vercel.
11. Decide the **surviving app** (plan: Vercel `jd-brain.html`) and confirm it fully covers `jd-demo.php`.

### REDIRECT / REPOINT
12. Change `index.html` Login links from `https://digitaljd.org/jd-demo.php` to the surviving Vercel app.
13. Change `jd-demo.php`'s relative `./jd-brain.php` calls (if the PHP app is kept transitionally) or
    retire them.
14. Update **Supabase dashboard** Site URL, Redirect URLs, and email templates off Bluehost/PHP.
15. Fix the two in-code Supabase redirect URLs pointing at `jd-demo.php` / `reset-password.php`.
16. Fix the **placeholder Stripe link** in `digitaljd-vs-ai.html` and the **missing `enterprise.html`**.

### ARCHIVE / RETIRE
17. Once parity is confirmed and traffic is verified on the surviving stack, retire the PHP files
    (`jd-demo.php`, `jd-brain.php`, `jd-access.php`, `reset-password.php`) and decommission Bluehost.

---

## 10. Security Reviewer Notes

- **Public anon key** (Supabase) is intentionally client-side and duplicated across four files; acceptable,
  but consolidation reduces drift risk.
- **Service-role key** (`SUPABASE_SERVICE_ROLE_KEY`) is used only server-side in `api/jd-brain-gateway.js`
  to bypass RLS for logging — confirm it is never exposed to the browser and exists only as a Vercel secret.
- **Stripe secret** and **OpenAI key** must exist only as server-side environment variables (Vercel and,
  currently, Bluehost). Confirm none are committed to the repo (none were found in this analysis).
- **Trial gating currently has two different models:** the PHP token model (`jd-access.php`) and the
  client-side `auth.js` 24-hour `expires_at` model. A client-side expiry is trivially bypassable; if the
  trial is commercially important, the surviving implementation should enforce it server-side.
- **CORS/allowed-origin:** the `api/*` functions do not appear to restrict origins. If the marketing site
  moves to a different domain, add origin checks (noted as Step 5 in the approved migration plan).

---

*End of discovery analysis. No production systems were modified. This document is committed to the
`discovery/bluehost-analysis` branch for review.*
