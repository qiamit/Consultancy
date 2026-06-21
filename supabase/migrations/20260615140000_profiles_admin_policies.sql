-- Admin user management: admins can list and update all staff profiles

create policy "profiles_select_admin_all"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles admin
      where admin.id = auth.uid() and admin.role = 'admin'
    )
  );

create policy "profiles_update_admin_all"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles admin
      where admin.id = auth.uid() and admin.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles admin
      where admin.id = auth.uid() and admin.role = 'admin'
    )
  );
