# Chat Handoff Note — 2026-08-25

## Purpose

This chat was started as a **new v0 chat** to continue feature work on
digital-jd-site. It was NOT pre-linked to the real GitHub repo or the real
Vercel project — it began as a fresh v0 sandbox running the default Next.js
scaffold. This note documents what was done to get it working, what is and
isn't durable, and what a freshly-linked follow-up chat should do differently.

## What happened, in order

1. **Confirmed the chat started disconnected.** The sandbox's editable files
   were the default v0 Next.js scaffold (`app/`, `components/ui/button.tsx`,
   etc.), not the real digital-jd-site static HTML + Vercel-functions project.
2. **Read memory notes** (`v0_memories/user/MEMORY.md` + topic files) to
   recall the six non-negotiable working rules and prior project state
   (migration history, JD Brain UI status, welcome-letter/Stripe workstream).
3. **Verified real GitHub access independently of memory.** `gh auth status`
   confirmed the sandbox is authenticated as `jdcastle53-coder` with admin
   access to `jdcastle53-coder/digital-jd-site`. Pulled live PR/branch state
   from the GitHub API rather than trusting memory notes (which turned out to
   be stale — PR #24, merged the morning of 2026-08-25, was not yet reflected
   in memory).
4. **Closed stale PR #15** ("Rebuild JD Brain app page") as superseded by
   later merged UI reworks (#17, #21, #22), per user confirmation.
5. **Manually wired the sandbox to the real repo**, since the chat had no
   native v0 Git connection:
   - `git remote add origin https://<gh-token>@github.com/jdcastle53-coder/digital-jd-site.git`
   - `git fetch origin main` + `git checkout -B main origin/main`
   - Hit one snag: a v0 background sandbox-sync process silently reset the
     branch back to v0's own "Initial commit from v0" mid-session, wiping
     `api/` and `docs/` from the working tree. Re-ran `git checkout -f -B main
     origin/main` to recover; confirmed with a delayed re-check that the reset
     did not recur.
   - `npm install` needed a clean `node_modules` (moved the stale scaffold's
     `node_modules` out of the way) before it would install the real
     project's dependencies (`@supabase/supabase-js`, `@upstash/redis`,
     `stripe`) cleanly.
6. **Manually linked the real Vercel project via CLI**, since
   `GetOrRequestIntegration` only sees v0-marketplace-provisioned
   integrations, not raw project env vars:
   - `vercel link --yes --project prj_UJZGTulsph0MbVIngVZXBa7SNFKf`
   - `vercel env pull` (default, then `--environment=preview` and
     `--environment=production` explicitly, since `SUPABASE_URL` /
     `SUPABASE_SERVICE_ROLE_KEY` are scoped to Preview/Production only, not
     Development, so the default pull silently skipped them).
   - Confirmed the project already has real, working `SUPABASE_URL` and
     `SUPABASE_SERVICE_ROLE_KEY` values as plain Vercel env vars (not a v0
     Supabase integration) — this is why `GetOrRequestIntegration` reported
     nothing usable when asked about Supabase; it doesn't inspect raw
     project-level env vars set outside v0's own integration flow.
   - Was mid-way through validating direct Supabase REST/service-role access
     (to inspect schema for a JD Brain memory/session feature) when this
     session ended.

## Key distinction the user flagged (important for the next chat)

There are **two different kinds of "connection"**, and they were conflated
initially:

- **Manual CLI-level access** (what was set up above): real `git`
  remote + `gh` auth + `vercel link` + pulled env vars. This lets the agent
  read/write files, commit, push, open/merge PRs, and read live env vars —
  but it is session-scoped duct tape, not tracked by v0's own chat metadata,
  and can be disrupted by v0's own sandbox-sync resets (as happened in step 5).
- **Native v0 chat-level linking** (Settings → Git / Vercel project
  connection in the v0 UI): this is what makes `GetOrRequestIntegration` and
  v0's own publish/preview pipeline recognize the chat as tied to
  `digital-jd-site`. The agent has no tool to set this natively — it is a
  UI-only action. **This chat never got that native link**, which is the
  root cause of the user's "why isn't this chat connected" question.

## Recommendation for the new linked chat

1. Confirm in Settings that this new chat is natively linked to both the
   `jdcastle53-coder/digital-jd-site` GitHub repo and the real
   `digital-jd-site` Vercel project (`prj_UJZGTulsph0MbVIngVZXBa7SNFKf`)
   BEFORE doing any work, so `GetOrRequestIntegration` and v0's own tooling
   see it correctly from the start.
2. Once linked, re-verify — do not assume the link fixes everything
   automatically:
   - `git remote -v` / `git log --oneline -5` should show the real repo at
     the current `main` HEAD (compare to `gh api
     repos/jdcastle53-coder/digital-jd-site/branches/main`).
   - `vercel env ls` / a Preview-scoped `vercel env pull` should show
     `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present (still as
     plain project env vars, not a v0-managed Supabase integration).
3. Re-apply the six non-negotiable working rules from
   `v0_memories/user/MEMORY.md` — they persist automatically across chats via
   memory, but should still be treated as active from message one.
4. Pick back up the interrupted task: use the live `SUPABASE_SERVICE_ROLE_KEY`
   to inspect the actual current Supabase schema (tables, RLS policies) in
   support of the JD Brain memory/session feature work that was starting when
   this chat ended. Do not assume schema shape from memory notes — query it
   directly.
