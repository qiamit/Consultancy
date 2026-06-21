-- Clear seeded BIS project kind catalog entries so admins can define their own list.
delete from public.app_dropdown_options
where option_key in (
  'bis_projects.project_kind_catalog',
  'bis_new_applications.project_kind_catalog'
);
