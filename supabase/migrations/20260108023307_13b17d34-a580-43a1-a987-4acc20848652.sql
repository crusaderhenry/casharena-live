-- Add google_auth_enabled to platform_settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS google_auth_enabled boolean DEFAULT false;

COMMENT ON COLUMN public.platform_settings.google_auth_enabled IS 
  'Admin control to enable/disable Google OAuth for users';