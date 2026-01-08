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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0f;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 28px; font-weight: 900; margin: 0;">
              <span style="color: #4fd1c5;">Fortunes</span><span style="color: #f59e0b;"> HQ</span> <span style="color: #f59e0b;">✨</span>
            </h1>
            <p style="color: #6b7280; font-size: 12px; margin-top: 5px;">Real Money | Real Players | Live Show</p>
          </div>
          <div style="background: #1a1a2e; border-radius: 16px; padding: 30px; border: 1px solid #2d2d44;">
            <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 15px 0;">Your Verification Code</h2>
            <p style="color: #9ca3af; font-size: 14px; margin-bottom: 25px;">
              Enter this code to sign in to your account:
            </p>
            <div style="background: linear-gradient(135deg, #4fd1c5 0%, #f59e0b 100%); border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 25px;">
              <span style="color: #0a0a0f; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</span>
            </div>
            <p style="color: #6b7280; font-size: 12px;">
              This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
            </p>
          </div>
          <p style="color: #4b5563; font-size: 11px; text-align: center; margin-top: 30px;">
            © ${new Date().getFullYear()} FortunesHQ. Play responsibly.
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
