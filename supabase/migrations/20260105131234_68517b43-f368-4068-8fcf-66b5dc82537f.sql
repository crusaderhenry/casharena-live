-- Add secondary host column for co-host functionality
ALTER TABLE platform_settings 
ADD COLUMN secondary_host text DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN platform_settings.secondary_host IS 'Optional secondary host for co-host mode. When set, both hosts interact during games.';