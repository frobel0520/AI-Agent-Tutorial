-- Apply BEFORE deploying the owner-scoped Edge Function.
-- Existing shared rows stay NULL and are invisible to all API users until an
-- administrator explicitly assigns ownership. No data is deleted or guessed.
begin;

alter table public.notes add column if not exists user_id uuid references auth.users(id);
alter table public.webhook_subscriptions add column if not exists user_id uuid references auth.users(id);
alter table public.event_logs add column if not exists user_id uuid references auth.users(id);
alter table public.webhook_deliveries add column if not exists user_id uuid references auth.users(id);

alter table public.notes add constraint notes_owner_required check (user_id is not null) not valid;
alter table public.webhook_subscriptions add constraint webhooks_owner_required check (user_id is not null) not valid;
alter table public.event_logs add constraint events_owner_required check (user_id is not null) not valid;
alter table public.webhook_deliveries add constraint deliveries_owner_required check (user_id is not null) not valid;

create index if not exists notes_owner_id on public.notes (user_id, id desc);
create index if not exists webhooks_owner_id on public.webhook_subscriptions (user_id, id);
create index if not exists events_owner_id on public.event_logs (user_id, id desc);
create unique index if not exists events_id_owner on public.event_logs (id, user_id);
create unique index if not exists webhooks_id_owner on public.webhook_subscriptions (id, user_id);
alter table public.webhook_deliveries add constraint delivery_event_owner
  foreign key (event_id, user_id) references public.event_logs (id, user_id) on delete cascade not valid;
alter table public.webhook_deliveries add constraint delivery_subscription_owner
  foreign key (subscription_id, user_id) references public.webhook_subscriptions (id, user_id) on delete cascade not valid;

-- The browser must use the authenticated API; no direct PostgREST access.
alter table public.notes enable row level security;
alter table public.webhook_subscriptions enable row level security;
alter table public.event_logs enable row level security;
alter table public.webhook_deliveries enable row level security;
revoke all on public.notes, public.webhook_subscriptions, public.event_logs,
  public.webhook_deliveries from anon, authenticated;

create table public.model_request_quotas (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  requests integer not null check (requests between 1 and 30),
  primary key (user_id, window_start)
);
alter table public.model_request_quotas enable row level security;
revoke all on public.model_request_quotas from public, anon, authenticated;

-- Atomic across Edge Function instances: at most 30 attempts per user per UTC hour.
create function public.consume_model_quota(p_user_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.model_request_quotas
    where window_start < date_trunc('hour', now(), 'UTC') - interval '2 days';
  insert into public.model_request_quotas as quota (user_id, window_start, requests)
    values (p_user_id, date_trunc('hour', now(), 'UTC'), 1)
    on conflict (user_id, window_start) do update set requests = quota.requests + 1
    where quota.requests < 30;
  return found;
end;
$$;
revoke all on function public.consume_model_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_model_quota(uuid) to service_role;
commit;
