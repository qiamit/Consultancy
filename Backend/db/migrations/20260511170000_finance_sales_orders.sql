-- Sales orders linked optionally to finance_quotations; mirrors quotation line structure.

create sequence if not exists public.finance_sales_order_number_seq;

create or replace function public.set_finance_sales_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.sales_order_number is null or trim(new.sales_order_number) = '' then
    new.sales_order_number :=
      'SO-'
      || to_char(coalesce(new.order_date, (current_date at time zone 'utc')::date), 'YYYY')
      || '-'
      || lpad(nextval('public.finance_sales_order_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create table public.finance_sales_orders (
  id uuid primary key default gen_random_uuid(),
  sales_order_number text not null,
  order_date date not null default ((current_date at time zone 'utc')::date),
  expected_delivery_date date not null,
  client_id uuid references public.clients (id) on delete set null,
  quotation_id uuid references public.finance_quotations (id) on delete set null,
  order_type text not null default 'service'
    constraint finance_sales_orders_type_ck check (order_type in ('service', 'supply')),
  order_status text not null default 'pending'
    constraint finance_sales_orders_order_status_check check (order_status in ('pending', 'accepted', 'cancelled')),
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
  constraint finance_sales_orders_sales_order_number_nonempty check (trim(sales_order_number) <> '')
);

create unique index finance_sales_orders_sales_order_number_uidx
  on public.finance_sales_orders (sales_order_number);

create index finance_sales_orders_client_id_idx on public.finance_sales_orders (client_id);
create index finance_sales_orders_quotation_id_idx on public.finance_sales_orders (quotation_id);
create index finance_sales_orders_order_date_idx on public.finance_sales_orders (order_date desc);
create index finance_sales_orders_created_at_idx on public.finance_sales_orders (created_at desc);

create trigger finance_sales_orders_set_number_bi
  before insert on public.finance_sales_orders
  for each row execute function public.set_finance_sales_order_number();

create trigger finance_sales_orders_touch_u
  before update on public.finance_sales_orders
  for each row execute function public.touch_updated_at();

create table public.finance_sales_order_lines (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.finance_sales_orders (id) on delete cascade,
  sort_order int not null default 0,
  product_master_item_id uuid references public.product_master_items (id) on delete set null,
  item_description text,
  unit_of_item text,
  qty numeric(14, 4) not null default 1,
  unit_rate numeric(14, 2) not null default 0,
  line_discount text,
  gst_rate text,
  line_subtotal numeric(14, 2) not null default 0,
  line_tax numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index finance_sales_order_lines_sales_order_id_idx
  on public.finance_sales_order_lines (sales_order_id, sort_order);

alter table public.finance_sales_orders enable row level security;
alter table public.finance_sales_order_lines enable row level security;

create policy "finance_sales_orders_all"
  on public.finance_sales_orders for all
  to authenticated
  using (true)
  with check (true);

create policy "finance_sales_order_lines_all"
  on public.finance_sales_order_lines for all
  to authenticated
  using (true)
  with check (true);

comment on table public.finance_sales_orders is
  'Sales orders; optional quotation_id links to estimate; sales_order_number auto when blank.';
comment on column public.finance_sales_orders.quotation_id is
  'Source quotation when the order is created from Quotation / Estimate.';
comment on table public.finance_sales_order_lines is
  'Sales order line items (same shape as finance_quotation_lines).';
