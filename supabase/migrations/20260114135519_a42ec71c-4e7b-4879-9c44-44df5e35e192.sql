-- Phase 1: Add new columns to platform_settings
ALTER TABLE platform_settings
ADD COLUMN IF NOT EXISTS weekly_reward_1st INTEGER DEFAULT 50000,
ADD COLUMN IF NOT EXISTS weekly_reward_2nd INTEGER DEFAULT 30000,
ADD COLUMN IF NOT EXISTS weekly_reward_3rd INTEGER DEFAULT 20000,
ADD COLUMN IF NOT EXISTS min_deposit INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_deposit INTEGER DEFAULT 1000000,
ADD COLUMN IF NOT EXISTS min_withdrawal INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS deposit_quick_amounts INTEGER[] DEFAULT '{1000,2000,5000,10000}',
ADD COLUMN IF NOT EXISTS ending_soon_threshold_seconds INTEGER DEFAULT 300,
ADD COLUMN IF NOT EXISTS notification_poll_interval_ms INTEGER DEFAULT 30000,
ADD COLUMN IF NOT EXISTS prize_callout_milestones INTEGER[] DEFAULT '{5000,10000,20000,50000,100000,250000,500000}',
ADD COLUMN IF NOT EXISTS default_prize_distributions JSONB DEFAULT '{"top3":[0.5,0.3,0.2],"top5":[0.4,0.25,0.15,0.12,0.08],"top10":[0.3,0.2,0.15,0.1,0.08,0.06,0.04,0.03,0.02,0.02]}';

-- Create hosts table for voice configurations
CREATE TABLE IF NOT EXISTS public.hosts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  emoji TEXT DEFAULT '🎙️',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on hosts table
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read hosts (public config)
CREATE POLICY "Hosts are viewable by everyone" ON public.hosts
  FOR SELECT USING (true);

-- Only admins can modify hosts
CREATE POLICY "Admins can manage hosts" ON public.hosts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed default hosts
INSERT INTO public.hosts (id, name, voice_id, emoji, description) VALUES
  ('crusader', 'Crusader', 'I26ofw8CwlRZ6PZzoFaX', '🎙️', 'Bold African voice, high energy hype man'),
  ('mark', 'Mark', 'owJJWiaBmclx8j0HiPWm', '🎤', 'Smooth and confident host'),
  ('adaobi', 'Adaobi', 'V0PuVTP8lJVnkKNavZmc', '👸', 'Warm Igbo queen, encouraging and graceful energy')
ON CONFLICT (id) DO NOTHING;

-- Create badges table for badge configurations
CREATE TABLE IF NOT EXISTS public.badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('wins', 'games', 'earnings')),
  requirement_value INTEGER NOT NULL,
  color TEXT NOT NULL,
  bg_color TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on badges table
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read badges (public config)
CREATE POLICY "Badges are viewable by everyone" ON public.badges
  FOR SELECT USING (true);

-- Only admins can modify badges
CREATE POLICY "Admins can manage badges" ON public.badges
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed default badges
INSERT INTO public.badges (id, name, description, requirement_type, requirement_value, color, bg_color, icon_name, sort_order) VALUES
  ('first_win', 'First Blood', 'Win your first game', 'wins', 1, 'text-green-400', 'bg-green-500/20', 'Trophy', 1),
  ('winner_5', 'Rising Star', 'Win 5 games', 'wins', 5, 'text-blue-400', 'bg-blue-500/20', 'Star', 2),
  ('winner_10', 'Competitor', 'Win 10 games', 'wins', 10, 'text-purple-400', 'bg-purple-500/20', 'Medal', 3),
  ('winner_25', 'Champion', 'Win 25 games', 'wins', 25, 'text-yellow-400', 'bg-yellow-500/20', 'Crown', 4),
  ('winner_50', 'Legend', 'Win 50 games', 'wins', 50, 'text-orange-400', 'bg-orange-500/20', 'Flame', 5),
  ('winner_100', 'Unstoppable', 'Win 100 games', 'wins', 100, 'text-red-400', 'bg-red-500/20', 'Zap', 6),
  ('player_10', 'Rookie', 'Play 10 games', 'games', 10, 'text-slate-400', 'bg-slate-500/20', 'Gamepad2', 7),
  ('player_50', 'Regular', 'Play 50 games', 'games', 50, 'text-cyan-400', 'bg-cyan-500/20', 'Gamepad2', 8),
  ('player_100', 'Veteran', 'Play 100 games', 'games', 100, 'text-indigo-400', 'bg-indigo-500/20', 'Gamepad2', 9),
  ('player_500', 'Dedicated', 'Play 500 games', 'games', 500, 'text-pink-400', 'bg-pink-500/20', 'Target', 10)
ON CONFLICT (id) DO NOTHING;