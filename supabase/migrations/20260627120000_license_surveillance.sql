-- Manual license surveillance tracking (client, IS code, CM/L, date, allotted employee)
create table if not exists public.license_surveillance (
  id uuid primary key default gen_random_uuid(),
  bis_project_id uuid references public.bis_projects(id) on delete set null,
  client_id uuid not null references public.clients(id) on delete cascade,
  is_code_id uuid not null references public.is_codes(id) on delete restrict,
  cm_l_digits text,
  project_kind text,
  surveillance_date date not null,
  allotted_employee_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists license_surveillance_client_id_idx
  on public.license_surveillance(client_id);

create index if not exists license_surveillance_surveillance_date_idx
  on public.license_surveillance(surveillance_date desc);

alter table public.license_surveillance enable row level security;

create policy "license_surveillance_all"
  on public.license_surveillance for all
  to authenticated
  using (true)
  with check (true);

drop trigger if exists license_surveillance_touch_updated_at on public.license_surveillance;
create trigger license_surveillance_touch_updated_at
  before update on public.license_surveillance
  for each row execute function public.touch_updated_at();
