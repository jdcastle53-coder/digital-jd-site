# Working on Digital JD

These instructions apply throughout this repository. Follow the user's current
request and keep changes focused on the requested outcome.

## Start with evidence

- Confirm the repository, current branch, and working tree before editing. Preserve
  the user's uncommitted work; never reset or overwrite it to get a clean checkout.
- Read the actual page, API handler, callers, and relevant documentation before
  proposing a change. Trace a feature from the browser through its API and data.
- Treat dated handoffs and migration checklists as historical context. Several
  describe an obsolete gateway stub, missing webhook, or old pricing. Current code
  establishes implemented behavior; the user's decisions establish intended behavior.
  Neither local code nor old notes prove what is currently deployed.
- Do not assume this session has GitHub, Vercel, Supabase, or Stripe access because
  a previous session did. Verify capabilities without printing credentials.
- Unavailable v0 memory files are not instructions you can reconstruct by guessing.
  Record material unknowns and continue independent work where possible.

## Repository map

- Root `*.html`: standalone marketing, auth, checkout, and application pages, with
  inline CSS and JavaScript. `index.html` is the public home page.
- `auth.js`: shared browser auth IIFE exposing `window.Auth`.
- `jd-brain.html` / `demo.html`: authenticated JD Brain and public demo clients.
- `risk-assessment.html`, `executive-dashboard.html`, `org-admin.html`: assessment
  and organization workflows.
- `api/`: Vercel JavaScript functions for AI, billing, dashboards, administration,
  and reconciliation. Shared server logic belongs in `api/_lib/` when reused.
- `data/jd-knowledge-base.json`: authored leadership knowledge used by the gateway.
  The DOCX in `data/` is reference material, not an application entry point.
- `sql/`: versioned database migrations; not proof of the live database schema.
- `images/`, root logo, `design-mockups/`, and root screenshots: assets and visual
  references. Check actual HTML references before renaming or deleting any image.
- `docs/`: design, migration, logging, and handoff context.
  `docs/bluehost-archive/` is a historical reference; leave it unchanged unless
  the task explicitly requires archive maintenance.

## Keep the existing architecture

- Use static HTML, CSS, and vanilla JavaScript. Do not introduce React, Next.js,
  TypeScript, a bundler, or a framework migration for a routine feature or fix.
- Match the surrounding file's formatting and conventions. Avoid whole-file
  rewrites, mass formatting, or unrelated dependency upgrades.
- Preserve existing `.html` routes, anchors, DOM hooks, `window.Auth` methods,
  request fields, and response fields used by callers. Update both sides together
  when a contract must change.
- API files use ES modules. Most use `export default handler(req, res)`, but
  `stripe-webhook.js` and `checkout-status.js` use named Web Request/Response
  exports. Preserve each route's working interface; do not homogenize them casually.
- Keep `package-lock.json` consistent when dependencies change. Node's declared
  minimum is `>=18`; check actual deployment compatibility before using newer APIs.
- Vercel must bundle the gateway's `data/**` dependency through `vercel.json`.
  Preserve function time limits and background work lifecycle when changing AI flows.

## Frontend and design

- Follow the edited page's existing visual language. Primary marketing pages use
  dark navy and gold with Cormorant Garamond / Barlow typography. Some utility
  pages use Tailwind CDN or other fonts; do not restyle all pages incidentally.
- Shared navigation and footers are duplicated across pages. Check related pages
  when changing a common link or label; do not assume a shared layout exists.
- Keep desktop and mobile layouts usable: no horizontal overflow, clipped calls
  to action, inaccessible modals, or hidden form errors.
- Use semantic controls, associated labels, visible keyboard focus, useful alt
  text, and accessible loading/error states for changed interactions.
- Treat model output and user content as untrusted. Escape text or sanitize markup
  before inserting it as HTML; do not introduce unsafe `innerHTML` interpolation.
- Use existing brand assets where appropriate. Keep temporary screenshots and
  mockups out of the commit unless they are intentional deliverables.

## Authentication and user data

- Keep service-role credentials and provider secrets server-side in `process.env`.
  Browser Supabase anon configuration is public by design; it is never a substitute
  for authorization. Do not add private keys to HTML, docs, screenshots, or logs.
- Verify protected requests server-side with Supabase. Do not trust a client-sent
  email, user ID, organization ID, plan, or editable user metadata as sufficient
  authority for privileged operations. Existing code patterns may need hardening;
  they are not automatic evidence that a pattern is secure.
- Scope service-role queries explicitly to the authenticated user and authorized
  organization. Check conversation ownership before reading messages and check
  organization/department membership and authority before modifying members.
- Preserve the seven-day Pro-level trial policy and paid-member access when
  editing auth. An upgraded member may retain an old trial expiry; do not send
  paying users to `expired.html` because of that stale value.
- Auth and entitlement enforcement must fail closed when they cannot be verified.
  Keep the existing distinction between authorization failures and optional
  research, memory, logging, or rate-limit infrastructure degradation.
- Before changing queries, verify column names, relationships, and RLS from
  available schema evidence. State when live schema inspection is unavailable.
  Put schema changes in `sql/`, with ownership/RLS rules and verification steps.
- Vercel has no durable local application storage. Store persistent user state in
  the database, not JSON files written by a function.

## Billing and onboarding

- Trace pricing changes through `index.html`, `api/create-checkout.js`, webhook
  metadata, access gates, and success/welcome pages. Preserve monthly/yearly plan
  mapping and the sales-led Enterprise flow. Do not revive historical plan names
  from migration notes or change prices as part of unrelated work.
- Preserve the Stripe key lookup: `STRIPE_ACCESS_TOKEN` with
  `STRIPE_SECRET_KEY` fallback, unless intentionally migrating configuration.
- Verify webhook signatures against the exact raw request body. Preserve retry
  safety and check payment settlement before granting paid access; event names
  alone do not establish that delayed payments have settled.
- Membership account creation follows verified payment. Preserve the distinction
  between inviting a new customer and upgrading an existing account, including
  `membership`, `trial`, `plan`, and billing metadata.
- Exercise billing with mocks or isolated test-mode resources. Do not make real
  purchases, invite real customers, or alter live subscriptions just to test code.
- Keep `success.html` status responses free of customer email addresses. Preserve
  protected reconciliation and its `reconcile_completed` heartbeat.

## JD Brain behavior

- Preserve Dr. Castle's authored voice, reasoning rules, and knowledge-base content.
  Do not invent interview material or silently rewrite `jd_*` interpretations.
- Preserve clarify/advisory/document modes and the headings consumed by the UI:
  `SITUATIONAL ANALYSIS`, `JD INSIGHT`, `EXECUTION PLAN`, and `EXECUTIVE DRAFT`
  where applicable. Check actual parsing before changing output formatting.
- Keep knowledge-base loading server-side; do not add a browser download or API
  response exposing the entire knowledge base.
- Bound conversation history, memory, research latency, and generation cost.
  Preserve ownership checks and graceful handling of optional enrichment failures.
- Keep model settings centralized. Change models or prompt contracts only when
  relevant to the task, with representative behavior checks.

## Errors and observability

- Validate methods, input shapes, and authorization before side effects. Return
  useful HTTP status codes and generic server errors without internal traces.
- Reuse structured lifecycle logs with component, action, request ID, timestamp,
  status, and duration where appropriate. Operational logs belong in
  `application_logs`; conversation content belongs in `messages`.
- Check Supabase's returned `{ error }` as well as thrown exceptions. Logging
  failures must not crash an otherwise valid request.
- Do not log tokens, keys, passwords, full prompts, memory facts, or raw customer
  emails. Use IDs, counts, or redacted identifiers when diagnosing failures.

## GitHub repository and install command

- Repository: https://github.com/jdcastle53-coder/digital-jd-site
- Git remote: `origin`, https://github.com/jdcastle53-coder/digital-jd-site.git
- Local checkout: `C:\AI\DigitalJD\digital-jd-site`.
- Delivery branch: `main`. Intended production host: Vercel; verify the actual
  Git integration and deployment result rather than assuming a push went live.
- When the user issues **Install the website** as an instruction (case-insensitive),
  that is explicit authorization to validate, commit, and push the project's
  intended pending changes to `origin/main`, including merging a prepared feature
  branch when needed. Do not ask for redundant confirmation. Merely quoting or
  discussing the command, including editing these rules, does not invoke it.
- Before pushing, inspect the complete diff, run appropriate checks, exclude
  secrets and unrelated files, and verify the remote and branch. Include intended
  project changes and AGENTS.md; do not blindly stage every file in the workspace.
- Fetch the latest remote state before delivery. Preserve other work and integrate
  remote updates without force pushing, deleting branches, or discarding changes.
  If a conflict requires a product decision, explain the concrete conflict.
- This command authorizes the Git delivery that can trigger the connected hosting
  pipeline. It does not authorize live database migrations, credential changes,
  charges, or unrelated external actions.
- If credentials, network access, branch protection, or required checks prevent
  delivery, report the exact blocker. Never claim success without a successful
  push; report the commit and deployment status separately. If hosting access is
  unavailable, say the push succeeded but deployment is unverified.
- Ordinary edit requests remain local unless the user otherwise authorizes delivery.

## Verification and delivery

- There is currently no configured build, lint, or test script. Do not claim
  `npm test` or `npm run build` passed. Choose checks appropriate to the change.
- `npm ci` installs locked dependencies. The only npm script is `dev`; it invokes
  `vercel dev` using POSIX environment syntax and assumes a Vercel CLI is available.
  On Windows, use an installed CLI with shell-appropriate environment handling;
  never print or embed a token to work around the script.
- A plain static server can check layout but cannot validate `/api/*`, Stripe,
  or Supabase flows. Use Vercel's runtime or isolated handler tests for those.
- For UI changes, inspect affected pages at mobile and desktop sizes and exercise
  links, forms, keyboard behavior, and relevant loading/error paths.
- For billing, authorization, data isolation, or calculations, add/run focused
  regression checks covering success and failure cases. Dashboard checks must
  preserve latest-completed-assessment selection and risk inversion:
  `(5 - averageScore) / 4 * 100`; missing data must not appear as zero risk.
- For documentation-only changes, inspect the diff and verify referenced paths
  and commands. Do not add tests that simply mirror prose or implementation.
- Use a focused feature branch for code delivery; preserve user work when switching.
  Review `git diff --check` and the final diff. Do not invent co-author identities
  or append the old v0 trailer to work performed by another tool.
- Vercel is the intended full application host. `.github/workflows/pages.yml`
  also publishes on pushes to `main`; GitHub Pages does not execute these APIs.
  `package-site.sh` is a legacy static archive helper, not a full Vercel deployment.
- Do not push, merge, publish, or apply live migrations merely because local edits
  were requested. Follow the user's authorization for external changes and verify
  the target project/environment. Never claim local edits are deployed.
- Update relevant docs when behavior changes; mark completed migration gates only
  with supporting evidence. Finish with what changed, what was verified, and any
  concrete limitations that remain.
