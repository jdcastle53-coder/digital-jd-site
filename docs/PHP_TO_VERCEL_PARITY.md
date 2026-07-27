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

`enterprise.html` was NOT provided and is not in the repo — still outstanding.

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
3. **`enterprise.html` still missing.**
4. **Hardcoded Supabase creds** in reset-password → move to env vars during port.
