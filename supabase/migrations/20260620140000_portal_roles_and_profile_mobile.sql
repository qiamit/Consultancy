-- Custom portal roles + mobile on profiles

create table if not exists public.portal_roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  is_system boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.portal_roles (slug, label, is_system, sort_order)
values
  ('admin', 'Super Admin', true, 0),
  ('staff', 'Employee', true, 1)
on conflict (slug) do nothing;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add column if not exists mobile text;

alter table public.portal_roles enable row level security;

create policy "portal_roles_select_authenticated"
  on public.portal_roles for select
  to authenticated
  using (true);

create policy "portal_roles_insert_admin"
  on public.portal_roles for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles admin
      where admin.id = auth.uid() and admin.role = 'admin'
    )
  );

create policy "portal_roles_delete_admin_custom"
  on public.portal_roles for delete
  to authenticated
  using (
    not is_system
    and exists (
      select 1 from public.profiles admin
      where admin.id = auth.uid() and admin.role = 'admin'
    )
  );

comment on table public.portal_roles is 'Assignable portal roles shown in User Management.';
comment on column public.profiles.mobile is 'Staff mobile number for portal user directory.';
