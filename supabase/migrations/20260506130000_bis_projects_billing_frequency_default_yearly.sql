-- Default billing frequency for new BIS projects (app + DB default).

alter table public.bis_projects
  alter column billing_frequency set default 'Yearly';
