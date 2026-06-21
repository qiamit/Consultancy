-- Test Parameter Master: test specs linked to IS codes.

create table public.test_parameters (
  id uuid primary key default gen_random_uuid(),
  is_code_id uuid not null references public.is_codes (id) on delete restrict,
  test_name text not null,
  clause_no text not null default '',
  test_method text not null default '',
  unit text not null default '',
  specified_value text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index test_parameters_is_code_id_idx on public.test_parameters (is_code_id);
create index test_parameters_created_at_idx on public.test_parameters (created_at desc);

alter table public.test_parameters enable row level security;

create policy "test_parameters_all"
  on public.test_parameters for all
  to authenticated
  using (true)
  with check (true);

notify pgrst, 'reload schema';
