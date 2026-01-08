-- Add RLS policies for otp_codes table (currently has RLS enabled but no policies)
-- This table is managed by edge functions using service role key, so we need minimal policies

-- Allow service role to manage OTP codes (already works via service role)
-- No public access should be allowed - OTP operations go through edge functions

-- Create a policy that explicitly denies all access to anonymous/authenticated users
-- The edge functions use service role key which bypasses RLS
CREATE POLICY "No direct access to OTP codes"
  ON public.otp_codes
  FOR ALL
  USING (false)
  WITH CHECK (false);