-- Create storage bucket for caching generated lobby/arena music
-- (Used by backend function elevenlabs-music)
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-audio', 'game-audio', false)
ON CONFLICT (id) DO NOTHING;