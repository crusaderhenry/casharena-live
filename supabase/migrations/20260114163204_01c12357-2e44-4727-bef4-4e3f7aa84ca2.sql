-- Trigger to enforce min_participants >= winner_count on game_templates
CREATE OR REPLACE FUNCTION public.validate_template_min_participants()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure min_participants is at least winner_count (or 2 minimum)
  IF NEW.min_participants < GREATEST(NEW.winner_count, 2) THEN
    NEW.min_participants := GREATEST(NEW.winner_count, 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_min_participants_trigger ON game_templates;
CREATE TRIGGER enforce_min_participants_trigger
BEFORE INSERT OR UPDATE ON game_templates
FOR EACH ROW EXECUTE FUNCTION public.validate_template_min_participants();

-- Also fix existing templates that may have invalid min_participants
UPDATE game_templates
SET min_participants = GREATEST(winner_count, 2)
WHERE min_participants < GREATEST(winner_count, 2);