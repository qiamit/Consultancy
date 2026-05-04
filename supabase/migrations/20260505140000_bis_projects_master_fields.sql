-- BIS Projects: fields for master UI (IS link, CM/L digits, billing, portal, etc.)

do $$
begin
  alter type public.bis_project_kind add value 'application';
exception
  when duplicate_object then null;
end
$$;

alter table public.bis_projects
  add column if not exists is_code_id uuid references public.is_codes (id) on delete set null,
  add column if not exists cm_l_digits text,
  add column if not exists license_validity_date date,
  add column if not exists case_handled_by text not null default 'Amit Kumar',
  add column if not exists case_referred_by text not null default 'QE',
  add column if not exists billing_amount numeric(14, 2) not null default 0,
  add column if not exists billing_frequency text not null default 'Monthly',
  add column if not exists portal_user_id text,
  add column if not exists portal_password text;

alter table public.bis_projects
  drop constraint if exists bis_projects_cm_l_digits_ck;
alter table public.bis_projects
  add constraint bis_projects_cm_l_digits_ck check (
    cm_l_digits is null or cm_l_digits ~ '^[0-9]{10}$'
  );

alter table public.bis_projects
  drop constraint if exists bis_projects_billing_frequency_ck;
alter table public.bis_projects
  add constraint bis_projects_billing_frequency_ck check (
    billing_frequency in (
      'Monthly',
      'Quarterly',
      'Half Yearly',
      'Yearly',
      'Based on Work'
    )
  );

comment on column public.bis_projects.cm_l_digits is
  'Ten digits only; UI shows CM/L or CM/A prefix from project_kind.';
comment on column public.bis_projects.license_validity_date is
  'End of licence validity; N/A for application type in UI.';
