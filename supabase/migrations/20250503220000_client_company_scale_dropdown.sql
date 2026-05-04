-- Client Master — company scale options (same pattern as company_type).

insert into public.app_dropdown_options (option_key, value, label, sort_order) values
  ('client_master.company_scale', 'Large', null, 10),
  ('client_master.company_scale', 'Medium', null, 20),
  ('client_master.company_scale', 'Small', null, 30),
  ('client_master.company_scale', 'Micro', null, 40)
on conflict (option_key, value) do nothing;

alter table public.clients drop constraint if exists clients_company_scale_check;
