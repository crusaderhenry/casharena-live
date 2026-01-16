-- Add last comment tracking to cycle_participants
ALTER TABLE cycle_participants 
ADD COLUMN IF NOT EXISTS last_comment_at TIMESTAMPTZ;

-- Update trigger to enforce rate limiting
CREATE OR REPLACE FUNCTION public.validate_cycle_commenter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_participant BOOLEAN;
  v_cycle_status TEXT;
  v_last_comment TIMESTAMPTZ;
  v_min_interval INTERVAL := '750 milliseconds';
BEGIN
  -- Check cycle is live
  SELECT status INTO v_cycle_status FROM game_cycles WHERE id = NEW.cycle_id;
  IF v_cycle_status != 'live' THEN
    RAISE EXCEPTION 'Can only comment during live games';
  END IF;
  
  -- Check user is a participant (not spectator) and get last comment time
  SELECT cp.last_comment_at INTO v_last_comment
  FROM cycle_participants cp
  WHERE cp.cycle_id = NEW.cycle_id 
    AND cp.user_id = NEW.user_id 
    AND cp.is_spectator = false;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only participants can comment';
  END IF;
  
  -- Rate limit check - minimum interval between comments
  IF v_last_comment IS NOT NULL AND 
     (NOW() - v_last_comment) < v_min_interval THEN
    RAISE EXCEPTION 'Too fast! Wait a moment before commenting again';
  END IF;
  
  -- Update last comment time
  UPDATE cycle_participants 
  SET last_comment_at = NOW() 
  WHERE cycle_id = NEW.cycle_id AND user_id = NEW.user_id;
  
  RETURN NEW;
END;
$function$;