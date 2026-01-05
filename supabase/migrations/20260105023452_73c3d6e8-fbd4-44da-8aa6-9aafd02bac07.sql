-- Create an atomic function for joining games to prevent race conditions
CREATE OR REPLACE FUNCTION public.join_game_atomic(
  p_game_id UUID,
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game RECORD;
  v_profile RECORD;
  v_existing RECORD;
  v_new_balance INTEGER;
  v_new_pool INTEGER;
  v_new_count INTEGER;
BEGIN
  -- Lock the profile row to prevent concurrent modifications
  SELECT wallet_balance INTO v_profile
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Lock the game row to prevent concurrent modifications
  SELECT id, status, entry_fee, pool_value, participant_count, name
  INTO v_game
  FROM fastest_finger_games
  WHERE id = p_game_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  -- Check if game is accepting participants
  IF v_game.status NOT IN ('scheduled', 'live') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game is not accepting participants');
  END IF;
  
  -- Check if user already joined (with lock)
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
  
  -- Update game pool and participant count
  UPDATE fastest_finger_games
  SET pool_value = v_new_pool, participant_count = v_new_count
  WHERE id = p_game_id;
  
  RETURN jsonb_build_object('success', true, 'alreadyJoined', false);
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition where participant was inserted between check and insert
    RETURN jsonb_build_object('success', true, 'alreadyJoined', true);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;