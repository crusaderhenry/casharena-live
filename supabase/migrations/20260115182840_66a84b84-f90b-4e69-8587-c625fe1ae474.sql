-- Function to upgrade a spectator to a full participant
-- This allows spectators to join as players if the game is still in 'opening' status
CREATE OR REPLACE FUNCTION upgrade_spectator_to_participant(p_cycle_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cycle RECORD;
  v_profile RECORD;
  v_existing RECORD;
  v_new_balance INTEGER;
  v_new_pool INTEGER;
  v_new_real_pool INTEGER;
  v_new_count INTEGER;
BEGIN
  -- Lock profile
  SELECT wallet_balance, user_type, status, wallet_locked INTO v_profile
  FROM profiles WHERE id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_profile.user_type = 'mock' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mock users cannot upgrade');
  END IF;
  
  -- Security: Check if user is suspended
  IF v_profile.status = 'suspended' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account suspended');
  END IF;
  
  -- Security: Check if wallet is locked
  IF v_profile.wallet_locked = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet is locked');
  END IF;
  
  -- Lock cycle
  SELECT * INTO v_cycle FROM game_cycles WHERE id = p_cycle_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  -- Can only upgrade during opening phase
  IF v_cycle.status != 'opening' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entries are closed. Can only upgrade during lobby phase.');
  END IF;
  
  -- Check if user is already a spectator
  SELECT id, is_spectator INTO v_existing
  FROM cycle_participants WHERE cycle_id = p_cycle_id AND user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant in this game');
  END IF;
  
  IF NOT v_existing.is_spectator THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already a full participant');
  END IF;
  
  -- Check balance and deduct entry fee
  IF v_profile.wallet_balance < v_cycle.entry_fee THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  v_new_balance := v_profile.wallet_balance - v_cycle.entry_fee;
  v_new_pool := v_cycle.pool_value + v_cycle.entry_fee;
  v_new_real_pool := COALESCE(v_cycle.real_pool_value, 0) + v_cycle.entry_fee;
  v_new_count := v_cycle.participant_count + 1;
  
  -- Deduct from wallet
  UPDATE profiles SET wallet_balance = v_new_balance WHERE id = p_user_id;
  
  -- Record transaction
  INSERT INTO wallet_transactions (user_id, type, amount, description, game_id)
  VALUES (p_user_id, 'entry', -v_cycle.entry_fee, 'Royal Rumble Entry (upgraded from spectator)', p_cycle_id);
  
  -- Update cycle pool and participant count
  UPDATE game_cycles 
  SET pool_value = v_new_pool, real_pool_value = v_new_real_pool, participant_count = v_new_count
  WHERE id = p_cycle_id;
  
  -- Upgrade spectator to full participant
  UPDATE cycle_participants 
  SET is_spectator = false
  WHERE id = v_existing.id;
  
  RETURN jsonb_build_object('success', true, 'upgraded', true, 'amount_paid', v_cycle.entry_fee);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;