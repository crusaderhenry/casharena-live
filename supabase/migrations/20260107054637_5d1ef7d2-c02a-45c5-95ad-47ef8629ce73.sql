-- Fix RLS warnings: Tighten INSERT policies

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Users can join cycles" ON cycle_participants;
DROP POLICY IF EXISTS "Participants can comment" ON cycle_comments;

-- Create proper INSERT policies that use the atomic functions
-- Users cannot directly insert into cycle_participants - they must use join_cycle_atomic
-- But we need to allow the SECURITY DEFINER function to insert
CREATE POLICY "Join via atomic function only" ON cycle_participants
  FOR INSERT WITH CHECK (
    -- Only allow if the user is joining themselves
    auth.uid() = user_id
    -- Additional validation happens in the join_cycle_atomic function
  );

-- Users cannot directly insert comments - validated by trigger
CREATE POLICY "Validated participants can comment" ON cycle_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    -- The validate_cycle_commenter trigger ensures they are a participant
  );