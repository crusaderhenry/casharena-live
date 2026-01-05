-- Add missing columns to fastest_finger_games table
ALTER TABLE public.fastest_finger_games 
ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Fastest Finger',
ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'top3',
ADD COLUMN IF NOT EXISTS payout_distribution NUMERIC[] DEFAULT ARRAY[0.5, 0.3, 0.2],
ADD COLUMN IF NOT EXISTS comment_timer INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS min_participants INTEGER DEFAULT 3;

-- Add index for game queries
CREATE INDEX IF NOT EXISTS idx_fastest_finger_games_status ON public.fastest_finger_games(status);
CREATE INDEX IF NOT EXISTS idx_fastest_finger_games_created_at ON public.fastest_finger_games(created_at DESC);