-- Apply only to an isolated test database first. No accounts are granted access automatically.
begin;
create table public.jd_executive_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  valid_until timestamptz
);
create table public.jd_executive_cases (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 160),
  stage integer not null check (stage between 1 and 25),
  status text not null check (status in ('active','closed')),
  version integer not null check (version>0),
  document jsonb not null check (jsonb_typeof(document)='object' and octet_length(document::text)<=300000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,user_id)
);
create table public.jd_executive_events (
  user_id uuid not null,
  request_id uuid not null,
  case_id uuid not null,
  fingerprint text not null,
  action text not null,
  previous_case jsonb,
  saved_case jsonb not null,
  created_at timestamptz not null default now(),
  primary key(user_id,request_id),
  foreign key(case_id,user_id) references public.jd_executive_cases(id,user_id) on delete cascade
);
alter table public.jd_executive_entitlements enable row level security;
alter table public.jd_executive_cases enable row level security;
alter table public.jd_executive_events enable row level security;
create policy executive_access_own on public.jd_executive_entitlements for select to authenticated using(user_id=(select auth.uid()));
create policy executive_cases_own on public.jd_executive_cases for select to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.jd_executive_entitlements e
    where e.user_id = (select auth.uid()) and (e.valid_until is null or e.valid_until > now())
  )
);
create policy executive_events_own on public.jd_executive_events for select to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.jd_executive_entitlements e
    where e.user_id = (select auth.uid()) and (e.valid_until is null or e.valid_until > now())
  )
);
revoke all on public.jd_executive_entitlements,public.jd_executive_cases,public.jd_executive_events from anon,authenticated;
grant select on public.jd_executive_entitlements,public.jd_executive_cases,public.jd_executive_events to authenticated;
-- Only the server can submit documents validated by the workflow engine.
create function public.jd_exec_write(
  p_user_id uuid, p_case_id uuid, p_expected_version integer, p_request_id uuid,
  p_fingerprint text, p_action text, p_next jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  prior public.jd_executive_events%rowtype;
  current_case public.jd_executive_cases%rowtype;
  saved public.jd_executive_cases%rowtype;
begin
  -- Serialize writes and retries for this account, including first-time case creation.
  perform 1 from public.jd_executive_entitlements
    where user_id = p_user_id and (valid_until is null or valid_until > now())
    for update;
  if not found then
    raise exception 'access_denied';
  end if;

  select * into prior from public.jd_executive_events
    where user_id = p_user_id and request_id = p_request_id;
  if found then
    if prior.fingerprint is distinct from p_fingerprint then
      raise exception 'request_reused';
    end if;
    return prior.saved_case;
  end if;

  select * into current_case from public.jd_executive_cases
    where id = p_case_id and user_id = p_user_id;
  if p_action = 'create' then
    if p_expected_version is distinct from 0 or current_case.id is not null then
      raise exception 'version_conflict';
    end if;
    insert into public.jd_executive_cases (id, user_id, title, stage, status, version, document)
      values (p_case_id, p_user_id, p_next->>'title', (p_next->>'stage')::integer,
              p_next->>'status', 1, p_next->'document')
      on conflict (id) do nothing
      returning * into saved;
  else
    update public.jd_executive_cases
      set title = p_next->>'title', stage = (p_next->>'stage')::integer,
          status = p_next->>'status', document = p_next->'document',
          version = version + 1, updated_at = now()
      where id = p_case_id and user_id = p_user_id and version = p_expected_version
      returning * into saved;
  end if;

  if saved.id is null then
    raise exception 'version_conflict';
  end if;

  insert into public.jd_executive_events
    (user_id, request_id, case_id, fingerprint, action, previous_case, saved_case)
    values (p_user_id, p_request_id, p_case_id, p_fingerprint, p_action,
            case when current_case.id is not null then to_jsonb(current_case) end, to_jsonb(saved));
  return to_jsonb(saved);
end;
$function$;
revoke all on function public.jd_exec_write(uuid, uuid, integer, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.jd_exec_write(uuid, uuid, integer, uuid, text, text, jsonb) to service_role;
grant select, update on public.jd_executive_entitlements to service_role;
grant select, insert, update on public.jd_executive_cases to service_role;
grant select, insert on public.jd_executive_events to service_role;
commit;
