# PHP → Vercel Parity Spec (Steps 0–1)

Status: Step 0 COMPLETE (files retrieved + archived). Step 1 IN PROGRESS.
Source of truth for the port: `docs/bluehost-archive/` (live Bluehost files, verified).

---

## Step 0 — Retrieved & archived

| File | Lines | What it really is |
|---|---|---|
| `jd-brain.php` | 617 | The LIVE AI brain. Holds the core IP. |
| `jd-access.php` | 211 | 7-day trial-token gating. |
| `reset-password.php` | 100 | Supabase password reset (HTML+JS, minimal PHP). |

`enterprise.html` recovered + archived at `docs/bluehost-archive/enterprise.html`
(presentation-only: accordion + Calendly CTA, no auth/Stripe/Supabase). Still
absent from the deployed repo root — restore during Step 4/10 route work.

---

## The IP inside jd-brain.php (this is what makes DigitalJD "DigitalJD")

The Vercel stub (`api/jd-brain-gateway.js`) has NONE of this. It ships a single
generic line: *"You are Digital JD, a PhD-level leadership advisor..."* Everything
below is missing from Vercel and must be ported in Step 8:

1. **Identity block** — Dr. J.D. Castle persona (73, 17 orgs, 3 Fortune 500, physics/math, first-principles mind, "always seek knowledge and wisdom").
2. **Altitude principle** — the core differentiator: turn-by-turn directions for THEIR car/road, never a "weather report" from 20,000 ft.
3. **Reasoning sequence** — 4-step decision model (weigh source → understand first → all variables on table → connect through experience) + hidden foundations (first-principles, Covey, Robbins, NT values as compass — never quoted/named).
4. **Two-mode contract** — `mode:'clarify'` returns 2–4 situation-specific clarifying questions; otherwise returns the full recommendation.
5. **Exact output headings** (UI depends on them): `SITUATIONAL ANALYSIS` / `JD INSIGHT` / `EXECUTION PLAN` / optional `COMMUNICATION DRAFT`. DOCUMENT MODE swaps in `EXECUTIVE DRAFT`.
6. **Peer-reviewed research grounding** — Semantic Scholar (free, keyless): theme-keyword → query map, fetch top 3, inject findings into the system prompt, append a "SUPPORTING RESEARCH" box, return a `citations[]` payload. Fails silent on timeout.
7. **Model config** — `gpt-4o-mini`, `max_tokens: 1700`, `temperature: 0.7`.

### Request contract (must preserve)
Reads (JSON body, with fallbacks): `message | prompt | input | query`, plus
`mode`, `trial`, `name`, `role`, `company`, `context`.

### Response contract (must preserve — the HTML app depends on it)
`{ success, mode, model, reply, citations[], trial:{ token, remaining } }`

---

## jd-access.php — trial gating (Step 6/7)

- **Storage: a flat file `jd-trials.json` on the Bluehost disk.** This does NOT
  survive on Vercel (ephemeral fs). MUST become a Supabase table in the port.
- 7-day invite tokens: first-use activates, sets `expires_at`, drops cookie `digital_jd_trial`.
- Empty token ⇒ status `supabase_login_allowed` — i.e. paid/logged-in Supabase
  users bypass the trial gate entirely.
- Statuses: active / expired / invalid / inactive / corrupt.

## reset-password.php — auth (Step 6)

- Supabase PKCE `exchangeCodeForSession(code)` with implicit-hash fallback.
- Hardcoded Supabase `hiejaayyeprfnrrukbam.supabase.co` + anon key — this is the
  **"bam" production project** from the migration note. Confirms Step 2 target.
- All redirects point back to `jd-demo.php` — must be repointed to the Vercel app.

---

## Biggest migration risks flagged

1. **`jd-trials.json` flat-file** → must move to Supabase before the brain is ported (no persistent disk on Vercel).
2. **Stub gateway has zero IP** → Step 8 is a near-full rewrite, not a tweak.
3. **`enterprise.html`** recovered but not yet served from the Vercel repo root.
4. **Hardcoded Supabase creds** in reset-password → move to env vars during port.

---

## STEP 1 DELIVERABLE — Route/behavior map (Bluehost → Vercel)

Verified against the current repo (`api/`, root `*.html`) on 2026-07-27.
Legend: [EXISTS] wired today · [STUB] present but hollow · [TODO] not built.

| Bluehost behavior (source) | Target Vercel route | State today | Migration step |
|---|---|---|---|
| `jd-demo.php` (legacy app UI) | `jd-brain.html` | [EXISTS] calls `/api/jd-brain-gateway`, logs to Supabase `messages` | Cutover in 4/10 |
| `jd-brain.php` (AI brain IP) | `POST /api/jd-brain-gateway` | [STUB] generic 1-liner, none of the IP | **Step 8** (near-full port) |
| `jd-access.php` (7-day trial, flat file) | Supabase `trials` table + gate inside gateway | [TODO] no server trial gate on Vercel | **Step 7** |
| `reset-password.php` (Supabase PKCE reset) | `signin.html` + Supabase JS (Vercel) | [EXISTS] `signin.html` present; creds move to env | **Step 6** |
| Stripe checkout (Payment Links, live) | `POST /api/create-checkout` (UNUSED) + live links | [STUB] APIs unwired; keep static | **Step 11 hold / Phase 14** |
| Stripe billing portal | `POST /api/create-portal` | [EXISTS] called by `jd-brain.html` | Verify only |
| `enterprise.html` | Vercel root `enterprise.html` | [TODO] recovered in archive, not served | Step 4/10 |

### Cutover leak to fix (exact locations in `index.html`)
- L1570: nav CTA → `https://digitaljd.org/jd-demo.php` (should point to Vercel app)
- L1974: post-signin redirect → `jd-demo.php`
- L2040: password-reset `redirectTo` → `reset-password.php`
These three outbound links are the last hard dependencies on Bluehost PHP from
the landing page. They are the concrete Step 4 route-transition targets.

### Parity conclusion
Every Bluehost behavior maps to a concrete Vercel route. Two are effectively
done (app shell, billing portal), one is a verify (signin), and the substantive
work is concentrated in **Steps 6 (auth), 7 (trials), 8 (brain IP)** plus the
**Step 4 cutover** of the three `index.html` links above. Step 1 is COMPLETE.
