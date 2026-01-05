-- Add user_type to profiles (real or mock)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'real' 
CHECK (user_type IN ('real', 'mock'));

-- Create mock_user_settings table for global admin controls
CREATE TABLE public.mock_user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  max_mock_users_per_game integer NOT NULL DEFAULT 10,
  activity_level text NOT NULL DEFAULT 'medium' CHECK (activity_level IN ('low', 'medium', 'high')),
  join_probability integer NOT NULL DEFAULT 50 CHECK (join_probability >= 0 AND join_probability <= 100),
  comment_frequency integer NOT NULL DEFAULT 50 CHECK (comment_frequency >= 0 AND comment_frequency <= 100),
  exclude_from_rewards boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default settings row
INSERT INTO public.mock_user_settings (id, enabled) 
VALUES ('00000000-0000-0000-0000-000000000001', false);

-- Create mock_users template table (pre-defined mock identities)
CREATE TABLE public.mock_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  avatar text NOT NULL DEFAULT '🎮',
  personality text DEFAULT 'neutral' CHECK (personality IN ('aggressive', 'passive', 'neutral', 'random')),
  is_active boolean NOT NULL DEFAULT true,
  virtual_wins integer NOT NULL DEFAULT 0,
  virtual_rank_points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create mock_game_participation table to track mock user joins per game
CREATE TABLE public.mock_game_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.fastest_finger_games(id) ON DELETE CASCADE,
  mock_user_id uuid NOT NULL REFERENCES public.mock_users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  comment_count integer NOT NULL DEFAULT 0,
  final_position integer,
  UNIQUE(game_id, mock_user_id)
);

-- Add real_pool_value to games (actual money vs display pool)
ALTER TABLE public.fastest_finger_games 
ADD COLUMN IF NOT EXISTS real_pool_value integer NOT NULL DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.mock_user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_game_participation ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mock_user_settings (admin only)
CREATE POLICY "Admins can view mock settings"
  ON public.mock_user_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update mock settings"
  ON public.mock_user_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for mock_users (admin only for management, service role for operations)
CREATE POLICY "Admins can manage mock users"
  ON public.mock_users FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for mock_game_participation
CREATE POLICY "Admins can view mock participation"
  ON public.mock_game_participation FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages mock participation"
  ON public.mock_game_participation FOR ALL
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_mock_game_participation_game_id ON public.mock_game_participation(game_id);
CREATE INDEX idx_profiles_user_type ON public.profiles(user_type);

-- Insert some default mock users
INSERT INTO public.mock_users (username, avatar, personality) VALUES
  ('SpeedKing', '⚡', 'aggressive'),
  ('LuckyCharm', '🍀', 'random'),
  ('FastFingers', '🖐️', 'aggressive'),
  ('QuickDraw', '🔥', 'neutral'),
  ('TypeMaster', '⌨️', 'passive'),
  ('RapidRex', '🦖', 'aggressive'),
  ('SwiftStar', '⭐', 'random'),
  ('BlazeRunner', '🔥', 'aggressive'),
  ('NimbleNinja', '🥷', 'passive'),
  ('FlashTyper', '💨', 'neutral'),
  ('ThunderThumb', '👍', 'aggressive'),
  ('SilentStrike', '🎯', 'passive'),
  ('VelocityVic', '🚀', 'random'),
  ('TurboTypist', '💪', 'aggressive'),
  ('AcePlayer', '🃏', 'neutral');

-- Update trigger for mock_user_settings
CREATE TRIGGER update_mock_user_settings_updated_at
  BEFORE UPDATE ON public.mock_user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();