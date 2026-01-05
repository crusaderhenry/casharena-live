-- Add rank points configuration to platform_settings
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS rank_points_win_1st integer NOT NULL DEFAULT 100,
ADD COLUMN IF NOT EXISTS rank_points_win_2nd integer NOT NULL DEFAULT 60,
ADD COLUMN IF NOT EXISTS rank_points_win_3rd integer NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS rank_points_participation integer NOT NULL DEFAULT 5;