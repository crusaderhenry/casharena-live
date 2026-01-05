-- Update get_leaderboard to include mock users
CREATE OR REPLACE FUNCTION public.get_leaderboard(limit_count integer DEFAULT 100)
 RETURNS TABLE(id uuid, username text, avatar text, rank_points integer, weekly_rank integer, games_played integer, total_wins integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Combine real users and mock users for leaderboard display
  SELECT * FROM (
    -- Real users from profiles
    SELECT 
      p.id,
      p.username,
      p.avatar,
      p.rank_points,
      p.weekly_rank,
      p.games_played,
      p.total_wins
    FROM profiles p
    WHERE p.user_type = 'real' OR p.user_type IS NULL
    
    UNION ALL
    
    -- Mock users (virtual stats)
    SELECT 
      m.id,
      m.username,
      m.avatar,
      m.virtual_rank_points as rank_points,
      NULL::integer as weekly_rank,
      0 as games_played,
      m.virtual_wins as total_wins
    FROM mock_users m
    WHERE m.is_active = true
  ) combined
  ORDER BY rank_points DESC
  LIMIT limit_count;
$function$;