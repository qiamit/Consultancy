-- Per-staff module access (super admin / admin role ignores this and gets full access)

alter table public.profiles
  add column if not exists module_access jsonb not null default '[]'::jsonb;

comment on column public.profiles.module_access is
  'Array of module keys staff may access. Admins have full access regardless.';
