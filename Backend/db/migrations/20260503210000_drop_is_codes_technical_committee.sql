-- Remove Technical Committee from IS codes (UI + API no longer use this column).
alter table public.is_codes
  drop column if exists technical_committee;

notify pgrst, 'reload schema';
