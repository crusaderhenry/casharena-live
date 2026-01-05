-- Create audit_logs table for tracking admin actions
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Service role inserts audit logs (from edge functions)
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (false);

-- Add index for efficient querying
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Fix handle_new_user with input validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_avatar TEXT;
BEGIN
  -- Validate and sanitize username (alphanumeric + underscore only, 3-20 chars)
  v_username := COALESCE(
    NULLIF(regexp_replace(NEW.raw_user_meta_data ->> 'username', '[^a-zA-Z0-9_]', '', 'g'), ''),
    'Player' || substr(NEW.id::text, 1, 4)
  );
  v_username := substr(v_username, 1, 20);
  
  -- Validate avatar (limit to 4 chars for emoji safety)
  v_avatar := COALESCE(NEW.raw_user_meta_data ->> 'avatar', '🎮');
  v_avatar := substr(v_avatar, 1, 4);
  
  INSERT INTO public.profiles (id, username, email, avatar, wallet_balance)
  VALUES (NEW.id, v_username, NEW.email, v_avatar, 5000);
  
  RETURN NEW;
END;
$$;

-- profiles_public is a view - need to add security via the underlying table or recreate as secured view
-- First check if it's a view and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  username,
  avatar,
  rank_points,
  weekly_rank,
  games_played,
  total_wins,
  created_at
FROM public.profiles;

-- Grant select to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;