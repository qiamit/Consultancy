-- Proforma invoices; optional link to finance_sales_orders.

create sequence if not exists public.finance_proforma_invoice_number_seq;

create or replace function public.set_finance_proforma_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if new.proforma_invoice_number is null or trim(new.proforma_invoice_number) = '' then
    new.proforma_invoice_number :=
      'PF-'
      || to_char(coalesce(new.proforma_date, (current_date at time zone 'utc')::date), 'YYYY')
      || '-'
      || lpad(nextval('public.finance_proforma_invoice_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create table public.finance_proforma_invoices (
  id uuid primary key default gen_random_uuid(),
  proforma_invoice_number text not null,
  proforma_date date not null default ((current_date at time zone 'utc')::date),
  valid_until_date date not null,
  client_id uuid references public.clients (id) on delete set null,
  sales_order_id uuid references public.finance_sales_orders (id) on delete set null,
  invoice_type text not null default 'service'
    constraint finance_proforma_invoices_type_ck check (invoice_type in ('service', 'supply')),
  proforma_status text not null default 'pending'
    constraint finance_proforma_invoices_status_check check (proforma_status in ('pending', 'accepted', 'cancelled')),
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
  constraint finance_proforma_invoices_number_nonempty check (trim(proforma_invoice_number) <> '')
);

create unique index finance_proforma_invoices_number_uidx
  on public.finance_proforma_invoices (proforma_invoice_number);

create index finance_proforma_invoices_client_id_idx on public.finance_proforma_invoices (client_id);
create index finance_proforma_invoices_sales_order_id_idx on public.finance_proforma_invoices (sales_order_id);
create index finance_proforma_invoices_proforma_date_idx on public.finance_proforma_invoices (proforma_date desc);
create index finance_proforma_invoices_created_at_idx on public.finance_proforma_invoices (created_at desc);

create trigger finance_proforma_invoices_set_number_bi
  before insert on public.finance_proforma_invoices
  for each row execute function public.set_finance_proforma_invoice_number();

create trigger finance_proforma_invoices_touch_u
  before update on public.finance_proforma_invoices
  for each row execute function public.touch_updated_at();

create table public.finance_proforma_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  proforma_invoice_id uuid not null references public.finance_proforma_invoices (id) on delete cascade,
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

create index finance_proforma_invoice_lines_pid_idx
  on public.finance_proforma_invoice_lines (proforma_invoice_id, sort_order);

alter table public.finance_proforma_invoices enable row level security;
alter table public.finance_proforma_invoice_lines enable row level security;

create policy "finance_proforma_invoices_all"
  on public.finance_proforma_invoices for all
  to authenticated
  using (true)
  with check (true);

create policy "finance_proforma_invoice_lines_all"
  on public.finance_proforma_invoice_lines for all
  to authenticated
  using (true)
  with check (true);

comment on table public.finance_proforma_invoices is
  'Proforma invoices; optional sales_order_id links to confirmed order.';
comment on column public.finance_proforma_invoices.sales_order_id is
  'Source sales order when created from Sales Order screen.';
comment on table public.finance_proforma_invoice_lines is
  'Line items for proforma invoices (same shape as sales order lines).';
