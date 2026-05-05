-- Align catalog label with UI: default project type displays as "License" (value stays `new_license`).
update public.app_dropdown_options
set label = 'License'
where option_key = 'bis_projects.project_kind_catalog'
  and value = 'new_license';
