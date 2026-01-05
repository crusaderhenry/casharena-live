-- Fix profiles_public view security
-- Since it's a view with security_invoker, we need to ensure the underlying profiles table has proper policies

-- First, create a more restrictive policy for profiles that only exposes non-sensitive data to authenticated users
-- Drop the current "Users can view own full profile" if we want to add a separate public profile policy

-- Add policy allowing authenticated users to view basic public info (not email/wallet) of other users
CREATE POLICY "Authenticated users can view public profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- But we need to restrict WHAT columns are visible. Since RLS can't restrict columns,
-- we need to ensure profiles_public view only exposes safe columns (it already does)
-- The issue is profiles table still exposes email to authenticated users

-- Better approach: Revoke direct access and force use of profiles_public view
-- First, let's update the profiles_public view to have its own RLS

-- Enable RLS on the underlying query by using security_invoker
-- The view already has security_invoker=true, so it inherits the profiles table RLS

-- Add explicit policies for what the view should show
-- Since profiles_public is a view, we can't add RLS directly to it
-- Instead, we need to ensure only the view is used for public data

-- Create a function to get public profile data safely
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id uuid)
RETURNS TABLE (
  id uuid,
  username text,
  avatar text,
  rank_points integer,
  weekly_rank integer,
  games_played integer,
  total_wins integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.username,
    p.avatar,
    p.rank_points,
    p.weekly_rank,
    p.games_played,
    p.total_wins,
    p.created_at
  FROM profiles p
  WHERE p.id = profile_id;
$$;

-- Create a function to get leaderboard data safely (no emails, no wallet)
CREATE OR REPLACE FUNCTION public.get_leaderboard(limit_count integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  username text,
  avatar text,
  rank_points integer,
  weekly_rank integer,
  games_played integer,
  total_wins integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.username,
    p.avatar,
    p.rank_points,
    p.weekly_rank,
    p.games_played,
    p.total_wins
  FROM profiles p
  ORDER BY p.rank_points DESC
  LIMIT limit_count;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO anon;

-- Now remove the overly permissive policy we just created
DROP POLICY IF EXISTS "Authenticated users can view public profile info" ON public.profiles;