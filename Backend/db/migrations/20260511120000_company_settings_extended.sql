-- Extended company profile: address book, bank, letterhead assets, default terms.

alter table public.company_settings
  add column if not exists contact_person_name text,
  add column if not exists company_city text default 'Raipur',
  add column if not exists company_pin_code text default '493221',
  add column if not exists company_state text default 'Chhattisgarh',
  add column if not exists company_country text default 'India',
  add column if not exists bank_account_holder_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_branch_name text,
  add column if not exists bank_ifsc text,
  add column if not exists bank_swift text,
  add column if not exists bank_upi_id text,
  add column if not exists bank_upi_qr_path text,
  add column if not exists bank_cheque_image_path text,
  add column if not exists letterhead_upper_path text,
  add column if not exists letterhead_lower_path text,
  add column if not exists seal_sign_image_path text,
  add column if not exists company_terms_text text;

comment on column public.company_settings.contact_person_name is 'Primary contact for proposals / letterhead.';
comment on column public.company_settings.company_city is 'Registered / letterhead city (default Raipur).';
comment on column public.company_settings.company_pin_code is 'PIN code (default 493221).';
comment on column public.company_settings.company_state is 'State (default Chhattisgarh).';
comment on column public.company_settings.company_country is 'Country (default India).';
comment on column public.company_settings.bank_upi_qr_path is 'Storage path in documents bucket for UPI QR image.';
comment on column public.company_settings.bank_cheque_image_path is 'Storage path for sample cheque image.';
comment on column public.company_settings.letterhead_upper_path is 'Storage path for letterhead top banner image.';
comment on column public.company_settings.letterhead_lower_path is 'Storage path for letterhead footer image.';
comment on column public.company_settings.seal_sign_image_path is 'Storage path for seal & signature image.';
comment on column public.company_settings.company_terms_text is 'Default terms & conditions text for quotations etc.';
