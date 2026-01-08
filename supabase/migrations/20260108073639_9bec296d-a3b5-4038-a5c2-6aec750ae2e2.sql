-- Add winner screen duration setting
ALTER TABLE public.platform_settings 
ADD COLUMN winner_screen_duration integer NOT NULL DEFAULT 10;