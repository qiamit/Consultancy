-- Add payment mode to transactions for Payment IN / OUT forms.
alter table public.transactions
  add column if not exists mode_of_payment text not null default 'bank';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_mode_of_payment_ck'
  ) then
    alter table public.transactions
      add constraint transactions_mode_of_payment_ck
      check (
        mode_of_payment in (
          'cash',
          'bank',
          'upi',
          'card',
          'cheque',
          'neft_rtgs',
          'other'
        )
      );
  end if;
end
$$;

comment on column public.transactions.mode_of_payment is
  'Payment mode: cash, bank, upi, card, cheque, neft_rtgs, other.';

