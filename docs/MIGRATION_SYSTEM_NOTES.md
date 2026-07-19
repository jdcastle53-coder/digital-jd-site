# Digital JD — Migration System Notes & Index

> **Purpose:** Single entry point for the Bluehost → Vercel migration work.
> Future v0 sessions and humans should read this FIRST to find every discovery
> doc, backup/fallback point, and the current gate status.
>
> **Working rules in force:** (1) VERIFY EVERYTHING — no guessing/assuming.
> (2) Always work from the most recent PR/latest code. Stripe + tiers are FROZEN
> during migration (see the plan, Phase 14).

_Last updated: 2026-07-19_

---

## 1. Stable fallback point (created Step 1 of pre-implementation task list)

Before ANY migration change, the pre-change state was frozen as a restore point.

| Item | Value |
| --- | --- |
| Repo | `jdcastle53-coder/digital-jd-site` |
| Working branch | `v0/jdcastle53-coder-50b63f95` |
| Stable commit | `bcc0603` (docs: freeze Stripe during migration…) |
| Git tag (fallback) | `stable-pre-migration-2026-07-19` |
| Backup branch | `backup/stable-pre-migration-2026-07-19` |

### How to restore to this stable point
- Inspect: `git show stable-pre-migration-2026-07-19`
- Restore a single file: `git checkout stable-pre-migration-2026-07-19 -- <path>`
- Full rollback (new branch): `git switch -c recover backup/stable-pre-migration-2026-07-19`
- In GitHub: open the tag/branch above; both point at the stable commit.

> This tag/branch marks the **most recent PR/commit labeled STABLE** for
> possible fallback, per the task directive.

---

## 2. Discovery & planning documents (all in `docs/`)

| Doc | What it contains |
| --- | --- |
| `BLUEHOST_DISCOVERY_ANALYSIS.md` | Full functionality/dependency inventory |
| `BLUEHOST_MIGRATION_EXECUTIVE_SUMMARY.md` | Plain-language summary + open questions |
| `BLUEHOST_RETRIEVAL_CHECKLIST.md` | Every file/dir/hidden location to pull from Bluehost |
| `BLUEHOST_MIGRATION_PLAN.md` | Authoritative gated 12-step runbook (+ Phase 13 GHL, Phase 14 tiers) |
| `MIGRATION_SYSTEM_NOTES.md` | THIS file — index + fallback point + gate status |

Additional inventory docs (pre-implementation task list) are appended in
section 4 as each step is completed and confirmed.

---

## 3. Verified environment facts (do not re-guess)

- **Production Supabase project:** `hiejaayyeprfnrrukbam` (hardcoded in `auth.js`,
  `jd-demo.php`, `jd-brain.html`, `index.html`).
- **Supabase project connected to v0 chat:** `waevqqrqelloacoxywqq` — DIFFERENT
  from production; NOT referenced anywhere in production code. v0 cannot query
  production until `hiejaayyeprfnrrukbam` is connected.
- **Live Stripe:** hardcoded Payment Links + hardcoded billing-portal link.
  `api/create-checkout.js` and `api/create-portal.js` exist but are NOT wired in.
- **Live tier vocabulary:** `lite` / `core` / `pro` (gating in `jd-demo.php`).
  A different set (`essentials/pro/founding/executive`) sits in the unused
  `create-checkout.js`. Tiers are FROZEN until post-migration Phase 14.
- **Load-bearing PHP not in repo:** `jd-access.php`, `jd-brain.php`,
  `reset-password.php` (exist only on Bluehost — HIGH priority to retrieve).

---

## 4. Pre-implementation task list — progress log

Each step below is completed one at a time and only marked DONE after explicit
human confirmation.

- [x] **Step 1 — Archive/backup + label stable fallback.** Tag
  `stable-pre-migration-2026-07-19` and branch
  `backup/stable-pre-migration-2026-07-19` created at commit `bcc0603`.
  _Awaiting confirmation._
- [ ] Step 2 — Legacy PHP dependency chain
- [ ] Step 3 — Authentication & session logic
- [ ] Step 4 — Stripe & subscription logic
- [ ] Step 5 — OpenAI & related API logic
- [ ] Step 6 — Supabase & other DB schema/configs
- [ ] Step 7 — Cron jobs & scheduled processing
- [ ] Step 8 — Webhooks
- [ ] Step 9 — Environment variables & secrets
- [ ] Step 10 — Server & routing configurations
- [ ] Step 11 — Static asset repository for Bluehost-retained files
