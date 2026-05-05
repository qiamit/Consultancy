-- Distinguish receipts (sales) vs payments / expenses (purchase) for finance modules.
alter table public.transactions
  add column if not exists payment_flow text not null default 'in'
  constraint transactions_payment_flow_ck check (payment_flow in ('in', 'out'));

comment on column public.transactions.payment_flow is
  'in = receipt (e.g. Payment IN); out = payment or expense (e.g. Payment OUT).';
