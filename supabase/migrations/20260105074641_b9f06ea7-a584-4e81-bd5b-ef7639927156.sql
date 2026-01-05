-- Add new columns to fastest_finger_games for full lifecycle support
ALTER TABLE public.fastest_finger_games 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sponsored_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS entry_cutoff_minutes INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS lobby_opens_at TIMESTAMP WITH TIME ZONE;

-- Update status to include new states: draft, ending_soon, settled
-- First drop the existing check constraint if it exists
ALTER TABLE public.fastest_finger_games DROP CONSTRAINT IF EXISTS check_game_status;

-- Create updated status comment (PostgreSQL doesn't have ENUM modification, so we use convention)
COMMENT ON COLUMN public.fastest_finger_games.status IS 'Game status: draft, scheduled, open, live, ending_soon, ended, settled';

-- Create a function to calculate effective prize pool (includes sponsored amount)
CREATE OR REPLACE FUNCTION public.calculate_prize_pool(game_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(g.pool_value, 0) + 
    CASE WHEN g.is_sponsored = true THEN COALESCE(g.sponsored_amount, 0) ELSE 0 END
  FROM fastest_finger_games g
  WHERE g.id = game_id;
$$;

-- Create function to get game state with computed fields
CREATE OR REPLACE FUNCTION public.get_game_state(game_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  status TEXT,
  pool_value INTEGER,
  effective_prize_pool INTEGER,
  participant_count INTEGER,
  countdown INTEGER,
  entry_fee INTEGER,
  max_duration INTEGER,
  comment_timer INTEGER,
  payout_type TEXT,
  payout_distribution NUMERIC[],
  is_sponsored BOOLEAN,
  sponsored_amount INTEGER,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  lobby_opens_at TIMESTAMP WITH TIME ZONE,
  entry_cutoff_minutes INTEGER,
  visibility TEXT,
  recurrence_type TEXT,
  recurrence_interval INTEGER,
  seconds_until_open INTEGER,
  seconds_until_live INTEGER,
  seconds_remaining INTEGER,
  is_ending_soon BOOLEAN
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    g.id,
    g.name,
    g.description,
    g.status,
    g.pool_value,
    g.pool_value + CASE WHEN g.is_sponsored THEN COALESCE(g.sponsored_amount, 0) ELSE 0 END AS effective_prize_pool,
    g.participant_count,
    g.countdown,
    g.entry_fee,
    g.max_duration,
    g.comment_timer,
    g.payout_type,
    g.payout_distribution,
    g.is_sponsored,
    g.sponsored_amount,
    g.scheduled_at,
    g.start_time,
    g.end_time,
    g.lobby_opens_at,
    g.entry_cutoff_minutes,
    g.visibility,
    g.recurrence_type,
    g.recurrence_interval,
    -- Seconds until lobby opens (for scheduled games)
    CASE 
      WHEN g.status = 'scheduled' AND g.scheduled_at IS NOT NULL 
      THEN GREATEST(0, EXTRACT(EPOCH FROM (g.scheduled_at - now()))::INTEGER)
      ELSE 0 
    END AS seconds_until_open,
    -- Seconds until game goes live (for open games)
    CASE 
      WHEN g.status = 'open' AND g.start_time IS NOT NULL 
      THEN GREATEST(0, EXTRACT(EPOCH FROM (g.start_time + (g.countdown || ' seconds')::interval - now()))::INTEGER)
      ELSE 0 
    END AS seconds_until_live,
    -- Seconds remaining in game (for live games)
    CASE 
      WHEN g.status = 'live' AND g.start_time IS NOT NULL 
      THEN GREATEST(0, (g.max_duration * 60) - EXTRACT(EPOCH FROM (now() - g.start_time))::INTEGER)
      ELSE 0 
    END AS seconds_remaining,
    -- Is game in ending soon phase (last 5 minutes)
    CASE 
      WHEN g.status = 'live' AND g.start_time IS NOT NULL 
      THEN ((g.max_duration * 60) - EXTRACT(EPOCH FROM (now() - g.start_time))::INTEGER) <= 300
      ELSE false 
    END AS is_ending_soon
  FROM fastest_finger_games g
  WHERE g.id = game_id;
$$;

-- Create function to get all active games with computed state
CREATE OR REPLACE FUNCTION public.get_active_games()
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  status TEXT,
  pool_value INTEGER,
  effective_prize_pool INTEGER,
  participant_count INTEGER,
  countdown INTEGER,
  entry_fee INTEGER,
  max_duration INTEGER,
  comment_timer INTEGER,
  payout_type TEXT,
  payout_distribution NUMERIC[],
  is_sponsored BOOLEAN,
  sponsored_amount INTEGER,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  start_time TIMESTAMP WITH TIME ZONE,
  lobby_opens_at TIMESTAMP WITH TIME ZONE,
  entry_cutoff_minutes INTEGER,
  visibility TEXT,
  recurrence_type TEXT,
  recurrence_interval INTEGER,
  seconds_until_open INTEGER,
  seconds_until_live INTEGER,
  seconds_remaining INTEGER,
  is_ending_soon BOOLEAN
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    g.id,
    g.name,
    g.description,
    g.status,
    g.pool_value,
    g.pool_value + CASE WHEN g.is_sponsored THEN COALESCE(g.sponsored_amount, 0) ELSE 0 END AS effective_prize_pool,
    g.participant_count,
    g.countdown,
    g.entry_fee,
    g.max_duration,
    g.comment_timer,
    g.payout_type,
    g.payout_distribution,
    g.is_sponsored,
    g.sponsored_amount,
    g.scheduled_at,
    g.start_time,
    g.lobby_opens_at,
    g.entry_cutoff_minutes,
    g.visibility,
    g.recurrence_type,
    g.recurrence_interval,
    CASE 
      WHEN g.status = 'scheduled' AND g.scheduled_at IS NOT NULL 
      THEN GREATEST(0, EXTRACT(EPOCH FROM (g.scheduled_at - now()))::INTEGER)
      ELSE 0 
    END AS seconds_until_open,
    CASE 
      WHEN g.status = 'open' AND g.start_time IS NOT NULL 
      THEN GREATEST(0, EXTRACT(EPOCH FROM (g.start_time + (g.countdown || ' seconds')::interval - now()))::INTEGER)
      ELSE 0 
    END AS seconds_until_live,
    CASE 
      WHEN g.status = 'live' AND g.start_time IS NOT NULL 
      THEN GREATEST(0, (g.max_duration * 60) - EXTRACT(EPOCH FROM (now() - g.start_time))::INTEGER)
      ELSE 0 
    END AS seconds_remaining,
    CASE 
      WHEN g.status = 'live' AND g.start_time IS NOT NULL 
      THEN ((g.max_duration * 60) - EXTRACT(EPOCH FROM (now() - g.start_time))::INTEGER) <= 300
      ELSE false 
    END AS is_ending_soon
  FROM fastest_finger_games g
  WHERE g.status IN ('scheduled', 'open', 'live', 'ending_soon')
    AND g.visibility = 'public'
  ORDER BY 
    CASE g.status 
      WHEN 'live' THEN 1 
      WHEN 'ending_soon' THEN 2
      WHEN 'open' THEN 3 
      WHEN 'scheduled' THEN 4 
    END,
    g.scheduled_at ASC NULLS LAST,
    g.created_at DESC;
$$;