-- Allow pending inclusion / application rows to display the same CM/L as the
-- operative license. Uniqueness applies only to granted licenses (have a validity date).
-- Finished inclusion cases must clear cm_l_digits (see completeInclusionCase) so they
-- do not collide with the source license after getting a validity date.

alter table public.bis_projects
  drop constraint if exists bis_projects_cm_l_digits_uidx;

drop index if exists public.bis_projects_cm_l_digits_uidx;

create unique index bis_projects_cm_l_digits_uidx
  on public.bis_projects (cm_l_digits)
  where cm_l_digits is not null
    and license_validity_date is not null;
