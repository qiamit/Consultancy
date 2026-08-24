-- Credit notes and customer statements.

create sequence if not exists public.finance_credit_note_number_seq;
create sequence if not exists public.finance_customer_statement_number_seq;

create or replace function public.set_finance_credit_note_number()
returns trigger
language plpgsql
as $$
begin
  if new.credit_note_number is null or trim(new.credit_note_number) = '' then
    new.credit_note_number :=
      'CN-'
      || to_char(coalesce(new.credit_note_date, (current_date at time zone 'utc')::date), 'YYYY')
      || '-'
      || lpad(nextval('public.finance_credit_note_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create or replace function public.set_finance_customer_statement_number()
returns trigger
language plpgsql
as $$
begin
  if new.customer_statement_number is null or trim(new.customer_statement_number) = '' then
    new.customer_statement_number :=
      'CS-'
      || to_char(coalesce(new.statement_date, (current_date at time zone 'utc')::date), 'YYYY')
      || '-'
      || lpad(nextval('public.finance_customer_statement_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create table public.finance_credit_notes (
  id uuid primary key default gen_random_uuid(),
  credit_note_number text not null,
  credit_note_date date not null default ((current_date at time zone 'utc')::date),
  valid_until_date date not null,
  client_id uuid references public.clients (id) on delete set null,
  quotation_id uuid references public.finance_quotations (id) on delete set null,
  sales_order_id uuid references public.finance_sales_orders (id) on delete set null,
  proforma_invoice_id uuid references public.finance_proforma_invoices (id) on delete set null,
  invoice_type text not null default 'service'
    constraint finance_credit_notes_type_ck check (invoice_type in ('service', 'supply')),
  credit_note_status text not null default 'pending'
    constraint finance_credit_notes_status_ck check (credit_note_status in ('pending', 'accepted', 'cancelled')),
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
  constraint finance_credit_notes_number_nonempty check (trim(credit_note_number) <> '')
);

create unique index finance_credit_notes_number_uidx
  on public.finance_credit_notes (credit_note_number);
create index finance_credit_notes_client_id_idx on public.finance_credit_notes (client_id);
create index finance_credit_notes_quotation_id_idx on public.finance_credit_notes (quotation_id);
create index finance_credit_notes_sales_order_id_idx on public.finance_credit_notes (sales_order_id);
create index finance_credit_notes_proforma_id_idx on public.finance_credit_notes (proforma_invoice_id);

create trigger finance_credit_notes_set_number_bi
  before insert on public.finance_credit_notes
  for each row execute function public.set_finance_credit_note_number();

create trigger finance_credit_notes_touch_u
  before update on public.finance_credit_notes
  for each row execute function public.touch_updated_at();

create table public.finance_credit_note_lines (
  id uuid primary key default gen_random_uuid(),
  credit_note_id uuid not null references public.finance_credit_notes (id) on delete cascade,
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

create index finance_credit_note_lines_cid_idx
  on public.finance_credit_note_lines (credit_note_id, sort_order);

create table public.finance_customer_statements (
  id uuid primary key default gen_random_uuid(),
  customer_statement_number text not null,
  statement_date date not null default ((current_date at time zone 'utc')::date),
  valid_until_date date not null,
  client_id uuid references public.clients (id) on delete set null,
  quotation_id uuid references public.finance_quotations (id) on delete set null,
  sales_order_id uuid references public.finance_sales_orders (id) on delete set null,
  proforma_invoice_id uuid references public.finance_proforma_invoices (id) on delete set null,
  invoice_type text not null default 'service'
    constraint finance_customer_statements_type_ck check (invoice_type in ('service', 'supply')),
  customer_statement_status text not null default 'pending'
    constraint finance_customer_statements_status_ck check (customer_statement_status in ('pending', 'accepted', 'cancelled')),
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
  constraint finance_customer_statements_number_nonempty check (trim(customer_statement_number) <> '')
);

create unique index finance_customer_statements_number_uidx
  on public.finance_customer_statements (customer_statement_number);
create index finance_customer_statements_client_id_idx on public.finance_customer_statements (client_id);
create index finance_customer_statements_quotation_id_idx on public.finance_customer_statements (quotation_id);
create index finance_customer_statements_sales_order_id_idx on public.finance_customer_statements (sales_order_id);
create index finance_customer_statements_proforma_id_idx on public.finance_customer_statements (proforma_invoice_id);

create trigger finance_customer_statements_set_number_bi
  before insert on public.finance_customer_statements
  for each row execute function public.set_finance_customer_statement_number();

create trigger finance_customer_statements_touch_u
  before update on public.finance_customer_statements
  for each row execute function public.touch_updated_at();

create table public.finance_customer_statement_lines (
  id uuid primary key default gen_random_uuid(),
  customer_statement_id uuid not null references public.finance_customer_statements (id) on delete cascade,
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

create index finance_customer_statement_lines_sid_idx
  on public.finance_customer_statement_lines (customer_statement_id, sort_order);

alter table public.finance_credit_notes enable row level security;
alter table public.finance_credit_note_lines enable row level security;
alter table public.finance_customer_statements enable row level security;
alter table public.finance_customer_statement_lines enable row level security;

create policy "finance_credit_notes_all"
  on public.finance_credit_notes for all
  to authenticated using (true) with check (true);
create policy "finance_credit_note_lines_all"
  on public.finance_credit_note_lines for all
  to authenticated using (true) with check (true);
create policy "finance_customer_statements_all"
  on public.finance_customer_statements for all
  to authenticated using (true) with check (true);
create policy "finance_customer_statement_lines_all"
  on public.finance_customer_statement_lines for all
  to authenticated using (true) with check (true);
