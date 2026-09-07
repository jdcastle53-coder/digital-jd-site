-- Digital JD — Step 1 persistence
-- NOT YET APPLIED. Run this once in the Supabase SQL Editor (or via the
-- Supabase MCP if connected) to create the table api/situation-finalize.js
-- writes to. Until this table exists, situation-finalize.js will log a
-- "relation does not exist" error on every request and skip persistence,
-- but will still return caseFoundation to the client so Step 2 is not
-- blocked.
--
-- This is the ONLY remaining blocker for full Step 1 persistence. The
-- Supabase connection itself (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) is
-- already configured and already working for other endpoints in this
-- project (api/stripe-webhook.js, api/jd-brain-gateway.js) — it is this
-- specific table that has never been created.

create table if not exists public.case_foundations (
  id uuid primary key default gen_random_uuid(),
  case_id text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  original_situation text not null,
  situation_summary text default '',
  primary_issue text default '',
  desired_outcome text default '',
  stakeholders text[] default '{}',
  decision_authority text default '',
  current_impact text default '',
  actions_already_taken text[] default '{}',
  urgency text default '',
  timeframe text default '',
  constraints text[] default '{}',
  risks text[] default '{}',
  known_facts text[] default '{}',
  assumptions text[] default '{}',
  situation_category text default '',
  clarifying_questions jsonb default '[]'::jsonb,
  clarifying_answers jsonb default '[]'::jsonb
);

create index if not exists case_foundations_user_id_idx on public.case_foundations(user_id);

alter table public.case_foundations enable row level security;

-- Users may only see/manage their own case records. Server-side endpoints
-- use the service-role key (bypasses RLS) to write on the user's behalf;
-- these policies protect any future direct client-side reads.
create policy "case_foundations_select_own"
  on public.case_foundations for select
  using (auth.uid() = user_id);

create policy "case_foundations_insert_own"
  on public.case_foundations for insert
  with check (auth.uid() = user_id);

create policy "case_foundations_update_own"
  on public.case_foundations for update
  using (auth.uid() = user_id);
