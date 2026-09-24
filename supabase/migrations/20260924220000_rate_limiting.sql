-- Distributed application-level rate limiting.
-- Keys are hashed by the server before storage. This table is service-role
-- only and contains no raw IP addresses, session tokens, workspace IDs, or
-- user IDs.

create table if not exists public.rate_limit_buckets (
  key_hash text primary key,
  scope text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists rate_limit_buckets_updated_idx
  on public.rate_limit_buckets(updated_at);

alter table public.rate_limit_buckets enable row level security;

create or replace function public.consume_rate_limit(
  target_key_hash text,
  target_scope text,
  target_limit integer,
  target_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_bucket public.rate_limit_buckets%rowtype;
  request_now timestamptz := now();
  next_reset timestamptz;
begin
  if target_key_hash is null or length(target_key_hash) <> 64
    or target_scope is null or length(target_scope) = 0
    or target_limit < 1 or target_window_seconds < 1 then
    raise exception 'invalid rate limit arguments';
  end if;

  -- Serialize concurrent requests for the same hashed key. Without this
  -- lock, two first requests could both observe an absent bucket and lose a
  -- counter increment during the upsert race.
  perform pg_advisory_xact_lock(hashtextextended(target_key_hash, 0));

  select * into current_bucket
  from public.rate_limit_buckets
  where key_hash = target_key_hash
  for update;

  if not found or current_bucket.window_started_at + make_interval(secs => target_window_seconds) <= request_now then
    next_reset := request_now + make_interval(secs => target_window_seconds);
    insert into public.rate_limit_buckets(key_hash, scope, window_started_at, request_count, updated_at)
    values (target_key_hash, target_scope, request_now, 1, request_now)
    on conflict (key_hash) do update
      set scope = excluded.scope,
          window_started_at = excluded.window_started_at,
          request_count = excluded.request_count,
          updated_at = excluded.updated_at;
    return query select true, target_limit - 1, target_window_seconds, next_reset;
    return;
  end if;

  next_reset := current_bucket.window_started_at + make_interval(secs => target_window_seconds);
  if current_bucket.request_count >= target_limit then
    update public.rate_limit_buckets set updated_at = request_now where key_hash = target_key_hash;
    return query select false, 0, greatest(1, ceil(extract(epoch from (next_reset - request_now)))::integer), next_reset;
    return;
  end if;

  update public.rate_limit_buckets
  set scope = target_scope,
      request_count = request_count + 1,
      updated_at = request_now
  where key_hash = target_key_hash;

  return query select true, greatest(0, target_limit - current_bucket.request_count - 1), greatest(1, ceil(extract(epoch from (next_reset - request_now)))::integer), next_reset;
end;
$$;

revoke all on table public.rate_limit_buckets from anon, authenticated;
grant all on table public.rate_limit_buckets to service_role;
revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

comment on table public.rate_limit_buckets is
  'Service-only fixed-window application rate-limit counters with hashed keys.';
