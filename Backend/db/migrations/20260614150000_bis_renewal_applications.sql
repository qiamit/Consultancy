-- BIS Renewal Applications: tracks full renewal workflow per project

create table if not exists public.bis_renewal_applications (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null references public.bis_projects (id) on delete cascade,
  client_id               uuid references public.clients (id) on delete set null,

  -- Application to BIS
  application_date        date,
  submission_mode         text,          -- 'Online (MANAK)', 'Offline', 'By Post'
  acknowledgment_number   text,
  bis_office              text,
  bis_desk_officer        text,

  -- Marking Fee
  marking_fee_rate        numeric(14, 2),  -- ₹ per unit
  marking_fee_quantity    numeric(14, 2),
  marking_fee_total       numeric(14, 2),
  fee_challan_number      text,
  fee_payment_date        date,
  fee_payment_mode        text,          -- 'Online', 'Demand Draft', 'Cheque'

  -- Test Reports
  test_report_number      text,
  test_report_date        date,
  test_lab_name           text,
  test_lab_nabl_no        text,
  test_result             text,          -- 'Conforming', 'Non-Conforming'

  -- Factory Inspection
  inspection_notice_date  date,
  inspection_date         date,
  bis_inspector_name      text,
  inspection_result       text,          -- 'Satisfactory', 'Unsatisfactory', 'Pending'

  -- Renewal Grant
  renewal_granted_date    date,
  new_validity_from       date,
  new_validity_to         date,

  -- Overall status & notes
  renewal_status          text not null default 'Initiated',
  notes                   text,

  created_by              uuid references auth.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.bis_renewal_applications enable row level security;

create policy "bis_renewal_applications_all"
  on public.bis_renewal_applications for all
  to authenticated
  using (true)
  with check (true);

create index if not exists bis_renewal_applications_project_id_idx
  on public.bis_renewal_applications (project_id);

comment on table public.bis_renewal_applications is
  'Tracks the full BIS license renewal workflow for each renewal project.';
