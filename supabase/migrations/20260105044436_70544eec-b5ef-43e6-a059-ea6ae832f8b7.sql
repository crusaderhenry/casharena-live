-- Add KYC fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS kyc_verified boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS kyc_type text CHECK (kyc_type IN ('nin', 'bvn')),
ADD COLUMN IF NOT EXISTS kyc_first_name text,
ADD COLUMN IF NOT EXISTS kyc_last_name text,
ADD COLUMN IF NOT EXISTS kyc_verified_at timestamp with time zone;

-- Add index for faster KYC status lookups
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_verified ON public.profiles(kyc_verified);