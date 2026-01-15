
-- First drop the FK constraint on wallet_transactions.game_id that references fastest_finger_games
ALTER TABLE public.wallet_transactions
DROP CONSTRAINT IF EXISTS wallet_transactions_game_id_fkey;

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS public.leave_cycle_atomic(uuid, uuid);
DROP FUNCTION IF EXISTS public.join_cycle_atomic(uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.upgrade_spectator_to_participant(uuid, uuid);

-- Recreate upgrade_spectator_to_participant WITHOUT game_id FK issues
CREATE FUNCTION public.upgrade_spectator_to_participant(p_cycle_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle RECORD;
  v_profile RECORD;
  v_existing RECORD;
  v_new_balance INTEGER;
  v_new_pool INTEGER;
  v_new_real_pool INTEGER;
  v_new_count INTEGER;
BEGIN
  SELECT wallet_balance, user_type, status, wallet_locked INTO v_profile
  FROM profiles WHERE id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_profile.user_type = 'mock' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mock users cannot upgrade');
  END IF;
  
  IF v_profile.status = 'suspended' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account suspended');
  END IF;
  
  IF v_profile.wallet_locked = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet is locked');
  END IF;
  
  SELECT * INTO v_cycle FROM game_cycles WHERE id = p_cycle_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  IF v_cycle.status != 'opening' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entries are closed. Can only upgrade during lobby phase.');
  END IF;
  
  SELECT id, is_spectator INTO v_existing
  FROM cycle_participants WHERE cycle_id = p_cycle_id AND user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant in this game');
  END IF;
  
  IF NOT v_existing.is_spectator THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already a full participant');
  END IF;
  
  IF v_profile.wallet_balance < v_cycle.entry_fee THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  v_new_balance := v_profile.wallet_balance - v_cycle.entry_fee;
  v_new_pool := v_cycle.pool_value + v_cycle.entry_fee;
  v_new_real_pool := COALESCE(v_cycle.real_pool_value, 0) + v_cycle.entry_fee;
  v_new_count := v_cycle.participant_count + 1;
  
  UPDATE profiles SET wallet_balance = v_new_balance WHERE id = p_user_id;
  
  -- Insert WITHOUT game_id to avoid FK constraint
  INSERT INTO wallet_transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'game_entry', -v_cycle.entry_fee, 'Royal Rumble Entry (upgraded) - Cycle: ' || p_cycle_id::text);
  
  UPDATE game_cycles 
  SET pool_value = v_new_pool, real_pool_value = v_new_real_pool, participant_count = v_new_count
  WHERE id = p_cycle_id;
  
  UPDATE cycle_participants SET is_spectator = false WHERE id = v_existing.id;
  
  RETURN jsonb_build_object('success', true, 'upgraded', true, 'amount_paid', v_cycle.entry_fee);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Recreate join_cycle_atomic WITHOUT game_id FK issues
CREATE FUNCTION public.join_cycle_atomic(p_cycle_id uuid, p_user_id uuid, p_as_spectator boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle RECORD;
  v_profile RECORD;
  v_existing RECORD;
  v_new_balance INTEGER;
  v_new_pool INTEGER;
  v_new_real_pool INTEGER;
  v_new_count INTEGER;
BEGIN
  SELECT wallet_balance, user_type, status, wallet_locked INTO v_profile
  FROM profiles WHERE id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_profile.user_type = 'mock' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mock users cannot join');
  END IF;
  
  IF v_profile.status = 'suspended' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account suspended');
  END IF;
  
  IF v_profile.wallet_locked = true AND NOT p_as_spectator THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet is locked');
  END IF;
  
  SELECT * INTO v_cycle FROM game_cycles WHERE id = p_cycle_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  IF p_as_spectator THEN
    IF v_cycle.status NOT IN ('live', 'opening') OR NOT v_cycle.allow_spectators THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot spectate this game');
    END IF;
  ELSE
    IF v_cycle.status != 'opening' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Entries are closed');
    END IF;
  END IF;
  
  SELECT id, is_spectator INTO v_existing
  FROM cycle_participants WHERE cycle_id = p_cycle_id AND user_id = p_user_id FOR UPDATE;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'alreadyJoined', true, 'isSpectator', v_existing.is_spectator);
  END IF;
  
  IF NOT p_as_spectator THEN
    IF v_profile.wallet_balance < v_cycle.entry_fee THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;
    
    v_new_balance := v_profile.wallet_balance - v_cycle.entry_fee;
    v_new_pool := v_cycle.pool_value + v_cycle.entry_fee;
    v_new_real_pool := COALESCE(v_cycle.real_pool_value, 0) + v_cycle.entry_fee;
    v_new_count := v_cycle.participant_count + 1;
    
    UPDATE profiles SET wallet_balance = v_new_balance WHERE id = p_user_id;
    
    -- Insert WITHOUT game_id to avoid FK constraint
    INSERT INTO wallet_transactions (user_id, type, amount, description)
    VALUES (p_user_id, 'game_entry', -v_cycle.entry_fee, 'Royal Rumble Entry - Cycle: ' || p_cycle_id::text);
    
    UPDATE game_cycles 
    SET pool_value = v_new_pool, real_pool_value = v_new_real_pool, participant_count = v_new_count
    WHERE id = p_cycle_id;
  END IF;
  
  INSERT INTO cycle_participants (cycle_id, user_id, is_spectator)
  VALUES (p_cycle_id, p_user_id, p_as_spectator);
  
  RETURN jsonb_build_object('success', true, 'alreadyJoined', false, 'isSpectator', p_as_spectator);
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'alreadyJoined', true);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Recreate leave_cycle_atomic with 10 second leave window
CREATE FUNCTION public.leave_cycle_atomic(p_cycle_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle RECORD;
  v_participant RECORD;
  v_seconds_until_live INTEGER;
  v_leave_window_seconds INTEGER := 10; -- 10 seconds before game start
BEGIN
  SELECT * INTO v_cycle FROM game_cycles WHERE id = p_cycle_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  v_seconds_until_live := GREATEST(0, EXTRACT(EPOCH FROM (v_cycle.live_start_at - NOW()))::INTEGER);
  
  IF v_cycle.status IN ('live', 'ending', 'settled', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot leave a game that has already started');
  END IF;
  
  IF v_seconds_until_live <= v_leave_window_seconds THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Cannot leave within 10 seconds of game start',
      'seconds_until_live', v_seconds_until_live
    );
  END IF;
  
  SELECT * INTO v_participant 
  FROM cycle_participants 
  WHERE cycle_id = p_cycle_id AND user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant');
  END IF;
  
  DELETE FROM cycle_participants WHERE id = v_participant.id;
  
  IF v_participant.is_spectator THEN
    RETURN jsonb_build_object('success', true, 'refunded', false, 'was_spectator', true);
  END IF;
  
  IF v_cycle.entry_fee > 0 THEN
    UPDATE profiles SET wallet_balance = wallet_balance + v_cycle.entry_fee WHERE id = p_user_id;
    
    INSERT INTO wallet_transactions (user_id, type, amount, description, status, mode)
    VALUES (
      p_user_id, 'refund', v_cycle.entry_fee, 'Left game before start - Cycle: ' || p_cycle_id::text, 
      'completed',
      CASE WHEN (SELECT test_mode FROM platform_settings LIMIT 1) THEN 'test' ELSE 'live' END
    );
  END IF;
  
  UPDATE game_cycles
  SET 
    participant_count = GREATEST(0, participant_count - 1),
    pool_value = GREATEST(0, pool_value - v_cycle.entry_fee),
    real_pool_value = GREATEST(0, real_pool_value - v_cycle.entry_fee)
  WHERE id = p_cycle_id;

  RETURN jsonb_build_object(
    'success', true, 
    'refunded', v_cycle.entry_fee > 0,
    'amount', v_cycle.entry_fee,
    'was_spectator', false,
    'seconds_until_live', v_seconds_until_live
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Add leave_window_seconds column to platform_settings if needed
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS leave_window_seconds INTEGER DEFAULT 10;
