-- Create storage bucket for game music files
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-music', 'game-music', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for game-music bucket
CREATE POLICY "Anyone can view game music"
ON storage.objects FOR SELECT
USING (bucket_id = 'game-music');

CREATE POLICY "Admins can upload game music"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'game-music' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update game music"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'game-music' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete game music"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'game-music' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Add music settings to fastest_finger_games table
ALTER TABLE public.fastest_finger_games
ADD COLUMN IF NOT EXISTS music_type text NOT NULL DEFAULT 'generated',
ADD COLUMN IF NOT EXISTS lobby_music_url text,
ADD COLUMN IF NOT EXISTS arena_music_url text,
ADD COLUMN IF NOT EXISTS tense_music_url text;