-- Drop the old check constraint
ALTER TABLE public.fastest_finger_games DROP CONSTRAINT IF EXISTS fastest_finger_games_status_check;

-- Add the new check constraint including 'cancelled' status
ALTER TABLE public.fastest_finger_games 
ADD CONSTRAINT fastest_finger_games_status_check 
CHECK (status IN ('scheduled', 'open', 'live', 'ended', 'ending_soon', 'cancelled'));