-- Add ambient_music_style column to game_cycles
ALTER TABLE public.game_cycles 
ADD COLUMN ambient_music_style TEXT DEFAULT 'chill' CHECK (ambient_music_style IN ('chill', 'intense', 'retro', 'none'));