-- Default PIN for new clients (must exist in app_dropdown_options for validation).

insert into public.app_dropdown_options (option_key, value, label, sort_order) values
  ('client_master.pin_code', '493221', null, 10)
on conflict (option_key, value) do nothing;
