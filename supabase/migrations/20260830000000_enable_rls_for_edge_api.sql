-- The browser talks to the Edge Function, not directly to PostgREST.
-- Keep these tables inaccessible to anon/authenticated clients; the function
-- uses the server-only service role key and remains the API boundary.

alter table if exists public.notes enable row level security;
alter table if exists public.webhook_subscriptions enable row level security;
alter table if exists public.event_logs enable row level security;
alter table if exists public.webhook_deliveries enable row level security;

revoke all on table public.notes from anon, authenticated;
revoke all on table public.webhook_subscriptions from anon, authenticated;
revoke all on table public.event_logs from anon, authenticated;
revoke all on table public.webhook_deliveries from anon, authenticated;
