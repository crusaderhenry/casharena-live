-- Drop and recreate the get_leaderboard function to include mock users
CREATE OR REPLACE FUNCTION public.get_leaderboard(limit_count integer DEFAULT 100)
RETURNS TABLE(
  id uuid, 
  username text, 
  avatar text, 
  rank_points integer, 
  weekly_rank integer, 
  games_played integer, 
  total_wins integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH combined_users AS (
    -- Real users from profiles table
    SELECT 
      p.id,
      p.username,
      p.avatar,
      p.rank_points,
      p.weekly_rank,
      p.games_played,
      p.total_wins
    FROM profiles p
    WHERE p.status = 'active'
    
    UNION ALL
    
    -- Mock users from mock_users table
    SELECT 
      mu.id,
      mu.username,
      mu.avatar,
      mu.virtual_rank_points AS rank_points,
      NULL::integer AS weekly_rank,
      -- Count mock user's game participations
      COALESCE((
        SELECT COUNT(*)::integer 
        FROM cycle_participants cp 
        WHERE cp.user_id = mu.id AND cp.is_spectator = false
      ), 0) AS games_played,
      mu.virtual_wins AS total_wins
    FROM mock_users mu
    WHERE mu.is_active = true
  )
  SELECT 
    cu.id,
    cu.username,
    cu.avatar,
    cu.rank_points,
    cu.weekly_rank,
    cu.games_played,
    cu.total_wins
  FROM combined_users cu
  ORDER BY cu.rank_points DESC, cu.total_wins DESC
  LIMIT limit_count;
END;
$$;