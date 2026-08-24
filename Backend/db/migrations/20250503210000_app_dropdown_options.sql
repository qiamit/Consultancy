-- App-wide configurable dropdown values (Client Master and future modules).

create table public.app_dropdown_options (
  id uuid primary key default gen_random_uuid(),
  option_key text not null,
  value text not null,
  label text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint app_dropdown_options_key_value_unique unique (option_key, value),
  constraint app_dropdown_options_value_nonempty check (length(trim(value)) > 0),
  constraint app_dropdown_options_key_nonempty check (length(trim(option_key)) > 0)
);

create index app_dropdown_options_key_sort_idx
  on public.app_dropdown_options (option_key, sort_order, value);

alter table public.app_dropdown_options enable row level security;

create policy "app_dropdown_options_all"
  on public.app_dropdown_options for all
  to authenticated
  using (true)
  with check (true);

-- Seed: Client Master — company type (matches prior check constraint list).
insert into public.app_dropdown_options (option_key, value, label, sort_order) values
  ('client_master.company_type', 'Manufacturer', null, 10),
  ('client_master.company_type', 'Service Provider', null, 20),
  ('client_master.company_type', 'Testing Laboratory', null, 30),
  ('client_master.company_type', 'Calibration Laboratory', null, 40),
  ('client_master.company_type', 'RMP', null, 50),
  ('client_master.company_type', 'PT Provider', null, 60),
  ('client_master.company_type', 'Other', null, 70)
on conflict (option_key, value) do nothing;

-- Allow any company_type that exists in app_dropdown_options (validated in app layer).
alter table public.clients drop constraint if exists clients_company_type_check;
