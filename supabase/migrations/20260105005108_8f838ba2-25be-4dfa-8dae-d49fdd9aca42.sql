-- Drop the policy that exposes all profile data to authenticated users
DROP POLICY IF EXISTS "Authenticated users can view public profile data" ON public.profiles;

-- Now profiles table only allows users to view their own full profile
-- Other users' data must come from profiles_public view