-- Add leave_window_minutes setting (default 5 minutes before game start)
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS leave_window_minutes INTEGER NOT NULL DEFAULT 5;

-- Update the leave_cycle_atomic function to properly check time-based logic
CREATE OR REPLACE FUNCTION public.leave_cycle_atomic(p_cycle_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle RECORD;
  v_participant RECORD;
  v_seconds_until_live INTEGER;
  v_leave_window_minutes INTEGER;
  v_leave_window_seconds INTEGER;
BEGIN
  -- Get configurable leave window from platform settings
  SELECT COALESCE(leave_window_minutes, 5) INTO v_leave_window_minutes
  FROM platform_settings LIMIT 1;
  
  v_leave_window_seconds := v_leave_window_minutes * 60;

  -- Get cycle info with lock
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
  WHERE cycle_id = p_cycle_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Not a participant');
  END IF;

  -- Calculate seconds until live
  v_seconds_until_live := GREATEST(0, EXTRACT(EPOCH FROM (v_cycle.live_start_at - NOW()))::INTEGER);

  -- Check if game has already started (live or later)
  IF v_cycle.status IN ('live', 'ending', 'settled', 'cancelled') THEN
    RETURN json_build_object('success', false, 'error', 'Cannot leave a game that has already started');
  END IF;

  -- Check if within the leave window (e.g., less than 5 minutes before start)
  IF v_seconds_until_live < v_leave_window_seconds THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Cannot leave within ' || v_leave_window_minutes || ' minutes of game start',
      'seconds_until_live', v_seconds_until_live,
      'leave_window_minutes', v_leave_window_minutes
    );
  END IF;

  -- Spectators can leave without refund logic
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
    INSERT INTO wallet_transactions (user_id, type, amount, description, status, mode)
    VALUES (
      p_user_id, 
      'refund', 
      v_cycle.entry_fee, 
      'Left game before start', 
      'completed',
      CASE WHEN (SELECT test_mode FROM platform_settings LIMIT 1) THEN 'test' ELSE 'live' END
    );
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