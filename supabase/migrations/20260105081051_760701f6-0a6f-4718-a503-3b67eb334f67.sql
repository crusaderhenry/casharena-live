-- Game System Overhaul: Add platform_cut_percentage column that wasn't in the original schema
-- The other columns (lobby_opens_at, entry_cutoff_minutes) already exist based on DB functions

ALTER TABLE public.fastest_finger_games
ADD COLUMN IF NOT EXISTS platform_cut_percentage integer DEFAULT 10;