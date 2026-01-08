-- Add 'refund' to the allowed transaction types
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
  CHECK (type IN ('deposit', 'withdrawal', 'entry', 'win', 'platform_cut', 'rank_reward', 'refund'));