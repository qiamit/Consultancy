-- Product & Services master: inventory-style items (product vs service).

create table public.product_master_items (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'product' check (category in ('product', 'service')),
  item_code text not null,
  name text not null,
  description text,
  make text,
  unit_of_item text not null,
  hsn_code text,
  gst_rate text not null,
  mrp numeric(14, 2) not null default 0,
  sale_price numeric(14, 2) not null default 0,
  purchase_price numeric(14, 2),
  opening_stock text,
  low_stock_value text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_master_items_item_code_format check (
    char_length(item_code) between 2 and 40
    and (substring(item_code from 1 for 1) in ('P', 'S'))
  ),
  constraint product_master_items_hsn_ok check (
    hsn_code is null
    or trim(hsn_code) = ''
    or (
      trim(hsn_code) ~ '^[0-9]{1,8}$'
    )
  )
);

create unique index product_master_items_item_code_uidx
  on public.product_master_items (item_code);

create index product_master_items_created_at_idx
  on public.product_master_items (created_at desc);

alter table public.product_master_items enable row level security;

create policy "product_master_items_all"
  on public.product_master_items for all
  to authenticated
  using (true)
  with check (true);

insert into public.app_dropdown_options (option_key, value, label, sort_order) values
  ('product_master.unit', 'Tonne', null, 10),
  ('product_master.unit', 'Pcs', null, 20),
  ('product_master.unit', 'Nos', null, 30),
  ('product_master.gst_rate', '0%', null, 10),
  ('product_master.gst_rate', '5%', null, 20),
  ('product_master.gst_rate', '12%', null, 30),
  ('product_master.gst_rate', '18%', null, 40)
on conflict (option_key, value) do nothing;

notify pgrst, 'reload schema';
