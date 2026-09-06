-- Portal roles: Super Admin, Inspection Engineer, Accountant (remove Employee)

insert into public.portal_roles (slug, label, is_system, sort_order)
values
  ('admin', 'Super Admin', true, 0),
  ('inspection_engineer', 'Inspection Engineer', true, 1),
  ('accountant', 'Accountant', true, 2)
on conflict (slug) do update
set
  label = excluded.label,
  is_system = excluded.is_system,
  sort_order = excluded.sort_order;

-- Remap legacy Employee (staff) profiles before dropping the role
update public.profiles
set role = 'inspection_engineer',
    updated_at = now()
where role = 'staff';

delete from public.portal_roles
where slug = 'staff';
