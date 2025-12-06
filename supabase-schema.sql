-- PromptForge initial schema
-- You can run this in Supabase SQL editor or your own migrations system.

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  name text not null,
  description text null,
  base_prompt text not null,
  is_public boolean not null default false,
  metadata jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.template_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  name text not null,
  label text not null,
  field_type text not null default 'short_text', -- e.g. short_text, long_text, select
  required boolean not null default false,
  helper_text text null,
  sort_order integer not null default 0
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  template_id uuid not null references public.templates(id) on delete set null,
  filled_fields jsonb not null,
  final_prompt text not null,
  created_at timestamptz not null default now()
);

-- Basic indexes
create index if not exists idx_templates_user_id on public.templates(user_id);
create index if not exists idx_generations_user_id on public.generations(user_id);
create index if not exists idx_generations_template_id on public.generations(template_id);

-- User preferences stored per authenticated user
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

-- Drop policies if they exist (for idempotency)
drop policy if exists "select own preferences" on public.user_preferences;
drop policy if exists "insert own preferences" on public.user_preferences;
drop policy if exists "update own preferences" on public.user_preferences;
drop policy if exists "delete own preferences" on public.user_preferences;

-- Create RLS policies for user preferences
create policy "select own preferences" on public.user_preferences
  for select using (auth.uid() = user_id);

create policy "insert own preferences" on public.user_preferences
  for insert with check (auth.uid() = user_id);

create policy "update own preferences" on public.user_preferences
  for update using (auth.uid() = user_id);

create policy "delete own preferences" on public.user_preferences
  for delete using (auth.uid() = user_id);
