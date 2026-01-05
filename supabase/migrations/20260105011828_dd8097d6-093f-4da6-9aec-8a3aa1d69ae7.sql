-- Remove overly permissive policy that was accidentally created and then dropped
-- This should already be gone, but let's ensure it

-- The profiles table now only has:
-- 1. "Users can view own full profile" - users can only see their own data
-- 2. "Users can insert own profile" - handled by trigger
-- 3. "Users can update own profile" - users can update themselves

-- The leaderboard and public profile access is now handled by:
-- 1. get_leaderboard() - SECURITY DEFINER function for safe leaderboard access
-- 2. get_public_profile() - SECURITY DEFINER function for safe profile viewing

-- Drop the accidentally created permissive policy if it somehow exists
DROP POLICY IF EXISTS "Authenticated users can view public profile data" ON public.profiles;

-- Verify the view is properly secured
-- The profiles_public view uses SECURITY INVOKER which means it respects the caller's permissions
-- Combined with the restricted profiles policies, this means:
-- - Users can only see their own profile via direct profiles table access
-- - For leaderboard/public data, they must use the get_leaderboard() RPC function

-- Add explicit comment
COMMENT ON VIEW public.profiles_public IS 'Public profile view - use get_leaderboard() RPC for safe access';
COMMENT ON FUNCTION public.get_leaderboard(integer) IS 'Safe leaderboard access without email/wallet exposure';
COMMENT ON FUNCTION public.get_public_profile(uuid) IS 'Safe public profile access without email/wallet exposure';