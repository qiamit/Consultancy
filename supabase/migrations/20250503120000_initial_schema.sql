-- Enums
create type public.bis_project_kind as enum (
  'new_license',
  'renewal',
  'inclusion',
  'maintenance'
);

create type public.iso_project_kind as enum (
  'new_certification',
  'existing_certification'
);

create type public.project_status as enum (
  'lead',
  'in_progress',
  'submitted',
  'completed',
  'on_hold',
  'cancelled'
);

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text,
  email text,
  phone text,
  address text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- BIS projects
create table public.bis_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  project_kind public.bis_project_kind not null,
  title text not null,
  status public.project_status not null default 'lead',
  license_number text,
  start_date date,
  target_date date,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ISO projects
create table public.iso_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  project_kind public.iso_project_kind not null,
  accrediting_body text,
  standard text,
  title text not null,
  status public.project_status not null default 'lead',
  certificate_number text,
  start_date date,
  target_date date,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Finance
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  amount numeric(14, 2) not null,
  currency text not null default 'INR',
  txn_date date not null default (current_date),
  status text not null default 'pending',
  description text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Product & services catalog
create table public.service_offerings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Company (single row)
create table public.company_settings (
  id int primary key default 1 check (id = 1),
  company_name text,
  address text,
  gst_number text,
  phone text,
  email text,
  logo_path text,
  updated_at timestamptz not null default now()
);

-- App (single row)
create table public.app_settings (
  id int primary key default 1 check (id = 1),
  site_title text not null default 'Technical Consultancy',
  updated_at timestamptz not null default now()
);

-- Project documents metadata (files live in Storage bucket `documents`)
create table public.project_documents (
  id uuid primary key default gen_random_uuid(),
  bis_project_id uuid references public.bis_projects (id) on delete cascade,
  iso_project_id uuid references public.iso_projects (id) on delete cascade,
  storage_path text not null,
  file_name text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint project_documents_one_project check (
    (bis_project_id is not null)::int + (iso_project_id is not null)::int = 1
  )
);

-- Signup → profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.bis_projects enable row level security;
alter table public.iso_projects enable row level security;
alter table public.transactions enable row level security;
alter table public.service_offerings enable row level security;
alter table public.company_settings enable row level security;
alter table public.app_settings enable row level security;
alter table public.project_documents enable row level security;

-- Profiles: own row
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- MVP: all authenticated staff share access to operational tables
create policy "clients_all"
  on public.clients for all
  to authenticated
  using (true)
  with check (true);

create policy "bis_projects_all"
  on public.bis_projects for all
  to authenticated
  using (true)
  with check (true);

create policy "iso_projects_all"
  on public.iso_projects for all
  to authenticated
  using (true)
  with check (true);

create policy "transactions_all"
  on public.transactions for all
  to authenticated
  using (true)
  with check (true);

create policy "service_offerings_all"
  on public.service_offerings for all
  to authenticated
  using (true)
  with check (true);

create policy "company_settings_all"
  on public.company_settings for all
  to authenticated
  using (true)
  with check (true);

create policy "app_settings_all"
  on public.app_settings for all
  to authenticated
  using (true)
  with check (true);

create policy "project_documents_all"
  on public.project_documents for all
  to authenticated
  using (true)
  with check (true);

-- Storage bucket for uploads
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents');

create policy "documents_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents');

create policy "documents_update_authenticated"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents')
  with check (bucket_id = 'documents');

create policy "documents_delete_authenticated"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents');

-- Seed defaults
insert into public.company_settings (id) values (1)
on conflict (id) do nothing;

insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

insert into public.service_offerings (name, category, description, sort_order) values
  ('BIS — New license', 'BIS', 'New BIS license applications', 10),
  ('BIS — Renewal', 'BIS', 'License renewal support', 20),
  ('BIS — New inclusion', 'BIS', 'New inclusion in existing license', 30),
  ('BIS — Maintenance', 'BIS', 'Maintenance of existing license', 40),
  ('ISO 17025 (NABL / QAI / IQAS)', 'ISO', 'Laboratory accreditation', 50),
  ('ISO 9001 / 14001 / 45001', 'ISO', 'Management system certifications', 60),
  ('Food safety (ISO 22000 / HACCP)', 'ISO', 'Food safety systems', 70),
  ('5S / Six Sigma / Risk analysis', 'Consulting', 'Operational excellence', 80),
  ('Product testing', 'Testing', 'Third-party product testing coordination', 90),
  ('Instrument calibration', 'Calibration', 'Calibration of measuring instruments', 100);
