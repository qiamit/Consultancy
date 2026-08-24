-- Sales quotations (Quotation / Estimate) with line items and auto quotation number.

create sequence if not exists public.finance_quotation_number_seq;

create or replace function public.set_finance_quotation_number()
returns trigger
language plpgsql
as $$
begin
  if new.quotation_number is null or trim(new.quotation_number) = '' then
    new.quotation_number :=
      'QT-'
      || to_char(coalesce(new.quotation_date, (current_date at time zone 'utc')::date), 'YYYY')
      || '-'
      || lpad(nextval('public.finance_quotation_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.finance_quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null,
  quotation_date date not null default ((current_date at time zone 'utc')::date),
  expiry_date date not null,
  client_id uuid references public.clients (id) on delete set null,
  quotation_type text not null default 'service'
    constraint finance_quotations_type_ck check (quotation_type in ('service', 'supply')),
  notes text,
  terms_and_conditions text,
  scope_of_work text,
  bank_details text,
  seal_and_sign text,
  subtotal numeric(14, 2) not null default 0,
  tax_total numeric(14, 2) not null default 0,
  grand_total numeric(14, 2) not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_quotations_quotation_number_nonempty check (trim(quotation_number) <> '')
);

create unique index finance_quotations_quotation_number_uidx
  on public.finance_quotations (quotation_number);

create index finance_quotations_client_id_idx on public.finance_quotations (client_id);
create index finance_quotations_quotation_date_idx on public.finance_quotations (quotation_date desc);
create index finance_quotations_created_at_idx on public.finance_quotations (created_at desc);

create trigger finance_quotations_set_number_bi
  before insert on public.finance_quotations
  for each row execute function public.set_finance_quotation_number();

create trigger finance_quotations_touch_u
  before update on public.finance_quotations
  for each row execute function public.touch_updated_at();

create table public.finance_quotation_lines (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.finance_quotations (id) on delete cascade,
  sort_order int not null default 0,
  product_master_item_id uuid references public.product_master_items (id) on delete set null,
  item_description text,
  unit_of_item text,
  qty numeric(14, 4) not null default 1,
  unit_rate numeric(14, 2) not null default 0,
  gst_rate text,
  line_subtotal numeric(14, 2) not null default 0,
  line_tax numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index finance_quotation_lines_quotation_id_idx
  on public.finance_quotation_lines (quotation_id, sort_order);

alter table public.finance_quotations enable row level security;
alter table public.finance_quotation_lines enable row level security;

create policy "finance_quotations_all"
  on public.finance_quotations for all
  to authenticated
  using (true)
  with check (true);

create policy "finance_quotation_lines_all"
  on public.finance_quotation_lines for all
  to authenticated
  using (true)
  with check (true);

comment on table public.finance_quotations is
  'Sales quotations / estimates; quotation_number auto-generated when blank on insert.';
comment on table public.finance_quotation_lines is
  'Line items: products/services from product_master_items with qty, rate, GST, totals.';
