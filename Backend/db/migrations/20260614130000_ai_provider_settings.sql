-- AI Provider Settings: single-row table for API key, provider, model, and per-module toggles.

create table if not exists public.ai_provider_settings (
  id         int primary key default 1 check (id = 1),
  enabled    boolean not null default false,
  provider   text check (provider in ('anthropic', 'openai', 'google', 'custom')),
  api_key    text,
  model      text,
  custom_base_url  text,
  enabled_modules  jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.ai_provider_settings enable row level security;

create policy "ai_provider_settings_all"
  on public.ai_provider_settings for all
  to authenticated
  using (true)
  with check (true);

-- Seed the single row
insert into public.ai_provider_settings (id)
values (1)
on conflict (id) do nothing;
