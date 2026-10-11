-- Replace the preview-sized quotas with the published Groq GPT-OSS Free ceilings.
-- Groq enforces its actual token-per-minute capacity; no artificial token timer
-- or global one-answer-at-a-time gate is imposed by Daymargin.
create or replace function daymargin.reserve_finn_request(p_user uuid,p_tokens integer,p_user_limit integer,p_shared_limit integer,p_minute_limit integer)
returns uuid language plpgsql security definer set search_path = daymargin, pg_temp as $$
declare request_id uuid; day_start timestamptz := date_trunc('day',now() at time zone 'Asia/Manila') at time zone 'Asia/Manila';
begin
  perform pg_advisory_xact_lock(7151206);
  if p_tokens is null or p_user is null or p_user_limit is null or p_shared_limit is null or p_minute_limit is null
    or p_tokens < 1 or p_tokens > 7500 or p_user_limit < 1 or p_shared_limit < 1 or p_minute_limit < 1 then return null; end if;
  if (select count(*) from daymargin.finn_requests where owner_id=p_user and created_at>=day_start) >= least(p_user_limit,1000) then return null; end if;
  if (select count(*) from daymargin.finn_requests where created_at>=day_start) >= least(p_shared_limit,1000) then return null; end if;
  if (select coalesce(sum(reserved_tokens),0) from daymargin.finn_requests where created_at>=day_start) + p_tokens > 200000 then return null; end if;
  if (select count(*) from daymargin.finn_requests where created_at>clock_timestamp()-interval '1 minute') >= least(p_minute_limit,30) then return null; end if;
  insert into daymargin.finn_requests(owner_id,reserved_tokens) values(p_user,p_tokens) returning id into request_id;
  return request_id;
end $$;
revoke all on function daymargin.reserve_finn_request(uuid,integer,integer,integer,integer) from public,daymargin_app;
