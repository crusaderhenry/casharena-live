-- =====================================================
-- ROYAL RUMBLE GAME SYSTEM REFOUNDATION
-- Phase 1: New Schema + Data Cleanup
-- =====================================================

-- 1. CREATE GAME TEMPLATES TABLE
CREATE TABLE public.game_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Royal Rumble',
  game_type TEXT NOT NULL DEFAULT 'royal_rumble',
  entry_mode TEXT NOT NULL DEFAULT 'paid' CHECK (entry_mode IN ('paid', 'sponsored')),
  entry_fee INTEGER NOT NULL DEFAULT 700,
  sponsored_prize_amount INTEGER DEFAULT 0,
  winner_count INTEGER NOT NULL DEFAULT 3 CHECK (winner_count >= 1 AND winner_count <= 10),
  prize_distribution NUMERIC[] NOT NULL DEFAULT ARRAY[50, 30, 20]::NUMERIC[],
  max_live_duration INTEGER NOT NULL DEFAULT 15, -- minutes
  comment_timer INTEGER NOT NULL DEFAULT 60, -- seconds
  open_entry_duration INTEGER NOT NULL DEFAULT 5, -- minutes
  waiting_duration INTEGER NOT NULL DEFAULT 30, -- seconds
  recurrence_type TEXT NOT NULL DEFAULT 'infinity' CHECK (recurrence_type IN ('infinity', 'daily', 'weekly', 'monthly', 'one_time')),
  recurrence_start_time TIME WITH TIME ZONE DEFAULT '08:00:00+01', -- WAT default
  allow_spectators BOOLEAN NOT NULL DEFAULT true,
  min_participants INTEGER NOT NULL DEFAULT 2,
  platform_cut_percentage NUMERIC NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add constraint: prize_distribution must have winner_count elements and sum to 100
CREATE OR REPLACE FUNCTION validate_prize_distribution()
RETURNS TRIGGER AS $$
BEGIN
  -- Check array length matches winner_count
  IF array_length(NEW.prize_distribution, 1) != NEW.winner_count THEN
    RAISE EXCEPTION 'prize_distribution must have exactly % elements', NEW.winner_count;
  END IF;
  
  -- Check sum equals 100
  IF (SELECT SUM(x) FROM unnest(NEW.prize_distribution) AS x) != 100 THEN
    RAISE EXCEPTION 'prize_distribution must sum to 100';
  END IF;
  
  -- Sponsored games must have entry_fee = 0
  IF NEW.entry_mode = 'sponsored' AND NEW.entry_fee != 0 THEN
    NEW.entry_fee := 0;
  END IF;
  
  -- Paid games must have entry_fee > 0
  IF NEW.entry_mode = 'paid' AND NEW.entry_fee <= 0 THEN
    RAISE EXCEPTION 'paid games must have entry_fee > 0';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_template_prize_distribution
  BEFORE INSERT OR UPDATE ON game_templates
  FOR EACH ROW EXECUTE FUNCTION validate_prize_distribution();

-- 2. CREATE GAME CYCLES TABLE (Instance of a template)
CREATE TABLE public.game_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES game_templates(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'opening', 'live', 'ending', 'ended', 'cancelled')),
  
  -- All times stored in WAT (UTC+1)
  entry_open_at TIMESTAMP WITH TIME ZONE NOT NULL,
  entry_close_at TIMESTAMP WITH TIME ZONE NOT NULL,
  live_start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  live_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_end_at TIMESTAMP WITH TIME ZONE,
  
  -- Computed from template at cycle creation
  entry_fee INTEGER NOT NULL DEFAULT 0,
  sponsored_prize_amount INTEGER DEFAULT 0,
  winner_count INTEGER NOT NULL DEFAULT 3,
  prize_distribution NUMERIC[] NOT NULL DEFAULT ARRAY[50, 30, 20]::NUMERIC[],
  comment_timer INTEGER NOT NULL DEFAULT 60,
  platform_cut_percentage NUMERIC NOT NULL DEFAULT 10,
  min_participants INTEGER NOT NULL DEFAULT 2,
  allow_spectators BOOLEAN NOT NULL DEFAULT true,
  
  -- Running state
  pool_value INTEGER NOT NULL DEFAULT 0,
  real_pool_value INTEGER NOT NULL DEFAULT 0,
  participant_count INTEGER NOT NULL DEFAULT 0,
  countdown INTEGER NOT NULL DEFAULT 60, -- current comment timer
  
  -- Settlement tracking
  settled_at TIMESTAMP WITH TIME ZONE,
  settlement_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. CREATE CYCLE PARTICIPANTS TABLE
CREATE TABLE public.cycle_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES game_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_spectator BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(cycle_id, user_id)
);

-- 4. CREATE CYCLE COMMENTS TABLE
CREATE TABLE public.cycle_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES game_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  server_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. CREATE CYCLE WINNERS TABLE
CREATE TABLE public.cycle_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES game_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 1),
  prize_amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cycle_id, position)
);

-- 6. ENABLE RLS ON ALL NEW TABLES
ALTER TABLE game_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_winners ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES FOR game_templates
-- Anyone can view active templates
CREATE POLICY "Anyone can view active templates" ON game_templates
  FOR SELECT USING (is_active = true);

-- Admins can manage templates
CREATE POLICY "Admins can manage templates" ON game_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 8. RLS POLICIES FOR game_cycles
-- Anyone can view non-cancelled cycles
CREATE POLICY "Anyone can view cycles" ON game_cycles
  FOR SELECT USING (status != 'cancelled');

-- System manages cycles (no direct user inserts)
CREATE POLICY "Admins can manage cycles" ON game_cycles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 9. RLS POLICIES FOR cycle_participants
-- Users can view all participants
CREATE POLICY "Anyone can view participants" ON cycle_participants
  FOR SELECT USING (true);

-- Users can join cycles (insert only)
CREATE POLICY "Users can join cycles" ON cycle_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. RLS POLICIES FOR cycle_comments
-- Anyone can view comments
CREATE POLICY "Anyone can view comments" ON cycle_comments
  FOR SELECT USING (true);

-- Participants can comment (checked via trigger)
CREATE POLICY "Participants can comment" ON cycle_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 11. RLS POLICIES FOR cycle_winners
-- Anyone can view winners
CREATE POLICY "Anyone can view winners" ON cycle_winners
  FOR SELECT USING (true);

-- 12. TRIGGER: Reset countdown on comment
CREATE OR REPLACE FUNCTION reset_cycle_countdown_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_cycle RECORD;
BEGIN
  SELECT id, comment_timer, status INTO v_cycle
  FROM game_cycles
  WHERE id = NEW.cycle_id AND status = 'live';
  
  IF v_cycle.id IS NOT NULL THEN
    UPDATE game_cycles
    SET countdown = v_cycle.comment_timer
    WHERE id = NEW.cycle_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_cycle_comment_reset_countdown
  AFTER INSERT ON cycle_comments
  FOR EACH ROW EXECUTE FUNCTION reset_cycle_countdown_on_comment();

-- 13. TRIGGER: Validate participant can comment
CREATE OR REPLACE FUNCTION validate_cycle_commenter()
RETURNS TRIGGER AS $$
DECLARE
  v_is_participant BOOLEAN;
  v_cycle_status TEXT;
BEGIN
  -- Check cycle is live
  SELECT status INTO v_cycle_status FROM game_cycles WHERE id = NEW.cycle_id;
  IF v_cycle_status != 'live' THEN
    RAISE EXCEPTION 'Can only comment during live games';
  END IF;
  
  -- Check user is a participant (not spectator)
  SELECT EXISTS (
    SELECT 1 FROM cycle_participants 
    WHERE cycle_id = NEW.cycle_id 
    AND user_id = NEW.user_id 
    AND is_spectator = false
  ) INTO v_is_participant;
  
  IF NOT v_is_participant THEN
    RAISE EXCEPTION 'Only participants can comment';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_commenter_before_insert
  BEFORE INSERT ON cycle_comments
  FOR EACH ROW EXECUTE FUNCTION validate_cycle_commenter();

-- 14. ATOMIC JOIN FUNCTION
CREATE OR REPLACE FUNCTION join_cycle_atomic(p_cycle_id UUID, p_user_id UUID, p_as_spectator BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cycle RECORD;
  v_profile RECORD;
  v_existing RECORD;
  v_new_balance INTEGER;
  v_new_pool INTEGER;
  v_new_real_pool INTEGER;
  v_new_count INTEGER;
BEGIN
  -- Lock profile
  SELECT wallet_balance, user_type INTO v_profile
  FROM profiles WHERE id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_profile.user_type = 'mock' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mock users cannot join');
  END IF;
  
  -- Lock cycle
  SELECT * INTO v_cycle FROM game_cycles WHERE id = p_cycle_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  -- Check status allows joining
  IF p_as_spectator THEN
    IF v_cycle.status NOT IN ('live', 'opening') OR NOT v_cycle.allow_spectators THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot spectate this game');
    END IF;
  ELSE
    IF v_cycle.status != 'opening' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Entries are closed');
    END IF;
  END IF;
  
  -- Check if already joined
  SELECT id, is_spectator INTO v_existing
  FROM cycle_participants WHERE cycle_id = p_cycle_id AND user_id = p_user_id FOR UPDATE;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'alreadyJoined', true, 'isSpectator', v_existing.is_spectator);
  END IF;
  
  -- If joining as player, check balance and deduct
  IF NOT p_as_spectator THEN
    IF v_profile.wallet_balance < v_cycle.entry_fee THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;
    
    v_new_balance := v_profile.wallet_balance - v_cycle.entry_fee;
    v_new_pool := v_cycle.pool_value + v_cycle.entry_fee;
    v_new_real_pool := COALESCE(v_cycle.real_pool_value, 0) + v_cycle.entry_fee;
    v_new_count := v_cycle.participant_count + 1;
    
    UPDATE profiles SET wallet_balance = v_new_balance WHERE id = p_user_id;
    
    INSERT INTO wallet_transactions (user_id, type, amount, description)
    VALUES (p_user_id, 'entry', -v_cycle.entry_fee, 'Royal Rumble Entry');
    
    UPDATE game_cycles 
    SET pool_value = v_new_pool, real_pool_value = v_new_real_pool, participant_count = v_new_count
    WHERE id = p_cycle_id;
  END IF;
  
  -- Add participant
  INSERT INTO cycle_participants (cycle_id, user_id, is_spectator)
  VALUES (p_cycle_id, p_user_id, p_as_spectator);
  
  RETURN jsonb_build_object('success', true, 'alreadyJoined', false, 'isSpectator', p_as_spectator);
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'alreadyJoined', true);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 15. GET ACTIVE CYCLES FUNCTION
CREATE OR REPLACE FUNCTION get_active_cycles()
RETURNS TABLE (
  id UUID,
  template_id UUID,
  template_name TEXT,
  game_type TEXT,
  status TEXT,
  entry_fee INTEGER,
  sponsored_prize_amount INTEGER,
  winner_count INTEGER,
  prize_distribution NUMERIC[],
  pool_value INTEGER,
  participant_count INTEGER,
  countdown INTEGER,
  allow_spectators BOOLEAN,
  entry_open_at TIMESTAMP WITH TIME ZONE,
  entry_close_at TIMESTAMP WITH TIME ZONE,
  live_start_at TIMESTAMP WITH TIME ZONE,
  live_end_at TIMESTAMP WITH TIME ZONE,
  seconds_until_opening INTEGER,
  seconds_until_live INTEGER,
  seconds_remaining INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    c.id,
    c.template_id,
    t.name AS template_name,
    t.game_type,
    c.status,
    c.entry_fee,
    c.sponsored_prize_amount,
    c.winner_count,
    c.prize_distribution,
    c.pool_value,
    c.participant_count,
    c.countdown,
    c.allow_spectators,
    c.entry_open_at,
    c.entry_close_at,
    c.live_start_at,
    c.live_end_at,
    GREATEST(0, EXTRACT(EPOCH FROM (c.entry_open_at - now()))::INTEGER) AS seconds_until_opening,
    GREATEST(0, EXTRACT(EPOCH FROM (c.live_start_at - now()))::INTEGER) AS seconds_until_live,
    GREATEST(0, EXTRACT(EPOCH FROM (c.live_end_at - now()))::INTEGER) AS seconds_remaining
  FROM game_cycles c
  JOIN game_templates t ON t.id = c.template_id
  WHERE c.status IN ('waiting', 'opening', 'live', 'ending')
  ORDER BY 
    CASE c.status 
      WHEN 'live' THEN 1 
      WHEN 'ending' THEN 2
      WHEN 'opening' THEN 3 
      WHEN 'waiting' THEN 4 
    END,
    c.live_start_at ASC;
$$;

-- 16. ENABLE REALTIME FOR NEW TABLES
ALTER PUBLICATION supabase_realtime ADD TABLE game_cycles;
ALTER PUBLICATION supabase_realtime ADD TABLE cycle_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE cycle_comments;

-- 17. INDEXES FOR PERFORMANCE
CREATE INDEX idx_game_cycles_status ON game_cycles(status);
CREATE INDEX idx_game_cycles_template ON game_cycles(template_id);
CREATE INDEX idx_cycle_participants_cycle ON cycle_participants(cycle_id);
CREATE INDEX idx_cycle_participants_user ON cycle_participants(user_id);
CREATE INDEX idx_cycle_comments_cycle ON cycle_comments(cycle_id);
CREATE INDEX idx_cycle_comments_timestamp ON cycle_comments(server_timestamp DESC);

-- 18. UPDATE TIMESTAMP TRIGGER FOR TEMPLATES
CREATE TRIGGER update_game_templates_updated_at
  BEFORE UPDATE ON game_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();