-- Apply once to the selected Supabase project. No credentials belong in this file.
create table public.records (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  version integer not null default 1 check (version > 0),
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index records_owner_idx on public.records(owner_id, id);
alter table public.records enable row level security;
create policy records_read_own on public.records for select to authenticated using ((select auth.uid()) = owner_id);
-- Client writes are available only through the validated, version-checked RPC below.
revoke all on public.records from anon, authenticated;
grant select on public.records to authenticated;

create table public.record_operations (
  owner_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, operation_id)
);
alter table public.record_operations enable row level security;
revoke all on public.record_operations from anon, authenticated;

create or replace function public.validate_record_data(p_data jsonb) returns boolean
language plpgsql immutable set search_path = public, pg_temp as $$
declare t text; item jsonb; d date; tm time; exception_key text;
begin
  if jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 60000 then return false; end if;
  t := p_data->>'type';
  if t is null or t not in ('task','reminder','note','expense','event') then return false; end if;
  if not p_data ?& array['title','body','date','start','end','allDay','location','amountCents','category','tags','pinned','excluded','completed','completedDates','recurrence','reminderAt','exceptions'] then return false; end if;
  if exists(select 1 from jsonb_object_keys(p_data) k where k not in ('type','title','body','date','start','end','allDay','location','amountCents','category','tags','pinned','excluded','completed','completedDates','recurrence','reminderAt','exceptions')) then return false; end if;
  foreach t in array array['title','body','date','start','end','location','category','recurrence','reminderAt'] loop
    if jsonb_typeof(p_data->t) <> 'string' then return false; end if;
  end loop;
  t := p_data->>'type';
  if length(p_data->>'title') > 160 or length(p_data->>'body') > 20000 or length(p_data->>'location') > 200 or length(p_data->>'category') > 60 then return false; end if;
  if length(trim(p_data->>'category')) = 0 then return false; end if;
  if t not in ('note','expense') and length(trim(p_data->>'title')) = 0 then return false; end if;
  if t = 'note' and length(trim((p_data->>'title') || (p_data->>'body'))) = 0 then return false; end if;
  if (p_data->>'date') <> '' then
    if p_data->>'date' !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
    d := (p_data->>'date')::date;
    if to_char(d, 'YYYY-MM-DD') <> p_data->>'date' then return false; end if;
  elsif t in ('expense','event','reminder') then return false;
  end if;
  foreach t in array array['start','end'] loop
    if p_data->>t <> '' then
      if p_data->>t !~ '^([01]\d|2[0-3]):[0-5]\d$' then return false; end if;
      tm := (p_data->>t)::time;
    end if;
  end loop;
  foreach t in array array['allDay','pinned','excluded','completed'] loop
    if jsonb_typeof(p_data->t) <> 'boolean' then return false; end if;
  end loop;
  t := p_data->>'type';
  if t = 'reminder' and p_data->>'start' = '' then return false; end if;
  if t = 'event' and not (p_data->>'allDay')::boolean and (p_data->>'start' = '' or p_data->>'end' = '' or p_data->>'end' <= p_data->>'start') then return false; end if;
  if t = 'expense' then
    if jsonb_typeof(p_data->'amountCents') <> 'number' or (p_data->>'amountCents')::numeric <= 0 or (p_data->>'amountCents')::numeric > 99999999999 or trunc((p_data->>'amountCents')::numeric) <> (p_data->>'amountCents')::numeric then return false; end if;
  elsif jsonb_typeof(p_data->'amountCents') <> 'null' then return false;
  end if;
  if jsonb_typeof(p_data->'tags') <> 'array' or jsonb_array_length(p_data->'tags') > 8 or jsonb_typeof(p_data->'completedDates') <> 'array' or jsonb_array_length(p_data->'completedDates') > 10000 or jsonb_typeof(p_data->'exceptions') <> 'object' then return false; end if;
  for item in select value from jsonb_array_elements(p_data->'tags') loop
    if jsonb_typeof(item) <> 'string' or length(trim(item #>> '{}')) not between 1 and 40 then return false; end if;
  end loop;
  for item in select value from jsonb_array_elements(p_data->'completedDates') loop
    if jsonb_typeof(item) <> 'string' or (item #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
    d := (item #>> '{}')::date;
  end loop;
  if p_data->>'recurrence' not in ('none','daily','weekly','monthly') then return false; end if;
  if p_data->>'recurrence' <> 'none' and (t not in ('task','reminder','event') or p_data->>'date' = '') then return false; end if;
  if p_data->>'reminderAt' <> '' then
    if p_data->>'reminderAt' !~ '^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$' then return false; end if;
    d := substring(p_data->>'reminderAt',1,10)::date;
  end if;
  for exception_key,item in select key,value from jsonb_each(p_data->'exceptions') loop
    if exception_key !~ '^\d{4}-\d{2}-\d{2}$' or jsonb_typeof(item) <> 'object' then return false; end if;
    d := exception_key::date;
    if exists(select 1 from jsonb_object_keys(item) k where k not in ('cancelled','changes')) then return false; end if;
    if item ? 'cancelled' and jsonb_typeof(item->'cancelled') <> 'boolean' then return false; end if;
    if item ? 'changes' then
      if jsonb_typeof(item->'changes') <> 'object' or exists(select 1 from jsonb_object_keys(item->'changes') k where k not in ('title','body','start','end','allDay','location')) then return false; end if;
      if not public.validate_record_data(p_data || (item->'changes') || jsonb_build_object('exceptions','{}'::jsonb)) then return false; end if;
    end if;
  end loop;
  return true;
exception when others then return false;
end $$;

create or replace function public.apply_record_change(
  p_operation_id uuid, p_record_id uuid, p_expected_version integer, p_data jsonb, p_deleted boolean default false
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare actor uuid := auth.uid(); existing public.records; result jsonb; prior jsonb;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if not public.validate_record_data(p_data) or p_expected_version < 0 then raise exception 'Invalid record fields'; end if;
  -- Operation lock protects idempotency even if a malicious client reuses an ID for another record.
  perform pg_advisory_xact_lock(hashtextextended(actor::text || p_operation_id::text, 0));
  select o.result into prior from public.record_operations o where o.owner_id = actor and o.operation_id = p_operation_id;
  if prior is not null then return prior; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_record_id::text, 1));
  select * into existing from public.records where id = p_record_id and owner_id = actor for update;
  if existing.id is null then
    if p_expected_version <> 0 or exists(select 1 from public.records where id = p_record_id) then
      result := jsonb_build_object('status','conflict','record',null);
    else
      insert into public.records(id,owner_id,data,deleted) values(p_record_id,actor,p_data,p_deleted) returning * into existing;
      result := jsonb_build_object('status','applied','record',to_jsonb(existing));
    end if;
  elsif existing.version <> p_expected_version then
    result := jsonb_build_object('status','conflict','record',to_jsonb(existing));
  else
    update public.records set data=p_data,deleted=p_deleted,version=version+1,updated_at=clock_timestamp() where id=p_record_id and owner_id=actor returning * into existing;
    result := jsonb_build_object('status','applied','record',to_jsonb(existing));
  end if;
  insert into public.record_operations(owner_id,operation_id,result) values(actor,p_operation_id,result);
  return result;
end $$;
revoke all on function public.apply_record_change(uuid,uuid,integer,jsonb,boolean) from public, anon;
grant execute on function public.apply_record_change(uuid,uuid,integer,jsonb,boolean) to authenticated;

create table public.finn_requests (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default clock_timestamp(), reserved_tokens integer not null,
  finished boolean not null default false
);
create index finn_requests_time_idx on public.finn_requests(created_at);
alter table public.finn_requests enable row level security;
revoke all on public.finn_requests from anon, authenticated;

create table public.finn_proposals (
  id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
  action jsonb not null, expires_at timestamptz not null, applied_record_id uuid,
  created_at timestamptz not null default now()
);
alter table public.finn_proposals enable row level security;
revoke all on public.finn_proposals from anon, authenticated;

create or replace function public.reserve_finn_request(p_user uuid,p_tokens integer,p_user_limit integer,p_shared_limit integer,p_minute_limit integer)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare request_id uuid; day_start timestamptz := date_trunc('day',now() at time zone 'Asia/Manila') at time zone 'Asia/Manila';
begin
  if auth.role() <> 'service_role' then raise exception 'Server only'; end if;
  perform pg_advisory_xact_lock(7151206);
  if p_tokens < 1 or p_tokens > 5500 then return null; end if;
  if (select count(*) from public.finn_requests where owner_id=p_user and created_at>=day_start) >= least(p_user_limit,10) then return null; end if;
  if (select count(*) from public.finn_requests where created_at>=day_start) >= least(p_shared_limit,80) then return null; end if;
  if (select coalesce(sum(reserved_tokens),0) from public.finn_requests where created_at>=day_start) + p_tokens > 150000 then return null; end if;
  if (select count(*) from public.finn_requests where created_at>clock_timestamp()-interval '1 minute') >= least(p_minute_limit,2) then return null; end if;
  if (select coalesce(sum(reserved_tokens),0) from public.finn_requests where created_at>clock_timestamp()-interval '1 minute') + p_tokens > 6000 then return null; end if;
  if exists(select 1 from public.finn_requests where not finished and created_at>clock_timestamp()-interval '1 minute') then return null; end if;
  insert into public.finn_requests(owner_id,reserved_tokens) values(p_user,p_tokens) returning id into request_id;
  return request_id;
end $$;
revoke all on function public.reserve_finn_request(uuid,integer,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_finn_request(uuid,integer,integer,integer,integer) to service_role;

create table public.push_subscriptions (
  endpoint text primary key, owner_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null, created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy push_own on public.push_subscriptions for all to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
revoke all on public.push_subscriptions from anon;
grant select,insert,update,delete on public.push_subscriptions to authenticated;
grant select,insert,update,delete on public.records, public.record_operations, public.finn_requests, public.finn_proposals, public.push_subscriptions to service_role;
-- Realtime is optional: reconnect and polling always reconcile authoritative stored rows.
-- If desired, enable records in Dashboard > Database > Publications > supabase_realtime.
