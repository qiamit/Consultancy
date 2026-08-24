-- Ensures clients.phone_country_code exists (fixes PGRST204 if an older DB skipped
-- 20250506120000_client_phone_country_code.sql). Safe to re-run.

alter table public.clients
  add column if not exists phone_country_code text;

update public.clients
set phone_country_code = '+91'
where phone_country_code is null
   or trim(phone_country_code) = '';

alter table public.clients
  alter column phone_country_code set default '+91';

alter table public.clients
  alter column phone_country_code set not null;

comment on column public.clients.phone_country_code is
  'E.164-style calling code (e.g. +91). National digits live in clients.phone.';

notify pgrst, 'reload schema';
