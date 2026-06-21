-- Avoid infinite RLS recursion when admin policies query profiles from within profiles policies.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.current_user_is_admin() to authenticated;

drop policy if exists "profiles_select_admin_all" on public.profiles;
create policy "profiles_select_admin_all"
  on public.profiles for select
  to authenticated
  using (public.current_user_is_admin());

drop policy if exists "profiles_update_admin_all" on public.profiles;
create policy "profiles_update_admin_all"
  on public.profiles for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists "portal_roles_insert_admin" on public.portal_roles;
create policy "portal_roles_insert_admin"
  on public.portal_roles for insert
  to authenticated
  with check (public.current_user_is_admin());

drop policy if exists "portal_roles_delete_admin_custom" on public.portal_roles;
create policy "portal_roles_delete_admin_custom"
  on public.portal_roles for delete
  to authenticated
  using (not is_system and public.current_user_is_admin());
