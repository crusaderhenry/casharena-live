import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
  account_number: string;
  bank_code: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { account_number, bank_code }: VerifyRequest = await req.json();

    if (!account_number || !bank_code) {
      return new Response(
        JSON.stringify({ error: 'Account number and bank code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (account_number.length !== 10) {
      return new Response(
        JSON.stringify({ error: 'Account number must be 10 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check platform test mode
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('test_mode')
      .single();

    const isTestMode = settings?.test_mode ?? true;

    if (isTestMode) {
      // In test mode, simulate account verification
      console.log(`[TEST MODE] Simulating account verification for ${account_number}`);
      
      // Generate a realistic mock name based on account number
      const mockNames = [
        'JOHN DOE SMITH',
        'JANE MARY JOHNSON',
        'DAVID OKONKWO EMMANUEL',
        'SARAH ADEYEMI GRACE',
        'MICHAEL CHUKWU PETER',
        'BLESSING FAVOUR NNEKA',
      ];
      const mockName = mockNames[parseInt(account_number.slice(-1)) % mockNames.length];

      return new Response(
        JSON.stringify({
          success: true,
          test_mode: true,
          account_name: mockName,
          account_number: account_number,
          bank_code: bank_code,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Live mode - Use Paystack Resolve Account API
    const paystackSecretKey = Deno.env.get('PAYSTACK_LIVE_SECRET_KEY');
    
    if (!paystackSecretKey) {
      console.error('PAYSTACK_LIVE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paystackResponse = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      {
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('Paystack resolve failed:', paystackData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: paystackData.message || 'Could not verify account' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Account verified: ${account_number} -> ${paystackData.data.account_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        test_mode: false,
        account_name: paystackData.data.account_name,
        account_number: paystackData.data.account_number,
        bank_id: paystackData.data.bank_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verify account error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
