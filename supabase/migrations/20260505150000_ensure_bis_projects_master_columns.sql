-- Idempotent repair: ensure `bis_projects` matches the BIS Projects master form
-- (`is_code_id`, CM/L, billing, portal, etc.). Safe if earlier migrations already ran.

do $$
begin
  alter type public.bis_project_kind add value 'application';
exception
  when duplicate_object then null;
end
$$;

alter table public.bis_projects
  add column if not exists is_code_id uuid,
  add column if not exists cm_l_digits text,
  add column if not exists license_validity_date date,
  add column if not exists case_handled_by text,
  add column if not exists case_referred_by text,
  add column if not exists billing_amount numeric(14, 2),
  add column if not exists billing_frequency text,
  add column if not exists portal_user_id text,
  add column if not exists portal_password text;

-- Defaults for existing rows (columns may have been added nullable only)
update public.bis_projects
set case_handled_by = 'Amit Kumar'
where case_handled_by is null or trim(case_handled_by) = '';

update public.bis_projects
set case_referred_by = 'QE'
where case_referred_by is null or trim(case_referred_by) = '';

update public.bis_projects
set billing_amount = 0
where billing_amount is null;

update public.bis_projects
set billing_frequency = 'Monthly'
where billing_frequency is null or trim(billing_frequency) = '';

alter table public.bis_projects
  alter column case_handled_by set default 'Amit Kumar',
  alter column case_referred_by set default 'QE',
  alter column billing_amount set default 0,
  alter column billing_frequency set default 'Monthly';

alter table public.bis_projects
  alter column case_handled_by set not null,
  alter column case_referred_by set not null,
  alter column billing_amount set not null,
  alter column billing_frequency set not null;

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

-- FK: PostgREST / app expects `is_code_id` -> `is_codes.id`
do $$
declare
  has_fk boolean;
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'is_codes'
  ) then
    return;
  end if;

  select exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_schema = kcu.constraint_schema
     and tc.constraint_name = kcu.constraint_name
    join information_schema.constraint_column_usage ccu
      on tc.constraint_schema = ccu.constraint_schema
     and tc.constraint_name = ccu.constraint_name
    where tc.table_schema = 'public'
      and tc.table_name = 'bis_projects'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'is_code_id'
      and ccu.table_schema = 'public'
      and ccu.table_name = 'is_codes'
  )
  into has_fk;

  if not has_fk then
    alter table public.bis_projects
      add constraint bis_projects_is_code_id_fkey
      foreign key (is_code_id) references public.is_codes (id) on delete set null;
  end if;
end
$$;

comment on column public.bis_projects.cm_l_digits is
  'Ten digits only; UI shows CM/L or CM/A prefix from project_kind.';
comment on column public.bis_projects.license_validity_date is
  'End of licence validity; N/A for application type in UI.';
