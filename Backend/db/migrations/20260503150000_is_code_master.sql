-- IS Code Master: catalogue of Indian Standard codes, rates, and document uploads.

create table public.is_codes (
  id uuid primary key default gen_random_uuid(),
  is_number text not null,
  revision_year int not null,
  reaffirmation_year int,
  amendment_number text,
  aspect_of_is text not null default 'Specification',
  technical_committee text,
  product_manual_number text,
  is_code_title text not null,
  testing_charges numeric(14, 2) not null default 0,
  unit_of_is text not null,
  mmf_large_scale numeric(14, 2) not null default 0,
  mmf_medium_scale numeric(14, 2) not null default 0,
  mmf_small_scale numeric(14, 2) not null default 0,
  mmf_micro_scale numeric(14, 2) not null default 0,
  slab_1_quantity text not null default 'All Quantities',
  slab_1_rate numeric(14, 2) not null default 0,
  slab_2_quantity text not null default 'N/A',
  slab_2_rate numeric(14, 2) not null default 0,
  slab_3_quantity text not null default 'N/A',
  slab_3_rate numeric(14, 2) not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint is_codes_revision_year_range check (
    revision_year between 1000 and 9999
  ),
  constraint is_codes_reaffirmation_year_range check (
    reaffirmation_year is null
    or reaffirmation_year between 1000 and 9999
  ),
  constraint is_codes_number_revision_unique unique (is_number, revision_year)
);

create index is_codes_created_at_idx on public.is_codes (created_at desc);

create table public.is_code_files (
  id uuid primary key default gen_random_uuid(),
  is_code_id uuid not null references public.is_codes (id) on delete cascade,
  storage_path text not null,
  file_name text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index is_code_files_is_code_id_idx on public.is_code_files (is_code_id);

alter table public.is_codes enable row level security;
alter table public.is_code_files enable row level security;

create policy "is_codes_all"
  on public.is_codes for all
  to authenticated
  using (true)
  with check (true);

create policy "is_code_files_all"
  on public.is_code_files for all
  to authenticated
  using (true)
  with check (true);

-- Dedicated bucket for IS code PDFs / scans (private; signed URLs in app).
insert into storage.buckets (id, name, public)
values ('is_code_documents', 'is_code_documents', false)
on conflict (id) do nothing;

create policy "is_code_documents_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'is_code_documents');

create policy "is_code_documents_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'is_code_documents');

create policy "is_code_documents_update_authenticated"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'is_code_documents')
  with check (bucket_id = 'is_code_documents');

create policy "is_code_documents_delete_authenticated"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'is_code_documents');

-- App dropdown seeds (editable like Client Master).
insert into public.app_dropdown_options (option_key, value, label, sort_order) values
  ('is_code_master.aspect_of_is', 'Specification', null, 10),
  ('is_code_master.aspect_of_is', 'Test Method', null, 20),
  ('is_code_master.aspect_of_is', 'Code of Practice', null, 30),
  ('is_code_master.aspect_of_is', 'Others', null, 40),
  ('is_code_master.unit', 'Tonne', null, 10),
  ('is_code_master.unit', 'Pcs', null, 20),
  ('is_code_master.unit', 'Nos', null, 30),
  ('is_code_master.unit', 'Kilo Litre', null, 40),
  ('is_code_master.unit', 'Litre', null, 50),
  ('is_code_master.unit', 'Kg', null, 60)
on conflict (option_key, value) do nothing;

notify pgrst, 'reload schema';
