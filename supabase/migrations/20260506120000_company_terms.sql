-- Multiple named terms & conditions templates (link by stable `code` in the app).

create table public.company_terms (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  body text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_terms_code_format check (
    code ~ '^[a-z][a-z0-9_]{0,62}$'
  ),
  constraint company_terms_code_unique unique (code)
);

comment on table public.company_terms is
  'Named T&C templates; use `code` to select in quotations and other modules.';
comment on column public.company_terms.code is
  'Stable key (lowercase, a–z, digits, underscore). Not renamed after create.';
comment on column public.company_terms.name is 'Human-readable label in settings UI.';

create index company_terms_sort_idx on public.company_terms (sort_order, name);

alter table public.company_terms enable row level security;

create policy "company_terms_all"
  on public.company_terms for all
  to authenticated
  using (true)
  with check (true);

-- Seed default template from legacy single column (if row exists and default missing).
insert into public.company_terms (code, name, body, sort_order)
select
  'default',
  'Default',
  coalesce(nullif(trim(cs.company_terms_text), ''), ''),
  0
from public.company_settings cs
where cs.id = 1
  and not exists (select 1 from public.company_terms t where t.code = 'default');
