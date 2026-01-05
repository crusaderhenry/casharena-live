-- Allow opening games for entries
-- Existing constraint only allows: scheduled, live, ended
-- We need to support: scheduled, open, live, ended

ALTER TABLE public.fastest_finger_games
DROP CONSTRAINT IF EXISTS fastest_finger_games_status_check;

ALTER TABLE public.fastest_finger_games
ADD CONSTRAINT fastest_finger_games_status_check
CHECK (status = ANY (ARRAY['scheduled'::text, 'open'::text, 'live'::text, 'ended'::text]));