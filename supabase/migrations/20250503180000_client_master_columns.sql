-- Client Master extended fields

alter table public.clients
  add column if not exists gst_number text,
  add column if not exists company_type text,
  add column if not exists company_scale text,
  add column if not exists company_status text not null default 'Active',
  add column if not exists contact_person_name text,
  add column if not exists pin_code text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists country text not null default 'India',
  add column if not exists opening_balance numeric(14, 2) not null default 0,
  add column if not exists balance_type text not null default 'Dr',
  add column if not exists payment_term text;

update public.clients
set contact_person_name = name
where contact_person_name is null;

alter table public.clients drop constraint if exists clients_company_type_check;
alter table public.clients add constraint clients_company_type_check check (
  company_type is null
  or company_type in (
    'Manufacturer',
    'Service Provider',
    'Testing Laboratory',
    'Calibration Laboratory',
    'RMP',
    'PT Provider',
    'Other'
  )
);

alter table public.clients drop constraint if exists clients_company_scale_check;
alter table public.clients add constraint clients_company_scale_check check (
  company_scale is null
  or company_scale in ('Large', 'Medium', 'Small', 'Micro')
);

alter table public.clients drop constraint if exists clients_company_status_check;
alter table public.clients add constraint clients_company_status_check check (
  company_status in ('Active', 'Inactive')
);

alter table public.clients drop constraint if exists clients_balance_type_check;
alter table public.clients add constraint clients_balance_type_check check (
  balance_type in ('Cr', 'Dr')
);

alter table public.clients drop constraint if exists clients_payment_term_check;
alter table public.clients add constraint clients_payment_term_check check (
  payment_term is null
  or payment_term in ('100% Advance', '15 Days', '30 Days')
);
