-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT DEFAULT '🎮',
  wallet_balance INTEGER DEFAULT 5000 NOT NULL CHECK (wallet_balance >= 0),
  rank_points INTEGER DEFAULT 0 NOT NULL,
  weekly_rank INTEGER,
  games_played INTEGER DEFAULT 0 NOT NULL,
  total_wins INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create fastest_finger_games table
CREATE TABLE public.fastest_finger_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  entry_fee INTEGER NOT NULL DEFAULT 700,
  pool_value INTEGER NOT NULL DEFAULT 0,
  participant_count INTEGER NOT NULL DEFAULT 0,
  countdown INTEGER NOT NULL DEFAULT 60,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  max_duration INTEGER NOT NULL DEFAULT 20,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create fastest_finger_participants table
CREATE TABLE public.fastest_finger_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.fastest_finger_games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(game_id, user_id)
);

-- Create comments table for live game chat
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.fastest_finger_games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create winners table
CREATE TABLE public.winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.fastest_finger_games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 3),
  amount_won INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(game_id, position)
);

-- Create wallet_transactions table
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'entry', 'win', 'platform_cut', 'rank_reward')),
  amount INTEGER NOT NULL,
  description TEXT,
  game_id UUID REFERENCES public.fastest_finger_games(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create rank_history table
CREATE TABLE public.rank_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  game_id UUID REFERENCES public.fastest_finger_games(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create voice_room_participants table for signaling
CREATE TABLE public.voice_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.fastest_finger_games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_speaking BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(game_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fastest_finger_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fastest_finger_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_room_participants ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Games policies (public read, admin write via edge functions)
CREATE POLICY "Anyone can view games" ON public.fastest_finger_games FOR SELECT USING (true);
CREATE POLICY "Service role can manage games" ON public.fastest_finger_games FOR ALL USING (true);

-- Participants policies
CREATE POLICY "Anyone can view participants" ON public.fastest_finger_participants FOR SELECT USING (true);
CREATE POLICY "Users can join games" ON public.fastest_finger_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave games" ON public.fastest_finger_participants FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can post comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Winners policies
CREATE POLICY "Anyone can view winners" ON public.winners FOR SELECT USING (true);

-- Wallet transactions policies
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- Rank history policies
CREATE POLICY "Users can view own rank history" ON public.rank_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view leaderboard data" ON public.rank_history FOR SELECT USING (true);

-- Voice room policies
CREATE POLICY "Anyone can view voice room participants" ON public.voice_room_participants FOR SELECT USING (true);
CREATE POLICY "Users can manage own voice state" ON public.voice_room_participants FOR ALL USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, avatar, wallet_balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', 'Player' || substr(NEW.id::text, 1, 4)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'avatar', '🎮'),
    5000
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_comments_game_id ON public.comments(game_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at DESC);
CREATE INDEX idx_participants_game_id ON public.fastest_finger_participants(game_id);
CREATE INDEX idx_winners_game_id ON public.winners(game_id);
CREATE INDEX idx_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.wallet_transactions(created_at DESC);
CREATE INDEX idx_profiles_rank_points ON public.profiles(rank_points DESC);
CREATE INDEX idx_games_status ON public.fastest_finger_games(status);

-- Enable realtime for live game functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.fastest_finger_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fastest_finger_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.winners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_room_participants;