-- BIS New Applications: separate operational table (mirrors `bis_projects` columns) + catalogs.

create table public.bis_new_applications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  project_kind text not null default 'application',
  title text not null,
  status public.project_status not null default 'in_progress',
  license_number text,
  start_date date,
  target_date date,
  notes text,
  is_code_id uuid references public.is_codes (id) on delete set null,
  cm_l_digits text,
  license_validity_date date,
  case_handled_by text not null default 'Amit Kumar',
  case_referred_by text not null default 'QE',
  billing_amount numeric(14, 2) not null default 0,
  billing_frequency text not null default 'Yearly',
  portal_user_id text,
  portal_password text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bis_new_applications_cm_l_digits_ck check (
    cm_l_digits is null or cm_l_digits ~ '^[0-9]{10}$'
  )
);

create index if not exists bis_new_applications_client_id_idx
  on public.bis_new_applications (client_id);
create index if not exists bis_new_applications_is_code_id_idx
  on public.bis_new_applications (is_code_id);
create index if not exists bis_new_applications_created_at_idx
  on public.bis_new_applications (created_at desc);

alter table public.bis_new_applications enable row level security;

create policy "bis_new_applications_all"
  on public.bis_new_applications for all
  to authenticated
  using (true)
  with check (true);

comment on table public.bis_new_applications is
  'BIS “new application” pipeline records; UI mirrors BIS Existing Licenses master.';

insert into public.app_dropdown_options (option_key, value, label, sort_order) values
  ('bis_new_applications.project_kind_catalog', 'new_license', 'License', 10),
  ('bis_new_applications.project_kind_catalog', 'application', 'Application', 20),
  ('bis_new_applications.project_kind_catalog', 'inclusion', 'Inclusion', 30),
  ('bis_new_applications.project_kind_catalog', 'renewal', 'Renewal (legacy)', 40),
  ('bis_new_applications.project_kind_catalog', 'maintenance', 'Maintenance (legacy)', 50)
on conflict (option_key, value) do nothing;

insert into public.app_dropdown_options (option_key, value, label, sort_order) values
  ('bis_new_applications.billing_frequency_catalog', 'Monthly', null, 10),
  ('bis_new_applications.billing_frequency_catalog', 'Quarterly', null, 20),
  ('bis_new_applications.billing_frequency_catalog', 'Half Yearly', null, 30),
  ('bis_new_applications.billing_frequency_catalog', 'Yearly', null, 40),
  ('bis_new_applications.billing_frequency_catalog', 'Based on Work', null, 50)
on conflict (option_key, value) do nothing;
