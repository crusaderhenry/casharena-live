-- Add hot game thresholds to platform_settings
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS hot_game_threshold_live INTEGER NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS hot_game_threshold_opening INTEGER NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS enable_dramatic_sounds BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_cohost_banter BOOLEAN NOT NULL DEFAULT true;

-- Add comment to describe the columns
COMMENT ON COLUMN platform_settings.hot_game_threshold_live IS 'Minimum participants for a live game to be marked as HOT';
COMMENT ON COLUMN platform_settings.hot_game_threshold_opening IS 'Minimum participants for an opening game to be marked as HOT';
COMMENT ON COLUMN platform_settings.enable_dramatic_sounds IS 'Enable dramatic sound effects during game end freeze';
COMMENT ON COLUMN platform_settings.enable_cohost_banter IS 'Enable co-host banter and reactions when co-host is configured';