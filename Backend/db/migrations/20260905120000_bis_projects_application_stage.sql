-- Pending BIS application workflow stage (New Applications Status column).

alter table public.bis_projects
  add column if not exists application_stage text;

update public.bis_projects
set application_stage = 'Draft'
where application_stage is null or trim(application_stage) = '';

alter table public.bis_projects
  alter column application_stage set default 'Draft';

alter table public.bis_projects
  alter column application_stage set not null;

alter table public.bis_projects
  drop constraint if exists bis_projects_application_stage_ck;

alter table public.bis_projects
  add constraint bis_projects_application_stage_ck check (
    application_stage in (
      'Draft',
      'Submitted',
      'Query Done',
      'Application Recorded',
      'Inspection Planned',
      'Inspection Done',
      'License Granted'
    )
  );

comment on column public.bis_projects.application_stage is
  'Workflow stage for pending BIS applications (Draft → License Granted).';
