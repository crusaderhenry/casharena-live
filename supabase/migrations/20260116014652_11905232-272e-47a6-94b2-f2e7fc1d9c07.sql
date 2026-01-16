-- Create a function to get winner profiles including mock users
-- This is needed because mock_users table has admin-only RLS
CREATE OR REPLACE FUNCTION public.get_winner_profiles(user_ids uuid[])
RETURNS TABLE(
  id uuid, 
  username text, 
  avatar text, 
  total_wins integer, 
  games_played integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Get real profiles
  SELECT 
    p.id,
    p.username,
    p.avatar,
    p.total_wins,
    p.games_played
  FROM profiles p
  WHERE p.id = ANY(user_ids)
  
  UNION ALL
  
  -- Get mock users (for those not in profiles)
  SELECT 
    mu.id,
    mu.username,
    mu.avatar,
    mu.virtual_wins AS total_wins,
    mu.virtual_wins AS games_played -- Use virtual_wins as proxy
  FROM mock_users mu
  WHERE mu.id = ANY(user_ids)
    AND mu.id NOT IN (SELECT p2.id FROM profiles p2 WHERE p2.id = ANY(user_ids));
END;
$$;