alter table public.finance_quotations
add column if not exists quotation_status text not null default 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'finance_quotations_quotation_status_check'
  ) then
    alter table public.finance_quotations
    add constraint finance_quotations_quotation_status_check
    check (quotation_status in ('pending', 'accepted', 'cancelled'));
  end if;
end
$$;

update public.finance_quotations
set quotation_status = 'pending'
where quotation_status is null
   or quotation_status not in ('pending', 'accepted', 'cancelled');
