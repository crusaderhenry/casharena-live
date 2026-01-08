-- Update the leave_cycle_atomic function to use valid transaction type
CREATE OR REPLACE FUNCTION public.leave_cycle_atomic(p_cycle_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle RECORD;
  v_participant RECORD;
  v_entry_fee INTEGER;
  v_result JSON;
BEGIN
  -- Get cycle info with lock
  SELECT * INTO v_cycle
  FROM game_cycles
  WHERE id = p_cycle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Cycle not found');
  END IF;

  -- Check if cycle is still in a leavable state (waiting or open, and at least 5 min before live)
  IF v_cycle.status NOT IN ('waiting', 'open') THEN
    RETURN json_build_object('success', false, 'error', 'Cannot leave a game that has already started');
  END IF;

  -- Check if at least 5 minutes before live
  IF v_cycle.live_start_at <= (NOW() + INTERVAL '5 minutes') THEN
    RETURN json_build_object('success', false, 'error', 'Cannot leave within 5 minutes of game start');
  END IF;

  -- Check if user is a participant
  SELECT * INTO v_participant
  FROM cycle_participants
  WHERE cycle_id = p_cycle_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'You are not in this game');
  END IF;

  -- Spectators can leave without refund logic
  IF v_participant.is_spectator THEN
    DELETE FROM cycle_participants WHERE id = v_participant.id;
    RETURN json_build_object('success', true, 'refunded', 0);
  END IF;

  -- Get entry fee for refund
  v_entry_fee := v_cycle.entry_fee;

  -- Remove participant
  DELETE FROM cycle_participants WHERE id = v_participant.id;

  -- Update cycle counts
  UPDATE game_cycles
  SET 
    participant_count = GREATEST(0, participant_count - 1),
    pool_value = GREATEST(0, pool_value - v_entry_fee),
    real_pool_value = GREATEST(0, real_pool_value - v_entry_fee)
  WHERE id = p_cycle_id;

  -- Refund user wallet
  UPDATE profiles
  SET wallet_balance = wallet_balance + v_entry_fee
  WHERE id = p_user_id;

  -- Record refund transaction using 'withdrawal' type (refund is withdrawal category)
  INSERT INTO wallet_transactions (user_id, type, amount, description, status, mode)
  VALUES (
    p_user_id, 
    'withdrawal', 
    v_entry_fee, 
    'Refund for leaving cycle ' || p_cycle_id::text,
    'completed',
    CASE WHEN (SELECT test_mode FROM platform_settings LIMIT 1) THEN 'test' ELSE 'live' END
  );

  RETURN json_build_object('success', true, 'refunded', v_entry_fee);
END;
$$;