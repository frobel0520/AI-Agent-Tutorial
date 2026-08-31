-- Dify access is managed server-side by the Edge Function.
-- Browsers can authenticate with Supabase Auth, but they cannot read or write
-- this allowlist directly.

create table if not exists public.dify_access (
    user_id uuid primary key references auth.users(id) on delete cascade,
    enabled boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.dify_access enable row level security;
revoke all on table public.dify_access from anon, authenticated;
