-- Add default_entry_cutoff_minutes to platform_settings
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS default_entry_cutoff_minutes integer NOT NULL DEFAULT 10;

-- Update existing row with the default value
UPDATE public.platform_settings SET default_entry_cutoff_minutes = 10 WHERE default_entry_cutoff_minutes IS NULL;