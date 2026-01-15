-- Fix overly permissive RLS policies

-- 1. Drop and recreate the "Service role can manage games" policy for fastest_finger_games
-- This should only allow admins, not everyone
DROP POLICY IF EXISTS "Service role can manage games" ON fastest_finger_games;

-- Create proper admin-only management policy
CREATE POLICY "Admins can manage games" ON fastest_finger_games
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Drop and recreate the "Service role manages mock participation" policy
DROP POLICY IF EXISTS "Service role manages mock participation" ON mock_game_participation;

-- Create proper admin-only management policy
CREATE POLICY "Admins can manage mock participation" ON mock_game_participation
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));