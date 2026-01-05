-- Drop the security definer view and recreate without security definer
DROP VIEW IF EXISTS public.profiles_public;

-- Create view with SECURITY INVOKER (default, uses caller's permissions)
CREATE VIEW public.profiles_public 
WITH (security_invoker = true) AS
  SELECT id, username, avatar, rank_points, weekly_rank, 
         games_played, total_wins, created_at
  FROM public.profiles;

-- Grant access to the public view
GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- Drop the duplicate policy we created (the "Anyone can view basic profile info" is too permissive)
DROP POLICY IF EXISTS "Anyone can view basic profile info" ON public.profiles;