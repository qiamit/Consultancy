-- Line-level discount as percent of gross (qty × unit_rate), applied before GST.

alter table public.finance_quotation_lines
  add column if not exists line_discount text;

comment on column public.finance_quotation_lines.line_discount is
  'Discount percent of line gross, e.g. 0% or 10%; applied before GST.';
