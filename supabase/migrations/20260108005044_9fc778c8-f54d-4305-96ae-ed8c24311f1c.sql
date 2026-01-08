-- Create function to leave a game cycle (only allowed 5+ minutes before live)
CREATE OR REPLACE FUNCTION public.leave_cycle_atomic(
  p_cycle_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle RECORD;
  v_participant RECORD;
  v_seconds_until_live INTEGER;
  v_min_leave_seconds INTEGER := 300; -- 5 minutes
BEGIN
  -- Get cycle info
  SELECT * INTO v_cycle 
  FROM game_cycles 
  WHERE id = p_cycle_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  -- Check if user is a participant
  SELECT * INTO v_participant
  FROM cycle_participants
  WHERE cycle_id = p_cycle_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Not a participant');
  END IF;
  
  -- Calculate seconds until live
  v_seconds_until_live := GREATEST(0, EXTRACT(EPOCH FROM (v_cycle.live_start_at - NOW()))::INTEGER);
  
  -- Check if leaving is allowed (must be 5+ minutes before live)
  IF v_seconds_until_live < v_min_leave_seconds THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Cannot leave less than 5 minutes before game starts',
      'seconds_until_live', v_seconds_until_live
    );
  END IF;
  
  -- Check if game is in a leavable state
  IF v_cycle.status NOT IN ('waiting', 'opening') THEN
    RETURN json_build_object('success', false, 'error', 'Cannot leave an active game');
  END IF;
  
  -- If spectator, just remove
  IF v_participant.is_spectator THEN
    DELETE FROM cycle_participants WHERE id = v_participant.id;
    RETURN json_build_object('success', true, 'refunded', false, 'was_spectator', true);
  END IF;
  
  -- Refund entry fee to player
  IF v_cycle.entry_fee > 0 THEN
    UPDATE profiles 
    SET wallet_balance = wallet_balance + v_cycle.entry_fee
    WHERE id = p_user_id;
    
    -- Log the refund transaction
    INSERT INTO wallet_transactions (user_id, type, amount, description, status)
    VALUES (p_user_id, 'refund', v_cycle.entry_fee, 'Left game before start', 'completed');
  END IF;
  
  -- Remove from participants
  DELETE FROM cycle_participants WHERE id = v_participant.id;
  
  -- Update cycle counts
  UPDATE game_cycles
  SET 
    participant_count = GREATEST(0, participant_count - 1),
    pool_value = GREATEST(0, pool_value - v_cycle.entry_fee),
    real_pool_value = GREATEST(0, real_pool_value - v_cycle.entry_fee)
  WHERE id = p_cycle_id;
  
  RETURN json_build_object(
    'success', true, 
    'refunded', v_cycle.entry_fee > 0,
    'amount', v_cycle.entry_fee,
    'was_spectator', false
  );
END;
$$;