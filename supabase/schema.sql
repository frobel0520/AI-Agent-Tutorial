-- AI-Agent-Tutorial schema for Supabase Postgres
-- Run in Supabase Dashboard → SQL Editor

create table if not exists notes (
    id serial primary key,
    title varchar(200) not null,
    content text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists webhook_subscriptions (
    id serial primary key,
    url varchar(500) not null,
    event_types varchar(200) not null default '*',
    secret varchar(200),
    created_at timestamptz not null default now()
);

create table if not exists event_logs (
    id serial primary key,
    event_type varchar(100) not null,
    payload text not null,
    created_at timestamptz not null default now()
);

create table if not exists webhook_deliveries (
    id serial primary key,
    event_id integer not null references event_logs(id) on delete cascade,
    subscription_id integer not null references webhook_subscriptions(id) on delete cascade,
    status_code integer,
    response_body text,
    success integer not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists dify_access (
    user_id uuid primary key references auth.users(id) on delete cascade,
    enabled boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists idx_event_logs_created_at on event_logs (created_at desc);
create index if not exists idx_notes_updated_at on notes (updated_at desc);

-- Production access: the Supabase Edge Function uses a server-only service
-- role key. Browsers call the function and never receive DATABASE_URL or the
-- service role key. The migration in supabase/migrations also applies these
-- protections to an existing project.
alter table if exists public.notes enable row level security;
alter table if exists public.webhook_subscriptions enable row level security;
alter table if exists public.event_logs enable row level security;
alter table if exists public.webhook_deliveries enable row level security;
alter table if exists public.dify_access enable row level security;

revoke all on table public.dify_access from anon, authenticated;
