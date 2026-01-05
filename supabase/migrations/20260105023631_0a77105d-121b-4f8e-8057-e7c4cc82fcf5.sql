-- Drop the profiles_public view since we now use secure RPC functions for public data access
DROP VIEW IF EXISTS public.profiles_public;