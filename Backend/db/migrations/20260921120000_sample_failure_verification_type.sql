-- Allow Verification Sample as a sample failure type
alter table public.bis_sample_failure_replies
  drop constraint if exists bis_sample_failure_replies_sample_failure_type_check;

alter table public.bis_sample_failure_replies
  add constraint bis_sample_failure_replies_sample_failure_type_check
  check (
    sample_failure_type in (
      'pi_sample',
      'market_sample',
      'surveillance_sample',
      'verification_sample'
    )
  );
