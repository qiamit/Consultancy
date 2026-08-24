-- Tax invoices; optional links to quotation, sales order, and proforma invoice.

create sequence if not exists public.finance_tax_invoice_number_seq;

create or replace function public.set_finance_tax_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if new.tax_invoice_number is null or trim(new.tax_invoice_number) = '' then
    new.tax_invoice_number :=
      'TI-'
      || to_char(coalesce(new.tax_date, (current_date at time zone 'utc')::date), 'YYYY')
      || '-'
      || lpad(nextval('public.finance_tax_invoice_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create table public.finance_tax_invoices (
  id uuid primary key default gen_random_uuid(),
  tax_invoice_number text not null,
  tax_date date not null default ((current_date at time zone 'utc')::date),
  valid_until_date date not null,
  client_id uuid references public.clients (id) on delete set null,
  quotation_id uuid references public.finance_quotations (id) on delete set null,
  sales_order_id uuid references public.finance_sales_orders (id) on delete set null,
  proforma_invoice_id uuid references public.finance_proforma_invoices (id) on delete set null,
  invoice_type text not null default 'service'
    constraint finance_tax_invoices_type_ck check (invoice_type in ('service', 'supply')),
  tax_status text not null default 'pending'
    constraint finance_tax_invoices_status_ck check (tax_status in ('pending', 'accepted', 'cancelled')),
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
  constraint finance_tax_invoices_number_nonempty check (trim(tax_invoice_number) <> '')
);

create unique index finance_tax_invoices_number_uidx
  on public.finance_tax_invoices (tax_invoice_number);

create index finance_tax_invoices_client_id_idx on public.finance_tax_invoices (client_id);
create index finance_tax_invoices_quotation_id_idx on public.finance_tax_invoices (quotation_id);
create index finance_tax_invoices_sales_order_id_idx on public.finance_tax_invoices (sales_order_id);
create index finance_tax_invoices_proforma_id_idx on public.finance_tax_invoices (proforma_invoice_id);
create index finance_tax_invoices_tax_date_idx on public.finance_tax_invoices (tax_date desc);
create index finance_tax_invoices_created_at_idx on public.finance_tax_invoices (created_at desc);

create trigger finance_tax_invoices_set_number_bi
  before insert on public.finance_tax_invoices
  for each row execute function public.set_finance_tax_invoice_number();

create trigger finance_tax_invoices_touch_u
  before update on public.finance_tax_invoices
  for each row execute function public.touch_updated_at();

create table public.finance_tax_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  tax_invoice_id uuid not null references public.finance_tax_invoices (id) on delete cascade,
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

create index finance_tax_invoice_lines_tid_idx
  on public.finance_tax_invoice_lines (tax_invoice_id, sort_order);

alter table public.finance_tax_invoices enable row level security;
alter table public.finance_tax_invoice_lines enable row level security;

create policy "finance_tax_invoices_all"
  on public.finance_tax_invoices for all
  to authenticated
  using (true)
  with check (true);

create policy "finance_tax_invoice_lines_all"
  on public.finance_tax_invoice_lines for all
  to authenticated
  using (true)
  with check (true);

comment on table public.finance_tax_invoices is
  'Tax invoices with optional source links to quotation/sales-order/proforma.';
comment on table public.finance_tax_invoice_lines is
  'Line items for tax invoices (same shape as quotation/sales/proforma lines).';
