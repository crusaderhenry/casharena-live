import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  template_key: string;
  user_id?: string;
  recipient_email?: string;
  data: Record<string, string | number>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const zeptoApiKey = Deno.env.get('ZEPTOMAIL_API_KEY');
    const zeptoFromEmail = Deno.env.get('ZEPTOMAIL_FROM_EMAIL') || 'noreply@fortuneshq.com';
    const zeptoFromName = Deno.env.get('ZEPTOMAIL_FROM_NAME') || 'FortunesHQ';

    if (!zeptoApiKey) {
      console.error('ZEPTOMAIL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { template_key, user_id, recipient_email, data }: EmailRequest = await req.json();

    console.log(`Sending transactional email: ${template_key} to user: ${user_id || recipient_email}`);

    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', template_key)
      .single();

    if (templateError || !template) {
      console.error('Template not found:', template_key, templateError);
      return new Response(
        JSON.stringify({ error: 'Email template not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if template is enabled
    if (!template.is_enabled) {
      console.log(`Template ${template_key} is disabled, skipping email`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Template disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recipient email
    let toEmail = recipient_email;
    let username = data.username || 'Player';

    if (user_id && !toEmail) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, username')
        .eq('id', user_id)
        .single();

      if (profileError || !profile) {
        console.error('User profile not found:', user_id, profileError);
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      toEmail = profile.email;
      username = profile.username || username;
    }

    if (!toEmail) {
      console.error('No recipient email provided');
      return new Response(
        JSON.stringify({ error: 'Recipient email required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add app_url to data if not provided
    const appUrl = data.app_url || 'https://fortuneshq.com';
    const enrichedData = {
      ...data,
      username,
      app_url: appUrl,
    };

    // Replace placeholders in subject and body
    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(enrichedData)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), String(value));
      body = body.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), String(value));
    }

    console.log(`Sending email to ${toEmail} with subject: ${subject}`);

    // Send email via ZeptoMail
    const zeptoResponse = await fetch('https://api.zeptomail.com/v1.1/email', {
      method: 'POST',
      headers: {
        'Authorization': zeptoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: {
          address: zeptoFromEmail,
          name: zeptoFromName,
        },
        to: [
          {
            email_address: {
              address: toEmail,
              name: username,
            },
          },
        ],
        subject: subject,
        htmlbody: body,
      }),
    });

    const zeptoResult = await zeptoResponse.json();
    console.log('ZeptoMail response:', JSON.stringify(zeptoResult));

    // Log the email send attempt
    const logStatus = zeptoResponse.ok ? 'sent' : 'failed';
    await supabase.from('email_logs').insert({
      template_key,
      user_id: user_id || null,
      recipient_email: toEmail,
      subject,
      status: logStatus,
      error_message: zeptoResponse.ok ? null : JSON.stringify(zeptoResult),
      sent_at: zeptoResponse.ok ? new Date().toISOString() : null,
    });

    if (!zeptoResponse.ok) {
      console.error('ZeptoMail error:', zeptoResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: zeptoResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Email sent successfully to ${toEmail}`);
    return new Response(
      JSON.stringify({ success: true, message_id: zeptoResult.request_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error:', message);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
