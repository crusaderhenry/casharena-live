-- Create a trigger to reset game countdown when a new comment is posted
CREATE OR REPLACE FUNCTION public.reset_game_countdown_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  game_record RECORD;
BEGIN
  -- Get the game's comment_timer setting
  SELECT id, comment_timer, status INTO game_record
  FROM public.fastest_finger_games
  WHERE id = NEW.game_id AND status = 'live';
  
  IF game_record.id IS NOT NULL THEN
    -- Reset countdown to the comment_timer value
    UPDATE public.fastest_finger_games
    SET countdown = COALESCE(game_record.comment_timer, 60)
    WHERE id = NEW.game_id;
    
    RAISE LOG 'Reset countdown for game % to %', NEW.game_id, game_record.comment_timer;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_reset_countdown_on_comment ON public.comments;
CREATE TRIGGER trigger_reset_countdown_on_comment
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.reset_game_countdown_on_comment();

-- Create a function to tick down the countdown (called by cron every second or by client polling)
CREATE OR REPLACE FUNCTION public.tick_game_countdowns()
RETURNS TABLE(game_id uuid, new_countdown integer, game_ended boolean) AS $$
DECLARE
  game_record RECORD;
BEGIN
  FOR game_record IN 
    SELECT g.id, g.countdown, g.start_time, g.max_duration, g.comment_timer
    FROM public.fastest_finger_games g
    WHERE g.status = 'live' AND g.countdown > 0
  LOOP
    -- Decrement countdown
    UPDATE public.fastest_finger_games
    SET countdown = countdown - 1
    WHERE id = game_record.id;
    
    -- Return the result
    game_id := game_record.id;
    new_countdown := game_record.countdown - 1;
    game_ended := (game_record.countdown - 1) <= 0;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;