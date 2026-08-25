-- Memory Features Migration
-- Digital JD / JD Brain — cross-session long-term memory (Feature 2)
--
-- SAFE TO RUN MULTIPLE TIMES (idempotent). Run this once in the Supabase
-- SQL editor (Dashboard > SQL Editor > New query > paste > Run).
--
-- What this creates:
--   - user_memory_facts: durable, short facts about a user, extracted from
--     past conversations, that JD Brain can recall in brand-new sessions.
--   - Row Level Security so a signed-in user can only ever read their own
--     facts. Only the server (service-role key, which bypasses RLS by
--     design) is able to insert/update/delete rows — there is deliberately
--     no insert/update/delete policy for regular users.
--
-- This does NOT touch the existing `conversations` or `messages` tables.

create table if not exists user_memory_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fact text not null,
  category text,
  source_conversation_id uuid references conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  status text not null default 'active'
);

create index if not exists idx_user_memory_facts_user
  on user_memory_facts (user_id, status, created_at desc);

alter table user_memory_facts enable row level security;

-- create policy has no "IF NOT EXISTS", so guard it with a DO block instead.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_memory_facts'
      and policyname = 'user_memory_facts_select_own'
  ) then
    create policy user_memory_facts_select_own
      on user_memory_facts
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

-- Verification query (run manually after migration to confirm the table
-- exists with the expected shape):
--   select column_name, data_type
--   from information_schema.columns
--   where table_name = 'user_memory_facts'
--   order by ordinal_position;
