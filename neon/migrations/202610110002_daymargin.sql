-- Daymargin's Neon schema. Apply through npm run db:migrate after enabling Neon Auth.
-- No browser receives a database credential. API requests switch to daymargin_app
-- with a verified owner ID in a transaction; policies protect every owned table.
create schema daymargin;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='daymargin_app') then
    create role daymargin_app nologin nosuperuser nobypassrls;
  end if;
  execute format('grant daymargin_app to %I', current_user);
end $$;
grant usage on schema daymargin to daymargin_app;
create table daymargin.records (
  id uuid primary key,
  owner_id uuid not null references neon_auth."user"(id) on delete cascade,
  data jsonb not null,
  version integer not null default 1 check(version>0),
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index records_owner_idx on daymargin.records(owner_id,id);
create table daymargin.record_operations (
  owner_id uuid not null references neon_auth."user"(id) on delete cascade,
  operation_id uuid not null, result jsonb not null,
  created_at timestamptz not null default now(), primary key(owner_id,operation_id)
);
create table daymargin.finn_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references neon_auth."user"(id) on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  reserved_tokens integer not null, finished boolean not null default false
);
create index finn_requests_time_idx on daymargin.finn_requests(created_at);
create table daymargin.finn_proposals (
  id uuid primary key, owner_id uuid not null references neon_auth."user"(id) on delete cascade,
  action jsonb not null, expires_at timestamptz not null, applied_record_id uuid,
  created_at timestamptz not null default now()
);
create table daymargin.push_subscriptions (
  endpoint text primary key, owner_id uuid not null references neon_auth."user"(id) on delete cascade,
  subscription jsonb not null, created_at timestamptz not null default now()
);
alter table daymargin.records enable row level security;
alter table daymargin.record_operations enable row level security;
alter table daymargin.finn_requests enable row level security;
alter table daymargin.finn_proposals enable row level security;
alter table daymargin.push_subscriptions enable row level security;
create policy records_own on daymargin.records for select to daymargin_app
  using(owner_id=nullif(current_setting('daymargin.user_id',true),'')::uuid);
create policy operations_own on daymargin.record_operations for select to daymargin_app
  using(owner_id=nullif(current_setting('daymargin.user_id',true),'')::uuid);
create policy proposals_own on daymargin.finn_proposals for all to daymargin_app
  using(owner_id=nullif(current_setting('daymargin.user_id',true),'')::uuid)
  with check(owner_id=nullif(current_setting('daymargin.user_id',true),'')::uuid);
create policy subscriptions_own on daymargin.push_subscriptions for all to daymargin_app
  using(owner_id=nullif(current_setting('daymargin.user_id',true),'')::uuid)
  with check(owner_id=nullif(current_setting('daymargin.user_id',true),'')::uuid);
grant select on daymargin.records,daymargin.record_operations to daymargin_app;
grant select,insert,update,delete on daymargin.finn_proposals,daymargin.push_subscriptions to daymargin_app;
create or replace function daymargin.validate_record_data(p_data jsonb) returns boolean
language plpgsql immutable set search_path = daymargin, pg_temp as $$
declare t text; item jsonb; d date; tm time; exception_key text;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 60000 then return false; end if;
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
      if not daymargin.validate_record_data(p_data || (item->'changes') || jsonb_build_object('exceptions','{}'::jsonb)) then return false; end if;
    end if;
  end loop;
  return true;
exception when others then return false;
end $$;

create or replace function daymargin.apply_record_change(
  p_operation_id uuid, p_record_id uuid, p_expected_version integer, p_data jsonb, p_deleted boolean default false
) returns jsonb language plpgsql security definer set search_path = daymargin, pg_temp as $$
declare actor uuid := nullif(current_setting('daymargin.user_id',true),'')::uuid; existing daymargin.records; result jsonb; prior jsonb;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if not daymargin.validate_record_data(p_data) or p_expected_version is null or p_expected_version < 0 or p_operation_id is null or p_record_id is null or p_deleted is null then raise exception 'Invalid record fields'; end if;
  -- Operation lock protects idempotency even if a malicious client reuses an ID for another record.
  perform pg_advisory_xact_lock(hashtextextended(actor::text || p_operation_id::text, 0));
  select o.result into prior from daymargin.record_operations o where o.owner_id = actor and o.operation_id = p_operation_id;
  if prior is not null then return prior; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_record_id::text, 1));
  select * into existing from daymargin.records where id = p_record_id and owner_id = actor for update;
  if existing.id is null then
    if p_expected_version <> 0 or exists(select 1 from daymargin.records where id = p_record_id) then
      result := jsonb_build_object('status','conflict','record',null);
    else
      insert into daymargin.records(id,owner_id,data,deleted) values(p_record_id,actor,p_data,p_deleted) returning * into existing;
      result := jsonb_build_object('status','applied','record',to_jsonb(existing));
    end if;
  elsif existing.version <> p_expected_version then
    result := jsonb_build_object('status','conflict','record',to_jsonb(existing));
  else
    update daymargin.records set data=p_data,deleted=p_deleted,version=version+1,updated_at=clock_timestamp() where id=p_record_id and owner_id=actor returning * into existing;
    result := jsonb_build_object('status','applied','record',to_jsonb(existing));
  end if;
  insert into daymargin.record_operations(owner_id,operation_id,result) values(actor,p_operation_id,result);
  return result;
end $$;
create or replace function daymargin.reserve_finn_request(p_user uuid,p_tokens integer,p_user_limit integer,p_shared_limit integer,p_minute_limit integer)
returns uuid language plpgsql security definer set search_path = daymargin, pg_temp as $$
declare request_id uuid; day_start timestamptz := date_trunc('day',now() at time zone 'Asia/Manila') at time zone 'Asia/Manila';
begin

  perform pg_advisory_xact_lock(7151206);
  if p_tokens is null or p_user is null or p_user_limit is null or p_shared_limit is null or p_minute_limit is null or p_tokens < 1 or p_tokens > 5500 then return null; end if;
  if (select count(*) from daymargin.finn_requests where owner_id=p_user and created_at>=day_start) >= least(p_user_limit,10) then return null; end if;
  if (select count(*) from daymargin.finn_requests where created_at>=day_start) >= least(p_shared_limit,80) then return null; end if;
  if (select coalesce(sum(reserved_tokens),0) from daymargin.finn_requests where created_at>=day_start) + p_tokens > 150000 then return null; end if;
  if (select count(*) from daymargin.finn_requests where created_at>clock_timestamp()-interval '1 minute') >= least(p_minute_limit,2) then return null; end if;
  if (select coalesce(sum(reserved_tokens),0) from daymargin.finn_requests where created_at>clock_timestamp()-interval '1 minute') + p_tokens > 6000 then return null; end if;
  if exists(select 1 from daymargin.finn_requests where not finished and created_at>clock_timestamp()-interval '1 minute') then return null; end if;
  insert into daymargin.finn_requests(owner_id,reserved_tokens) values(p_user,p_tokens) returning id into request_id;
  return request_id;
end $$;
revoke all on function daymargin.apply_record_change(uuid,uuid,integer,jsonb,boolean) from public;
grant execute on function daymargin.apply_record_change(uuid,uuid,integer,jsonb,boolean) to daymargin_app;
revoke all on function daymargin.reserve_finn_request(uuid,integer,integer,integer,integer) from public,daymargin_app;
