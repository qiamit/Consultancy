-- Reusable text templates for scope of work and notes (same pattern as company_terms).

create table public.company_scope_of_work (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  body text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_scope_of_work_code_format check (
    code ~ '^[a-z][a-z0-9_]{0,62}$'
  ),
  constraint company_scope_of_work_code_unique unique (code)
);

comment on table public.company_scope_of_work is
  'Named scope-of-work snippets; use `code` in quotations and other modules.';
comment on column public.company_scope_of_work.code is
  'Stable key (lowercase, a–z, digits, underscore). Set at create only.';

create index company_scope_of_work_sort_idx on public.company_scope_of_work (sort_order, name);

alter table public.company_scope_of_work enable row level security;

create policy "company_scope_of_work_all"
  on public.company_scope_of_work for all
  to authenticated
  using (true)
  with check (true);

insert into public.company_scope_of_work (code, name, body, sort_order)
values ('default', 'Default', '', 0)
on conflict (code) do nothing;

create table public.company_notes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  body text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_notes_code_format check (
    code ~ '^[a-z][a-z0-9_]{0,62}$'
  ),
  constraint company_notes_code_unique unique (code)
);

comment on table public.company_notes is
  'Named notes templates; use `code` in quotations and other modules.';
comment on column public.company_notes.code is
  'Stable key (lowercase, a–z, digits, underscore). Set at create only.';

create index company_notes_sort_idx on public.company_notes (sort_order, name);

alter table public.company_notes enable row level security;

create policy "company_notes_all"
  on public.company_notes for all
  to authenticated
  using (true)
  with check (true);

insert into public.company_notes (code, name, body, sort_order)
values ('default', 'Default', '', 0)
on conflict (code) do nothing;
