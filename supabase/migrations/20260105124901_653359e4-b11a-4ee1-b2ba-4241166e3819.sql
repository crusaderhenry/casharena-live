-- Add selected_host column to platform_settings for host selection
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS selected_host TEXT NOT NULL DEFAULT 'crusader';

-- Add comment for documentation
COMMENT ON COLUMN public.platform_settings.selected_host IS 'Selected game host: crusader or mark';