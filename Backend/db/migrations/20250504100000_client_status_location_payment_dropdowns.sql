-- Configurable status, geography, and payment terms via app_dropdown_options.

alter table public.clients drop constraint if exists clients_company_status_check;
alter table public.clients drop constraint if exists clients_payment_term_check;

-- Company status
insert into public.app_dropdown_options (option_key, value, label, sort_order) values
  ('client_master.company_status', 'Active', null, 10),
  ('client_master.company_status', 'Inactive', null, 20)
on conflict (option_key, value) do nothing;

-- Default country
insert into public.app_dropdown_options (option_key, value, label, sort_order) values
  ('client_master.country', 'India', null, 10)
on conflict (option_key, value) do nothing;

-- Payment terms (value matches clients.payment_term storage)
insert into public.app_dropdown_options (option_key, value, label, sort_order) values
  ('client_master.payment_term', '100% Advance', '100 % Advance', 10),
  ('client_master.payment_term', '15 Days', null, 20),
  ('client_master.payment_term', '30 Days', null, 30)
on conflict (option_key, value) do nothing;
