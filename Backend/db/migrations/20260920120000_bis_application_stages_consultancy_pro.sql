-- Replace BIS application workflow stages with Consultancy Pro milestones.

-- Drop old check first so we can rewrite values freely.
alter table public.bis_projects
  drop constraint if exists bis_projects_application_stage_ck;

update public.bis_projects
set application_stage = case trim(application_stage)
  when 'Draft' then 'Under Preparation'
  when 'Submitted' then 'Application Submitted'
  when 'Query Done' then 'Under Preparation'
  when 'Application Recorded' then 'Application Submitted'
  when 'Inspection Planned' then 'Under Preparation'
  when 'License Granted' then 'Inspection Done'
  when 'Under Preparation' then 'Under Preparation'
  when 'Test Request Done' then 'Test Request Done'
  when 'Report Uploaded' then 'Report Uploaded'
  when 'Application Submitted' then 'Application Submitted'
  when 'Inspection Done' then 'Inspection Done'
  else 'Under Preparation'
end;

alter table public.bis_projects
  alter column application_stage set default 'Under Preparation';

alter table public.bis_projects
  alter column application_stage set not null;

alter table public.bis_projects
  add constraint bis_projects_application_stage_ck check (
    application_stage in (
      'Under Preparation',
      'Test Request Done',
      'Report Uploaded',
      'Application Submitted',
      'Inspection Done'
    )
  );

comment on column public.bis_projects.application_stage is
  'Workflow stage for pending BIS applications (Under Preparation → Inspection Done). Auto-advances from checklist milestones.';
