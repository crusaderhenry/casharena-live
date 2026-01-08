import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and code are required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Find the OTP code
    const { data: otpRecord, error: findError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('code', normalizedCode)
      .eq('verified', false)
      .single();

    if (findError || !otpRecord) {
      console.log('OTP not found for:', normalizedEmail);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid verification code' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Clean up expired code
      await supabase
        .from('otp_codes')
        .delete()
        .eq('id', otpRecord.id);

      return new Response(
        JSON.stringify({ success: false, error: 'Verification code has expired' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as verified
    await supabase
      .from('otp_codes')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    // Check if user exists in auth.users
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Failed to list users:', listError);
      return new Response(
        JSON.stringify({ error: 'Authentication service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingUser = existingUsers.users.find(u => u.email === normalizedEmail);
    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
      console.log('Existing user found:', userId);
    } else {
      // Create new user with a random password (they'll use OTP to login)
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          avatar: '🎮',
        },
      });

      if (createError || !newUser.user) {
        console.error('Failed to create user:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log('New user created:', userId);
    }

    // Generate a session for the user using signInWithPassword won't work
    // Instead, use generateLink and extract the access token
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    });

    if (linkError || !linkData) {
      console.error('Failed to generate link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The linkData contains the hashed_token we need
    const actionLink = linkData.properties.action_link;
    const url = new URL(actionLink);
    const tokenHash = url.searchParams.get('token');
    const type = url.searchParams.get('type') || 'magiclink';

    // Check if user has a proper username set (not default patterns)
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, email')
      .eq('id', userId)
      .single();

    const emailPrefix = profile?.email?.split('@')[0];
    const hasUsername = profile?.username && 
      !profile.username.startsWith('Player') &&
      !profile.username.startsWith('user_') &&
      profile.username !== profile.email &&
      profile.username !== emailPrefix;

    // Clean up used OTP
    await supabase
      .from('otp_codes')
      .delete()
      .eq('id', otpRecord.id);

    console.log(`OTP verified successfully for ${normalizedEmail}, isNewUser: ${isNewUser}, hasUsername: ${hasUsername}`);

    return new Response(
      JSON.stringify({
        success: true,
        tokenHash,
        type,
        isNewUser,
        hasUsername,
        userId,
        email: normalizedEmail,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('verify-otp error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
