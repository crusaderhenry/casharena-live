-- Fix wallet_transactions type check constraint to allow withdrawals
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (
    type = ANY (
      ARRAY[
        'deposit'::text,
        'withdrawal'::text,
        'entry'::text,
        'win'::text,
        'platform_cut'::text,
        'rank_reward'::text
      ]
    )
  );