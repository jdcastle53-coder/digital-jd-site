# Step 4 — Route-Transition Map (Bluehost → Vercel)

Status: Step 4 deliverable. Verified 2026-07-27 by grepping every `*.html` in
the repo for links, redirects, and outbound URLs. Goal: move every user-facing
route onto Vercel WITHOUT breaking live users, and list the exact edits.

Legend: [OK] already Vercel-native · [FIX] must change · [DEAD] broken placeholder

---

## A. The hard Bluehost dependencies (MUST fix at cutover)

These are the only links still pointing at Bluehost PHP. They are the core of
the cutover.

| File:line | Current target | Change to | Notes |
|---|---|---|---|
| `index.html:1570` | `https://digitaljd.org/jd-demo.php` (nav "Start" CTA) | `/jd-brain.html` | Vercel-native app |
| `index.html:1974` | `https://digitaljd.org/jd-demo.php` (post-signin JS redirect) | `/jd-brain.html` | match signin.html which already uses jd-brain.html |
| `index.html:2040` | `https://digitaljd.org/reset-password.php` (Supabase `redirectTo`) | `/signin.html` (or dedicated reset page) | depends on Step 6 auth port |

## B. Broken / placeholder links found (fix opportunistically)

Not Bluehost, but they are live-visible breakage worth fixing during cutover.

| File:line | Problem | Fix |
|---|---|---|
| `digitaljd-vs-ai.html:33` | `https://buy.stripe.com/YOUR_STARTER_LINK` (dead placeholder) | real checkout / `startCheckout` — coordinate w/ Phase 14 Stripe |
| `digitaljd-vs-ai.html:120-121` | Terms/Privacy `href="#"` | `/terms.html`, `/privacy.html` |
| `digitaljd-vs-ai.html:122` | `mailto:hello@your-domain.com` | `support@digitaljd.org` (per contact.html) |
| `expired.html:36` | `mailto:hello@your-domain.com` | `support@digitaljd.org` |
| `enterprise.html` (archived, not in repo root) | missing from deploy | restore to repo root during this step |

## C. Already Vercel-native (no change)

- `signin.html` → redirects to `jd-brain.html` [OK]
- `jd-brain.html`, `demo.html` → call `/api/jd-brain-gateway`, `/api/create-portal` [OK]
- Internal nav/anchors (`/`, `#pricing`, `/contact.html`, `/privacy.html`,
  `/terms.html`, `success.html`, `cancel.html`) [OK]

## D. Discrepancy flagged (NOT changed here — Phase 14 / Stripe)

- `index.html` checkout calls `startCheckout('essentials'|'pro'|'executive')`,
  but the migration notes say live gating uses `lite|core|pro`. The tier
  vocabulary is inconsistent in the codebase. Do NOT touch during migration
  (Step 11 = Stripe stays static). Resolve in Phase 14 with Pricing Model C.

## E. Safe cutover strategy (no broken links for live users)

1. Do NOT edit these links until the Vercel targets are proven working
   (Steps 6/7/8 complete + `enterprise.html` restored).
2. Keep Bluehost PHP files in place during the transition so old
   bookmarks/links keep working until DNS/final cutover (Step 12).
3. Change the three §A links in ONE commit at cutover, then verify each in the
   browser before merging.
4. Restore `enterprise.html` to the repo root early (it is presentation-only,
   zero backend risk) so `index.html`/`contact.html` references resolve.

## Verify (Step 4 gate)
- [x] Every outbound/user-facing link inventoried across all `*.html`.
- [x] Bluehost PHP dependencies isolated to 3 links in `index.html`.
- [x] Broken placeholders catalogued.
- [x] Cutover ordering defined so live users never hit a dead link.
- Actual link EDITS happen at cutover (post Steps 6/7/8), not now.
