-- BIS Projects: manage project kind & billing frequency via `app_dropdown_options` (add/delete in UI).
-- 1) Store `project_kind` as text (was enum) so new kinds do not require `ALTER TYPE`.
-- 2) Drop fixed CHECK on `billing_frequency` so new values can be added from the UI.

alter table public.bis_projects
  alter column project_kind type text using project_kind::text;

drop type if exists public.bis_project_kind;

alter table public.bis_projects
  drop constraint if exists bis_projects_billing_frequency_ck;

-- Seed catalog rows (keys match `lib/dropdown-keys.ts`).
insert into public.app_dropdown_options (option_key, value, label, sort_order) values
  ('bis_projects.project_kind_catalog', 'new_license', 'License', 10),
  ('bis_projects.project_kind_catalog', 'application', 'Application', 20),
  ('bis_projects.project_kind_catalog', 'inclusion', 'Inclusion', 30),
  ('bis_projects.project_kind_catalog', 'renewal', 'Renewal (legacy)', 40),
  ('bis_projects.project_kind_catalog', 'maintenance', 'Maintenance (legacy)', 50)
on conflict (option_key, value) do nothing;

insert into public.app_dropdown_options (option_key, value, label, sort_order) values
  ('bis_projects.billing_frequency_catalog', 'Monthly', null, 10),
  ('bis_projects.billing_frequency_catalog', 'Quarterly', null, 20),
  ('bis_projects.billing_frequency_catalog', 'Half Yearly', null, 30),
  ('bis_projects.billing_frequency_catalog', 'Yearly', null, 40),
  ('bis_projects.billing_frequency_catalog', 'Based on Work', null, 50)
on conflict (option_key, value) do nothing;
