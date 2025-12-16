-- PromptForge schema (Supabase)
-- Apply in the Supabase SQL editor or your migration system.

create extension if not exists "pgcrypto";

-- Shared helper: keep updated_at fresh on update
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Session identity
create table if not exists public.pf_sessions (
  id uuid primary key,
  created_at timestamptz not null default now()
);

-- Guest/session-scoped preferences
create table if not exists public.pf_preferences (
  session_id uuid primary key references public.pf_sessions(id) on delete cascade,
  tone text null,
  audience text null,
  domain text null,
  updated_at timestamptz not null default now()
);

-- Prompt generations (session-scoped history)
create table if not exists public.pf_generations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.pf_sessions(id) on delete cascade,
  task text not null,
  label text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_pf_generations_session_id on public.pf_generations(session_id);
create index if not exists idx_pf_generations_session_created_at on public.pf_generations(session_id, created_at desc, id desc);

-- Drop legacy/unused tables to reclaim space
drop table if exists public.pf_events cascade;
drop table if exists public.pf_prompt_versions cascade;
drop table if exists public.generations cascade;
drop table if exists public.templates cascade;
drop table if exists public.template_fields cascade;

-- Authenticated user preferences (preferred source when signed in)
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tone text null,
  audience text null,
  domain text null,
  default_model text null,
  temperature numeric null,
  style_guidelines jsonb null,
  output_format text null,
  language text null,
  depth text null,
  citation_preference text null,
  persona_hints jsonb null,
  ui_defaults jsonb null,
  sharing_links jsonb null,
  do_not_ask_again jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

-- RLS policies (idempotent)
drop policy if exists "select own preferences" on public.user_preferences;
drop policy if exists "insert own preferences" on public.user_preferences;
drop policy if exists "update own preferences" on public.user_preferences;
drop policy if exists "delete own preferences" on public.user_preferences;

create policy "select own preferences" on public.user_preferences
  for select using (auth.uid() = user_id);

create policy "insert own preferences" on public.user_preferences
  for insert with check (auth.uid() = user_id);

create policy "update own preferences" on public.user_preferences
  for update using (auth.uid() = user_id);

create policy "delete own preferences" on public.user_preferences
  for delete using (auth.uid() = user_id);

-- Keep updated_at in sync automatically
drop trigger if exists trg_set_updated_at_user_preferences on public.user_preferences;
create trigger trg_set_updated_at_user_preferences
before update on public.user_preferences
for each row execute function public.set_updated_at();

-- Subscriptions and quotas per user
create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  subscription_tier text not null default 'free_trial',
  trial_expires_at timestamptz null,
  period_start timestamptz not null default now(),
  quota_generations integer not null default 800,
  quota_edits integer not null default 200,
  quota_clarifying integer not null default 800,
  premium_finals_remaining integer not null default 0,
  usage_generations integer not null default 0,
  usage_edits integer not null default 0,
  usage_clarifying integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_subscriptions enable row level security;

drop policy if exists "select own subscription" on public.user_subscriptions;
drop policy if exists "insert own subscription" on public.user_subscriptions;
drop policy if exists "update own subscription" on public.user_subscriptions;
drop policy if exists "delete own subscription" on public.user_subscriptions;

create policy "select own subscription" on public.user_subscriptions
  for select using (auth.uid() = user_id);

create policy "insert own subscription" on public.user_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "update own subscription" on public.user_subscriptions
  for update using (auth.uid() = user_id);

create policy "delete own subscription" on public.user_subscriptions
  for delete using (auth.uid() = user_id);

-- Guardrails: keep tiers valid and counters non-negative
-- Tier validation: keep non-empty; downstream app enforces canonical tiers.
-- If you want strict enforcement after backfilling, replace this with an enum FK.
alter table public.user_subscriptions
  drop constraint if exists chk_user_subscriptions_tier_valid,
  add constraint chk_user_subscriptions_tier_valid check (
    subscription_tier is not null and length(trim(subscription_tier)) > 0
  );

alter table public.user_subscriptions
  drop constraint if exists chk_user_subscriptions_counts_non_negative,
  add constraint chk_user_subscriptions_counts_non_negative check (
    quota_generations >= 0 and
    quota_edits >= 0 and
    quota_clarifying >= 0 and
    premium_finals_remaining >= 0 and
    usage_generations >= 0 and
    usage_edits >= 0 and
    usage_clarifying >= 0
  );

drop trigger if exists trg_set_updated_at_user_subscriptions on public.user_subscriptions;
create trigger trg_set_updated_at_user_subscriptions
before update on public.user_subscriptions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Core session-scoped tables (RLS + service role access only)
-- These tables are accessed via server actions using the service role key.
-- If you later need direct client access, add narrower policies keyed by
-- session_id claims and keep anon scope minimal.
-- ---------------------------------------------------------------------------

alter table public.pf_sessions enable row level security;
alter table public.pf_preferences enable row level security;
alter table public.pf_generations enable row level security;

-- pf_sessions
drop policy if exists "service role all (pf_sessions)" on public.pf_sessions;
create policy "service role all (pf_sessions)" on public.pf_sessions
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- pf_preferences
drop policy if exists "service role all (pf_preferences)" on public.pf_preferences;
create policy "service role all (pf_preferences)" on public.pf_preferences
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- pf_generations
drop policy if exists "service role all (pf_generations)" on public.pf_generations;
create policy "service role all (pf_generations)" on public.pf_generations
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Keep updated_at fresh for session preferences
drop trigger if exists trg_set_updated_at_pf_preferences on public.pf_preferences;
create trigger trg_set_updated_at_pf_preferences
before update on public.pf_preferences
for each row execute function public.set_updated_at();

-- Retention: keep the latest 50 generations per session (older rows deleted on insert)
create or replace function public.prune_pf_generations() returns trigger as $$
begin
  delete from public.pf_generations
  where id in (
    select id
    from public.pf_generations
    where session_id = NEW.session_id
    order by created_at desc, id desc
    offset 50
  );
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_prune_pf_generations on public.pf_generations;
create trigger trg_prune_pf_generations
after insert on public.pf_generations
for each row
execute function public.prune_pf_generations();
