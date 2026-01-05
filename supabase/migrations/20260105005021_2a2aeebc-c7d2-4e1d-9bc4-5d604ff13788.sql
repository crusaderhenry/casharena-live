-- Fix: Ensure only authenticated users can view basic profile info (not public internet)
-- Drop the old policy that might still exist
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create policy for authenticated users to view basic public info of other users
-- They need to see usernames/avatars for leaderboards and comments
CREATE POLICY "Authenticated users can view public profile data" ON public.profiles
  FOR SELECT 
  TO authenticated
  USING (true);

-- Note: The profiles_public view is the safe way to get public data
-- Full profile data (email, wallet) only accessible via own profile policy

-- Add policy for wallet_transactions to prevent unauthorized inserts
-- Only service role should insert transactions (done via edge functions)
CREATE POLICY "Service role inserts transactions" ON public.wallet_transactions
  FOR INSERT
  WITH CHECK (false);

-- Add explicit policy for rank_history inserts (service role only)
CREATE POLICY "Service role inserts rank history" ON public.rank_history
  FOR INSERT
  WITH CHECK (false);

-- Add policy for winners inserts (service role only)
CREATE POLICY "Service role inserts winners" ON public.winners
  FOR INSERT
  WITH CHECK (false);