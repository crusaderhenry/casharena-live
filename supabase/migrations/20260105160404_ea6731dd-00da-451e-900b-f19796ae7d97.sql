-- Add unique constraint for game_id + user_id combination
ALTER TABLE public.voice_room_participants
ADD CONSTRAINT voice_room_participants_game_user_unique UNIQUE (game_id, user_id);