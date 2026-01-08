-- Drop and recreate the check constraint to include 'bonus' type
ALTER TABLE public.wallet_transactions 
DROP CONSTRAINT wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions
ADD CONSTRAINT wallet_transactions_type_check 
CHECK (type = ANY (ARRAY['deposit', 'withdrawal', 'entry', 'win', 'platform_cut', 'rank_reward', 'refund', 'bonus']));