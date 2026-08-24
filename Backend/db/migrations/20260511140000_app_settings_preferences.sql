-- App-wide preferences: prefixes/suffixes, theme, currency, date/time formats.

alter table public.app_settings
  add column if not exists document_number_prefix text default '',
  add column if not exists document_number_suffix text default '',
  add column if not exists reference_prefix text default '',
  add column if not exists reference_suffix text default '',
  add column if not exists app_theme text not null default 'system'
    constraint app_settings_theme_ck check (app_theme in ('light', 'dark', 'system')),
  add column if not exists app_currency text not null default 'INR',
  add column if not exists date_format text not null default 'DD/MM/YYYY',
  add column if not exists time_format text not null default '24h'
    constraint app_settings_time_ck check (time_format in ('12h', '24h'));

comment on column public.app_settings.document_number_prefix is 'Optional prefix for generated document numbers (display / export).';
comment on column public.app_settings.app_theme is 'UI preference: light, dark, or follow system.';
comment on column public.app_settings.app_currency is 'Default currency code (e.g. INR, USD).';
comment on column public.app_settings.date_format is 'Preferred date display format.';
comment on column public.app_settings.time_format is '12h or 24h clock display.';
