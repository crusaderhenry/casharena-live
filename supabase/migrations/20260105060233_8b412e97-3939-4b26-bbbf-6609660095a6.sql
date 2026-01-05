-- Add RLS policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to view all transactions
CREATE POLICY "Admins can view all transactions"
ON public.wallet_transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add status column to profiles for user management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add suspended_at and suspended_reason columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspended_reason text;

-- Add last_active tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now();