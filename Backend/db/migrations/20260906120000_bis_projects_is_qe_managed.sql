-- QE portfolio flag: licenses we actively manage (Our BIS License module).

alter table public.bis_projects
  add column if not exists is_qe_managed boolean not null default false;

create index if not exists bis_projects_is_qe_managed_true_idx
  on public.bis_projects (is_qe_managed)
  where is_qe_managed = true;
