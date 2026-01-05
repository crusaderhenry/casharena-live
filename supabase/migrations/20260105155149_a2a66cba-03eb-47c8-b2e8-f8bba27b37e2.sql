-- Create a trigger to ensure total_wins never exceeds games_played
CREATE OR REPLACE FUNCTION public.validate_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure total_wins never exceeds games_played
  IF NEW.total_wins > NEW.games_played THEN
    NEW.total_wins := NEW.games_played;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to run before insert or update
DROP TRIGGER IF EXISTS validate_profile_stats_trigger ON public.profiles;
CREATE TRIGGER validate_profile_stats_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_stats();