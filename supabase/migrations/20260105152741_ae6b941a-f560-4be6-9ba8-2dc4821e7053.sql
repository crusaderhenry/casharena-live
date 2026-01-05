-- Add default game settings columns to platform_settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS default_entry_fee INTEGER NOT NULL DEFAULT 700,
ADD COLUMN IF NOT EXISTS default_max_duration INTEGER NOT NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS default_comment_timer INTEGER NOT NULL DEFAULT 60;