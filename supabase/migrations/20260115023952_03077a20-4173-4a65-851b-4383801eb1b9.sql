-- Create RPC function for public profile access (used by comments)
CREATE OR REPLACE FUNCTION public.get_public_profiles(user_ids uuid[])
RETURNS TABLE(id uuid, username text, avatar text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.avatar
  FROM profiles p
  WHERE p.id = ANY(user_ids);
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;

-- Add ip_address column to payment_provider_logs for rate limiting if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_provider_logs' 
    AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE payment_provider_logs ADD COLUMN ip_address TEXT;
  END IF;
END $$;

-- Create index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_created_at 
ON otp_codes(email, created_at);

CREATE INDEX IF NOT EXISTS idx_payment_logs_event_ip_created 
ON payment_provider_logs(event_type, ip_address, created_at);

-- Add comment length validation trigger for additional server-side protection
CREATE OR REPLACE FUNCTION public.validate_comment_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enforce max length
  IF length(NEW.content) > 500 THEN
    RAISE EXCEPTION 'Comment content exceeds maximum length of 500 characters';
  END IF;
  
  -- Enforce min length
  IF length(trim(NEW.content)) < 1 THEN
    RAISE EXCEPTION 'Comment content cannot be empty';
  END IF;
  
  -- Strip any HTML and trim
  NEW.content := trim(regexp_replace(NEW.content, '<[^>]*>', '', 'g'));
  
  RETURN NEW;
END;
$$;

-- Apply trigger to cycle_comments
DROP TRIGGER IF EXISTS validate_cycle_comment_content ON cycle_comments;
CREATE TRIGGER validate_cycle_comment_content
BEFORE INSERT OR UPDATE ON cycle_comments
FOR EACH ROW
EXECUTE FUNCTION public.validate_comment_content();

-- Apply same trigger to regular comments table
DROP TRIGGER IF EXISTS validate_comment_content_trigger ON comments;
CREATE TRIGGER validate_comment_content_trigger
BEFORE INSERT OR UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION public.validate_comment_content();