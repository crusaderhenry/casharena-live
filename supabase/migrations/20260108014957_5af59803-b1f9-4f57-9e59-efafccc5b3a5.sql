-- Add mock user settings per game template and cycle
ALTER TABLE public.game_templates
ADD COLUMN IF NOT EXISTS mock_users_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS mock_users_min integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS mock_users_max integer NOT NULL DEFAULT 100,
ADD COLUMN IF NOT EXISTS sponsor_name text;

-- Add same fields to game_cycles
ALTER TABLE public.game_cycles
ADD COLUMN IF NOT EXISTS mock_users_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS mock_users_min integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS mock_users_max integer NOT NULL DEFAULT 100,
ADD COLUMN IF NOT EXISTS sponsor_name text;

-- Add comment to explain the fields
COMMENT ON COLUMN public.game_templates.mock_users_enabled IS 'Enable mock users for this game template';
COMMENT ON COLUMN public.game_templates.mock_users_min IS 'Minimum number of mock users to add when game opens';
COMMENT ON COLUMN public.game_templates.mock_users_max IS 'Maximum number of mock users allowed in this game';
COMMENT ON COLUMN public.game_templates.sponsor_name IS 'Name of the sponsor for sponsored games';
COMMENT ON COLUMN public.game_cycles.mock_users_enabled IS 'Enable mock users for this cycle (inherited from template)';
COMMENT ON COLUMN public.game_cycles.mock_users_min IS 'Minimum mock users for this cycle';
COMMENT ON COLUMN public.game_cycles.mock_users_max IS 'Maximum mock users for this cycle';
COMMENT ON COLUMN public.game_cycles.sponsor_name IS 'Name of sponsor for this cycle';