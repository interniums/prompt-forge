-- PromptForge schema (Supabase)
-- Apply in the Supabase SQL editor or your migration system.

-- Required extension
create extension if not exists "pgcrypto";

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
