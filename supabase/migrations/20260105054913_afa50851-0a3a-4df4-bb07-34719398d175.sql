-- Add scheduling columns to fastest_finger_games table
ALTER TABLE public.fastest_finger_games 
ADD COLUMN IF NOT EXISTS go_live_type TEXT NOT NULL DEFAULT 'immediate',
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT NULL;

-- Add comment explaining the new columns
COMMENT ON COLUMN public.fastest_finger_games.go_live_type IS 'immediate or scheduled';
COMMENT ON COLUMN public.fastest_finger_games.scheduled_at IS 'When the game should go live (for scheduled games)';
COMMENT ON COLUMN public.fastest_finger_games.recurrence_type IS 'none, minutes, hours, daily, weekly, monthly';
COMMENT ON COLUMN public.fastest_finger_games.recurrence_interval IS 'Interval for recurrence (e.g., every 30 minutes, every 2 hours)';