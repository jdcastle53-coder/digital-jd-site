# Step 5 — Initial Supabase Logging Plan

Status: Step 5 deliverable (DESIGN portion). Grounded in the real structured
logger already present in `api/jd-brain-gateway.js`. The LIVE table-verification
portion is DEFERRED until the v0 sandbox env re-syncs to BAM (Step 2 pending
item) — flagged clearly below, not assumed.

---

## What already exists (verified in code)
`api/jd-brain-gateway.js` already implements a dual-write structured logger:
- Writes to `console.log("[...]", json)` AND inserts a row into a Supabase table.
- Current insert target in code: **`application_logs`**.
- Fields per entry: `level, action, request_id, timestamp, component, message,
  context, duration_ms, user_id`.
- Lifecycle actions: `request_received` → `openai_request_started` → … →
  `request_completed` (with `duration_ms`).
- DB-write failures are swallowed (logged to console, never thrown) so logging
  can't take down a request.

## Core events to guarantee are logged (Step 5 baseline)
1. **Auth**: sign-in success/failure, password reset requested (Step 6).
2. **Access/trial**: trial started, trial expired, tier gate allowed/blocked (Step 7).
3. **AI brain**: request_received, model call start/end, completed/failed (Step 8).
Baseline = these three families reliably land in the prod (BAM) project.

## Proposed canonical table (to confirm against BAM)
`application_logs` (matches existing code) with columns:
`id (uuid/bigint pk), created_at (timestamptz default now()), level text,
action text, component text, request_id text, user_id uuid null,
message text, context jsonb, duration_ms int null`.
Index on `created_at`, `action`, `user_id`.

## DEFERRED — live verification (needs BAM read; blocked on sandbox resync)
- [ ] Confirm whether `application_logs` ALREADY exists in BAM (created by the
      running gateway) or must be created.
- [ ] Resolve `application_logs` (gateway code) vs `messages` (referenced by
      `jd-brain.html` + earlier plan notes). Determine if BOTH exist and what
      each is for. Standardize on one for logs. DO NOT assume.
- [ ] Snapshot the real BAM schema (all tables + columns) and record it here.
- [ ] Confirm auth users table + any existing trial/subscription tables.

## Verify (Step 5 gate) — partial
- [x] Logging design defined from real code (events, table shape, failure mode).
- [ ] Live: core events confirmed landing in BAM (BLOCKED on sandbox resync).
This step is DESIGN-COMPLETE but not LIVE-VERIFIED. Do not mark fully done until
the BAM read is possible and the table discrepancy is resolved.
