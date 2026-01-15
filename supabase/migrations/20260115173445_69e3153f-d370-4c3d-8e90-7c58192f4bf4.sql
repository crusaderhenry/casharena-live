-- Update join_cycle_atomic to check for suspended users and locked wallets
CREATE OR REPLACE FUNCTION public.join_cycle_atomic(p_cycle_id uuid, p_user_id uuid, p_as_spectator boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    RETURN jsonb_build_object('success', false, 'error', 'Mock users cannot join');
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
  
  -- Check status allows joining
  IF p_as_spectator THEN
    IF v_cycle.status NOT IN ('live', 'opening') OR NOT v_cycle.allow_spectators THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot spectate this game');
    END IF;
  ELSE
    IF v_cycle.status != 'opening' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Entries are closed');
    END IF;
  END IF;
  
  -- Check if already joined
  SELECT id, is_spectator INTO v_existing
  FROM cycle_participants WHERE cycle_id = p_cycle_id AND user_id = p_user_id FOR UPDATE;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'alreadyJoined', true, 'isSpectator', v_existing.is_spectator);
  END IF;
  
  -- If joining as player, check balance and deduct
  IF NOT p_as_spectator THEN
    IF v_profile.wallet_balance < v_cycle.entry_fee THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;
    
    v_new_balance := v_profile.wallet_balance - v_cycle.entry_fee;
    v_new_pool := v_cycle.pool_value + v_cycle.entry_fee;
    v_new_real_pool := COALESCE(v_cycle.real_pool_value, 0) + v_cycle.entry_fee;
    v_new_count := v_cycle.participant_count + 1;
    
    UPDATE profiles SET wallet_balance = v_new_balance WHERE id = p_user_id;
    
    INSERT INTO wallet_transactions (user_id, type, amount, description)
    VALUES (p_user_id, 'entry', -v_cycle.entry_fee, 'Royal Rumble Entry');
    
    UPDATE game_cycles 
    SET pool_value = v_new_pool, real_pool_value = v_new_real_pool, participant_count = v_new_count
    WHERE id = p_cycle_id;
  END IF;
  
  -- Add participant
  INSERT INTO cycle_participants (cycle_id, user_id, is_spectator)
  VALUES (p_cycle_id, p_user_id, p_as_spectator);
  
  RETURN jsonb_build_object('success', true, 'alreadyJoined', false, 'isSpectator', p_as_spectator);
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'alreadyJoined', true);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Also update join_game_atomic for the legacy games
CREATE OR REPLACE FUNCTION public.join_game_atomic(p_game_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_game RECORD;
  v_profile RECORD;
  v_existing RECORD;
  v_new_balance INTEGER;
  v_new_pool INTEGER;
  v_new_real_pool INTEGER;
  v_new_count INTEGER;
  v_time_remaining_ms BIGINT;
  v_ten_minutes_ms BIGINT := 10 * 60 * 1000;
BEGIN
  -- Lock the profile row to prevent concurrent modifications
  SELECT wallet_balance, user_type, status, wallet_locked INTO v_profile
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Mock users cannot join via this function (they use mock_game_participation)
  IF v_profile.user_type = 'mock' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mock users cannot join games');
  END IF;
  
  -- Security: Check if user is suspended
  IF v_profile.status = 'suspended' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account suspended');
  END IF;
  
  -- Security: Check if wallet is locked
  IF v_profile.wallet_locked = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet is locked');
  END IF;
  
  -- Lock the game row to prevent concurrent modifications
  SELECT id, status, entry_fee, pool_value, real_pool_value, participant_count, name, start_time, max_duration
  INTO v_game
  FROM fastest_finger_games
  WHERE id = p_game_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  -- Check if game is accepting participants
  IF v_game.status = 'open' THEN
    NULL;
  ELSIF v_game.status = 'live' AND v_game.start_time IS NOT NULL THEN
    v_time_remaining_ms := (EXTRACT(EPOCH FROM (v_game.start_time + (v_game.max_duration || ' minutes')::interval - now())) * 1000)::BIGINT;
    
    IF v_time_remaining_ms <= v_ten_minutes_ms THEN
      RETURN jsonb_build_object('success', false, 'error', 'Less than 10 minutes remaining, entries closed');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Game is not accepting participants');
  END IF;
  
  -- Check if user already joined
  SELECT id INTO v_existing
  FROM fastest_finger_participants
  WHERE game_id = p_game_id AND user_id = p_user_id
  FOR UPDATE;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'alreadyJoined', true);
  END IF;
  
  -- Check sufficient balance
  IF v_profile.wallet_balance < v_game.entry_fee THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Calculate new values
  v_new_balance := v_profile.wallet_balance - v_game.entry_fee;
  v_new_pool := v_game.pool_value + v_game.entry_fee;
  v_new_real_pool := COALESCE(v_game.real_pool_value, 0) + v_game.entry_fee;
  v_new_count := v_game.participant_count + 1;
  
  -- Deduct entry fee
  UPDATE profiles
  SET wallet_balance = v_new_balance
  WHERE id = p_user_id;
  
  -- Add participant
  INSERT INTO fastest_finger_participants (game_id, user_id)
  VALUES (p_game_id, p_user_id);
  
  -- Record transaction
  INSERT INTO wallet_transactions (user_id, type, amount, description, game_id)
  VALUES (p_user_id, 'entry', -v_game.entry_fee, COALESCE(v_game.name, 'Fastest Finger') || ' Entry', p_game_id);
  
  -- Update game pool, real_pool, and participant count
  UPDATE fastest_finger_games
  SET pool_value = v_new_pool, 
      real_pool_value = v_new_real_pool,
      participant_count = v_new_count
  WHERE id = p_game_id;
  
  RETURN jsonb_build_object('success', true, 'alreadyJoined', false);
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'alreadyJoined', true);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Create KYC attempts table for rate limiting
CREATE TABLE IF NOT EXISTS public.kyc_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kyc_type TEXT NOT NULL CHECK (kyc_type IN ('nin', 'bvn')),
  kyc_number TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kyc_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (used by edge function)
CREATE POLICY "Service role only" ON public.kyc_attempts FOR ALL USING (false);

-- Add index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_kyc_attempts_user_created ON public.kyc_attempts(user_id, created_at DESC);

-- Add index for duplicate checking
CREATE INDEX IF NOT EXISTS idx_kyc_attempts_number_success ON public.kyc_attempts(kyc_number, success) WHERE success = true;