-- Add RLS policy to restrict comments to game participants only
-- This prevents users from commenting in games they haven't joined

-- First, drop any existing insert policy that might conflict
DROP POLICY IF EXISTS "Users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Participants can insert comments" ON public.comments;

-- Create new policy that checks participant status
CREATE POLICY "Participants can insert comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.fastest_finger_participants 
    WHERE fastest_finger_participants.game_id = comments.game_id 
    AND fastest_finger_participants.user_id = auth.uid()
  )
);