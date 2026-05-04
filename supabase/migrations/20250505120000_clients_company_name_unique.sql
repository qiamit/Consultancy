-- Company name: one client per normalized name (trim + case-insensitive).

create unique index if not exists clients_company_name_lower_trim_unique
  on public.clients (lower(trim(company_name)))
  where company_name is not null and length(trim(company_name)) > 0;
