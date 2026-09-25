-- Durable shared rate limiting for the Edge API.
-- The Edge Function calls this through the service role only. It uses fixed
-- route classes and a global bucket; client IPs are deliberately not inputs.

create table if not exists public.api_rate_limits (
    route_key text not null,
    bucket_key text not null,
    window_started_at timestamptz not null,
    request_count integer not null check (request_count between 0 and 1000001),
    updated_at timestamptz not null,
    primary key (route_key, bucket_key),
    check (char_length(route_key) between 1 and 64),
    check (char_length(bucket_key) between 1 and 80)
);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from public, anon, authenticated;

create or replace function public.consume_api_rate_limit(
    p_route_key text,
    p_bucket_key text,
    p_limit integer,
    p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    v_now timestamptz := clock_timestamp();
    v_window_started_at timestamptz;
    v_request_count integer;
begin
    if p_route_key not in (
        'GET:notes', 'POST:notes', 'PUT:notes', 'DELETE:notes',
        'POST:ask', 'GET:webhooks', 'POST:webhooks', 'DELETE:webhooks',
        'GET:events', 'POST:incoming_webhooks', 'POST:dify_ask',
        'GET:dify_access', 'GET:other', 'POST:other', 'PUT:other',
        'DELETE:other', 'OTHER:other'
    ) then
        raise exception 'unsupported rate limit route';
    end if;

    if p_bucket_key <> 'global' and not (
        p_route_key = 'POST:dify_ask' and
        p_bucket_key ~ '^user:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    ) then
        raise exception 'unsupported rate limit bucket';
    end if;

    if p_limit < 1 or p_limit > 1000000 or p_window_seconds < 1 or p_window_seconds > 86400 then
        raise exception 'invalid rate limit policy';
    end if;

    -- The unique key plus ON CONFLICT update is the concurrency boundary.
    -- The first denied request moves the counter to p_limit + 1 and it stays
    -- there, so the count stays bounded but is still distinguishable from the
    -- last allowed request.
    insert into public.api_rate_limits(
        route_key, bucket_key, window_started_at, request_count, updated_at
    ) values (
        p_route_key, p_bucket_key, v_now, 1, v_now
    )
    on conflict (route_key, bucket_key) do update
    set
        window_started_at = case
            when public.api_rate_limits.window_started_at <=
                v_now - pg_catalog.make_interval(secs => p_window_seconds)
            then v_now
            else public.api_rate_limits.window_started_at
        end,
        request_count = case
            when public.api_rate_limits.window_started_at <=
                v_now - pg_catalog.make_interval(secs => p_window_seconds)
            then 1
            when public.api_rate_limits.request_count <= p_limit
            then public.api_rate_limits.request_count + 1
            else public.api_rate_limits.request_count
        end,
        updated_at = v_now;

    select limits.window_started_at, limits.request_count
    into v_window_started_at, v_request_count
    from public.api_rate_limits as limits
    where limits.route_key = p_route_key and limits.bucket_key = p_bucket_key;

    -- Keep cleanup bounded per call. The fixed route/bucket policy prevents
    -- arbitrary path keys from turning this table into an unbounded store.
    with stale as (
        select ctid
        from public.api_rate_limits
        where updated_at < v_now - pg_catalog.make_interval(secs => p_window_seconds * 2)
        order by updated_at
        limit 100
    )
    delete from public.api_rate_limits as limits
    using stale
    where limits.ctid = stale.ctid;

    return query
    select
        v_request_count <= p_limit,
        greatest(
            1,
            ceil(extract(epoch from (
                v_window_started_at + pg_catalog.make_interval(secs => p_window_seconds) - v_now
            )))::integer
        );
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer)
    from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer)
    to service_role;
