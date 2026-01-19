import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_EMAIL = 3; // Max OTPs per email per hour
const RATE_LIMIT_IP = 10; // Max OTPs per IP per hour
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

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
    
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limits
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

    // Check email rate limit
    const { count: emailCount } = await supabase
      .from('otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .gte('created_at', oneHourAgo);

    if ((emailCount || 0) >= RATE_LIMIT_EMAIL) {
      console.warn(`[send-otp] Rate limit exceeded for email: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many verification requests. Please try again in an hour.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check IP rate limit using payment_provider_logs as a general activity log
    // We'll track OTP sends in the logs table with event_type 'otp_sent'
    const { count: ipCount } = await supabase
      .from('payment_provider_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'otp_sent')
      .eq('ip_address', clientIP)
      .gte('created_at', oneHourAgo);

    if ((ipCount || 0) >= RATE_LIMIT_IP) {
      console.warn(`[send-otp] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many requests from this location. Please try again later.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

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

    // Log OTP send for IP rate limiting
    await supabase.from('payment_provider_logs').insert({
      provider: 'otp',
      reference: `otp_${Date.now()}`,
      event_type: 'otp_sent',
      ip_address: clientIP,
      payload: { email: normalizedEmail },
      status: 'sent',
    });

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
      subject: `FortunesHQ - Account Verification`,
      htmlbody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 28px; font-weight: 900; margin: 0; color: #1a1a2e;">
              FortunesHQ
            </h1>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 30px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1a1a2e; font-size: 20px; margin: 0 0 15px 0;">Verify Your Account</h2>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 25px;">
              Use the code below to complete your sign-in:
            </p>
            <div style="background: #1a1a2e; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 25px;">
              <span style="color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</span>
            </div>
            <p style="color: #9ca3af; font-size: 12px;">
              This code expires in 10 minutes. If you did not request this code, please ignore this email.
            </p>
          </div>
          <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 30px;">
            FortunesHQ ${new Date().getFullYear()}
          </p>
        </div>
      `,
      textbody: `FortunesHQ - Account Verification\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this code, please ignore this email.`,
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
