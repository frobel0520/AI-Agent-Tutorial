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

create index if not exists idx_event_logs_created_at on event_logs (created_at desc);
create index if not exists idx_notes_updated_at on notes (updated_at desc);

-- Backend-only access: FastAPI connects with DATABASE_URL (postgres role).
-- No RLS required for this tutorial API; do not expose DATABASE_URL to browsers.
