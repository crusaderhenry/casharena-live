-- Enable realtime for fastest_finger_games table
ALTER TABLE public.fastest_finger_games REPLICA IDENTITY FULL;

-- Add to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'fastest_finger_games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fastest_finger_games;
  END IF;
END $$;