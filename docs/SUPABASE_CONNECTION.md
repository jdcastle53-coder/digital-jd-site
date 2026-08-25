# How This Project Connects to Supabase

This file exists so any future v0 chat (or engineer) working on `digital-jd-site`
can understand the current Supabase wiring without re-deriving it from scratch.
Everything below was verified directly against the actual source files, not
assumed.

## Project

- Supabase project ref: `hiejaayyeprfnrrukbam`
- Supabase URL: `https://hiejaayyeprfnrrukbam.supabase.co`
- Auth is the ONLY Supabase product in use. There are no application tables —
  all persistent app state (plan, trial status, expiry, membership) is stored
  as `user_metadata` on the `auth.users` row itself. There is no Postgres
  schema to migrate and no RLS policies to maintain.

## Two connection paths

### 1. Browser / client-side — anon key (`auth.js`)

`auth.js` (loaded on every public/app HTML page) hardcodes the Supabase URL
and **anon** key and creates a client with the standard Supabase JS SDK
(`supabase.createClient(...)`, loaded from the CDN `<script>` tag, not npm).

This is safe — the anon key is meant to be public — and is what powers:
- Sign up / sign in / sign out (`signInWithPassword`, `signUp`, `resend`)
- Reading the current session and its `user_metadata` client-side
- `requireActiveSession()`: gates access to `jd-brain.html`, resolves the
  7-day trial vs. paid Membership expiry logic, and redirects to
  `signin.html` / `expired.html` as needed

There is no `/auth/callback` route pattern here (that's a Next.js App
Router convention) — this is a plain static HTML site, so email
confirmation and OAuth links resolve directly against whichever page URL
was set in `emailRedirectTo` (see `welcome-sprint.html` and the resend flow
in `signin.html`).

### 2. Server-side / Vercel serverless functions — service role key

Three files under `api/` use the **service role** key via
`@supabase/supabase-js`'s `createClient()`, reading credentials from
`process.env.SUPABASE_URL` and `process.env.SUPABASE_SERVICE_ROLE_KEY`
(standard Vercel env vars, not hardcoded):

- **`api/stripe-webhook.js`** — on `checkout.session.completed`, uses the
  admin client to invite/create the user and stamp
  `user_metadata.membership = true` + `plan` from the paid tier. Account
  creation for paid Membership signups happens ONLY here, after Stripe
  payment clears (never before).
- **`api/jd-brain-gateway.js`** — the OpenAI-backed chat gateway for the app.
  Uses the admin client for any server-side user lookups it needs.
- **`api/_lib/gateway-security.js`** — shared auth/rate-limit middleware for
  the gateway. Verifies the caller's bearer token via
  `supabase.auth.getUser(token)` (server-side JWT verification, admin
  client), then reads `user_metadata.plan` / `trial` / `expires_at` from the
  verified user to enforce the trial/tier gate. Rate limiting itself is
  separate (Upstash Redis), not Supabase.

All three fail closed on missing/invalid credentials or an invalid token —
they do not silently allow access if `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` aren't set.

## Where the env vars come from

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set as standard Vercel
  project environment variables (Production/Preview/Development), consumed
  via `process.env` in the `api/` serverless functions. They are **not**
  used anywhere in client-side code.
- The anon key + URL in `auth.js` are hardcoded directly in the file (they
  are public-safe by design, so this is intentional, not a leftover).

## Known gaps / things to check before assuming something is broken

- In some v0 sandbox sessions this session, `SUPABASE_URL` /
  `SUPABASE_SERVICE_ROLE_KEY` have been listed as "available" project env
  vars but not actually populated into `process.env` when run via plain
  `node`/Bash in the VM (unlike `STRIPE_SECRET_KEY`, which loads fine the
  same way). This looks like a sandbox-sync quirk specific to this project,
  not a real missing-credential issue in production — the deployed Vercel
  functions read them normally. Don't assume the integration is broken
  just because a sandbox Bash check comes back empty; verify against the
  live site/API before concluding anything is misconfigured.
- There is no Supabase MCP connected to this project as of this writing —
  schema/user lookups from a v0 chat have to go through either the anon-key
  REST API (`/auth/v1/signup`, `/auth/v1/admin/users` with the service role
  key) directly, or through the live site's own UI/API endpoints.

## Related docs in this repo

- `docs/BLUEHOST_MIGRATION_PLAN.md` — full migration history, including why
  Supabase Auth was kept as-is when moving off Bluehost.
