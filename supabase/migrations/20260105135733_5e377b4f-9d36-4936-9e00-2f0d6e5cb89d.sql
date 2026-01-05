-- Add new game scheduling and automation fields to fastest_finger_games

-- auto_restart: When true, game recreates immediately after ending (no scheduled time needed)
-- This is different from recurrence which schedules at intervals
ALTER TABLE public.fastest_finger_games 
ADD COLUMN IF NOT EXISTS auto_restart boolean DEFAULT false;

-- fixed_daily_time: For daily games at a fixed time (e.g., '20:00' for 8pm daily)
-- When set with recurrence_type='daily', game will always schedule at this time
ALTER TABLE public.fastest_finger_games 
ADD COLUMN IF NOT EXISTS fixed_daily_time time without time zone DEFAULT NULL;

-- entry_wait_seconds: Configurable entry/lobby period before game goes live
-- This is the countdown shown to users while they can join
-- Defaults to 60 seconds if not specified
ALTER TABLE public.fastest_finger_games 
ADD COLUMN IF NOT EXISTS entry_wait_seconds integer DEFAULT 60;

-- min_participants_action: What to do if min participants not met
-- 'cancel' = refund and cancel game
-- 'reset' = reset countdown and keep waiting for more players
-- 'start_anyway' = start even with fewer players
ALTER TABLE public.fastest_finger_games 
ADD COLUMN IF NOT EXISTS min_participants_action text DEFAULT 'reset';

-- Add constraint for min_participants_action values
ALTER TABLE public.fastest_finger_games 
ADD CONSTRAINT valid_min_participants_action 
CHECK (min_participants_action IN ('cancel', 'reset', 'start_anyway'));

-- Add comment documentation
COMMENT ON COLUMN public.fastest_finger_games.auto_restart IS 'When true, game immediately reopens after ending (ignores recurrence settings)';
COMMENT ON COLUMN public.fastest_finger_games.fixed_daily_time IS 'For daily recurring games, the fixed time of day (HH:MM) when game should go live';
COMMENT ON COLUMN public.fastest_finger_games.entry_wait_seconds IS 'Duration of entry/lobby period in seconds before game goes live';
COMMENT ON COLUMN public.fastest_finger_games.min_participants_action IS 'Action when min participants not met: cancel, reset, or start_anyway';