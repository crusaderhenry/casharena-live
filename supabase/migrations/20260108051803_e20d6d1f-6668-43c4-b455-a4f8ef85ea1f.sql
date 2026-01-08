-- Add column to track if user received welcome bonus
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS received_welcome_bonus boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS welcome_bonus_received_at timestamp with time zone DEFAULT null;

-- Create index for efficient counting
CREATE INDEX IF NOT EXISTS idx_profiles_welcome_bonus ON public.profiles(received_welcome_bonus) WHERE received_welcome_bonus = true;