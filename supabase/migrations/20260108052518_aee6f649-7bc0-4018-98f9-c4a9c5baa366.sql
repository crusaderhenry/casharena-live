-- Add welcome bonus banner message field
ALTER TABLE public.platform_settings 
ADD COLUMN welcome_bonus_message TEXT DEFAULT 'Get your welcome bonus! Limited spots available.';