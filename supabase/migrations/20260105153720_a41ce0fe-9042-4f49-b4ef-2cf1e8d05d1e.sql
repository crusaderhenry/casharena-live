-- Add maintenance_mode column to platform_settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT false;