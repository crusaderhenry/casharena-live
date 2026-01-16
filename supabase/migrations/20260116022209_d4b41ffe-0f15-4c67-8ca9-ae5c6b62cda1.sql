-- Allow public read access to basic mock user profile info (id, username, avatar)
-- This ensures mock users appear identical to real users in all public contexts
CREATE POLICY "Anyone can view mock user profiles" 
ON public.mock_users 
FOR SELECT 
USING (is_active = true);

-- Also create a secure RPC function for fetching mock user profiles (alternative lookup path)
CREATE OR REPLACE FUNCTION public.get_mock_user_profiles(user_ids uuid[])
RETURNS TABLE(id uuid, username text, avatar text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT mu.id, mu.username, mu.avatar
  FROM mock_users mu
  WHERE mu.id = ANY(user_ids) AND mu.is_active = true;
$$;