
-- Fix: Add 'game_entry' to the allowed types in wallet_transactions
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
CHECK (type = ANY (ARRAY['deposit', 'withdrawal', 'entry', 'win', 'platform_cut', 'rank_reward', 'refund', 'bonus', 'game_entry']));
