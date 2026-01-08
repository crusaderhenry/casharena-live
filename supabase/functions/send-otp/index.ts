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
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Email is required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete any existing unverified codes for this email
    await supabase
      .from('otp_codes')
      .delete()
      .eq('email', normalizedEmail)
      .eq('verified', false);

    // Store new OTP code
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        email: normalizedEmail,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Failed to store OTP:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email via ZeptoMail
    const zeptoApiKey = Deno.env.get('ZEPTOMAIL_API_KEY');
    const fromEmail = Deno.env.get('ZEPTOMAIL_FROM_EMAIL');
    const fromName = Deno.env.get('ZEPTOMAIL_FROM_NAME') || 'FortunesHQ';

    if (!zeptoApiKey || !fromEmail) {
      console.error('ZeptoMail credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailPayload = {
      from: {
        address: fromEmail,
        name: fromName,
      },
      to: [
        {
          email_address: {
            address: normalizedEmail,
          },
        },
      ],
      subject: `Your verification code: ${code}`,
      htmlbody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Your Verification Code</h1>
          <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            Enter this code to sign in to your account:
          </p>
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 20px;">
            <span style="color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px;">${code}</span>
          </div>
          <p style="color: #999; font-size: 14px;">
            This code expires in 10 minutes. If you didn't request this, you can ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            ${fromName}
          </p>
        </div>
      `,
    };

    const zeptoResponse = await fetch('https://api.zeptomail.com/v1.1/email', {
      method: 'POST',
      headers: {
        'Authorization': zeptoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!zeptoResponse.ok) {
      const errorText = await zeptoResponse.text();
      console.error('ZeptoMail error:', zeptoResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send verification email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`OTP sent successfully to ${normalizedEmail}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Verification code sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('send-otp error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
