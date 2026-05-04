-- Default state for new clients (must exist in app_dropdown_options for validation).

insert into public.app_dropdown_options (option_key, value, label, sort_order) values
  ('client_master.state', 'Chhattisgarh', null, 10)
on conflict (option_key, value) do nothing;
