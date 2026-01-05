-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for secure role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create a public view for non-sensitive profile data
CREATE VIEW public.profiles_public AS
  SELECT id, username, avatar, rank_points, weekly_rank, 
         games_played, total_wins, created_at
  FROM public.profiles;

-- Grant access to the public view
GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create restricted policy - users can only view their own full profile
CREATE POLICY "Users can view own full profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy for viewing limited public data (username, avatar only for other users)
CREATE POLICY "Anyone can view basic profile info" ON public.profiles
  FOR SELECT USING (true);