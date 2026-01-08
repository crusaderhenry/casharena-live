-- Update handle_new_user to track welcome bonus
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_username TEXT;
  v_avatar TEXT;
  v_bonus_enabled BOOLEAN;
  v_bonus_amount INTEGER;
  v_bonus_limit INTEGER;
  v_current_bonus_count INTEGER;
  v_should_get_bonus BOOLEAN := false;
  v_initial_balance INTEGER := 0;
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
  
  -- Get welcome bonus settings
  SELECT 
    COALESCE(welcome_bonus_enabled, false),
    COALESCE(welcome_bonus_amount, 0),
    COALESCE(welcome_bonus_limit, 0)
  INTO v_bonus_enabled, v_bonus_amount, v_bonus_limit
  FROM platform_settings
  LIMIT 1;
  
  -- Check if we should give bonus
  IF v_bonus_enabled AND v_bonus_amount > 0 AND v_bonus_limit > 0 THEN
    SELECT COUNT(*) INTO v_current_bonus_count
    FROM profiles
    WHERE received_welcome_bonus = true;
    
    IF v_current_bonus_count < v_bonus_limit THEN
      v_should_get_bonus := true;
      v_initial_balance := v_bonus_amount;
    END IF;
  END IF;
  
  INSERT INTO public.profiles (
    id, 
    username, 
    email, 
    avatar, 
    wallet_balance,
    received_welcome_bonus,
    welcome_bonus_received_at
  )
  VALUES (
    NEW.id, 
    v_username, 
    NEW.email, 
    v_avatar, 
    v_initial_balance,
    v_should_get_bonus,
    CASE WHEN v_should_get_bonus THEN now() ELSE NULL END
  );
  
  -- Record bonus transaction if given
  IF v_should_get_bonus THEN
    INSERT INTO wallet_transactions (user_id, type, amount, description, status, mode)
    VALUES (NEW.id, 'bonus', v_initial_balance, 'Welcome Bonus', 'completed', 'live');
  END IF;
  
  RETURN NEW;
END;
$$;