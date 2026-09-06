-- Allow named UI themes beyond light / dark / system.

alter table public.app_settings
  drop constraint if exists app_settings_theme_ck;

alter table public.app_settings
  add constraint app_settings_theme_ck
  check (
    app_theme in (
      'light',
      'dark',
      'system',
      'midnight',
      'ocean',
      'forest',
      'violet',
      'sunrise'
    )
  );

comment on column public.app_settings.app_theme is
  'UI theme: system, light, dark, midnight, ocean, forest, violet, or sunrise.';
