-- Replace the single-row ai_provider_settings with a multi-row ai_models table.

drop table if exists public.ai_provider_settings;

create table if not exists public.ai_models (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null,
  model_id     text not null,
  display_name text not null,
  api_key      text,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.ai_models enable row level security;

create policy "ai_models_all"
  on public.ai_models for all
  to authenticated
  using (true)
  with check (true);
