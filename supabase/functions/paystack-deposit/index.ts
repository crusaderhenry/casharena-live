import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DepositRequest {
  amount: number;
  email: string;
  callback_url?: string;
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

    const { amount, email, callback_url }: DepositRequest = await req.json();

    // Check platform settings for test mode and limits
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('test_mode, min_deposit, max_deposit')
      .single();

    const minDeposit = settings?.min_deposit ?? 100;
    const maxDeposit = settings?.max_deposit ?? 1000000; // Default 1M max

    // Validate amount
    if (!amount || amount < minDeposit) {
      return new Response(
        JSON.stringify({ error: `Minimum deposit is ₦${minDeposit.toLocaleString()}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amount > maxDeposit) {
      return new Response(
        JSON.stringify({ error: `Maximum deposit is ₦${maxDeposit.toLocaleString()}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isTestMode = settings?.test_mode ?? true;
    const mode = isTestMode ? 'test' : 'live';

    // Generate unique reference
    const reference = `dep_${user.id.substring(0, 8)}_${Date.now()}`;

    if (isTestMode) {
      // In test mode, simulate instant deposit
      console.log(`[TEST MODE] Simulating deposit of ₦${amount} for user ${user.id}`);

      // Credit wallet immediately
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      const newBalance = (profile?.wallet_balance || 0) + amount;

      await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      // Record transaction as completed
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'deposit',
        amount: amount,
        description: 'Test Mode Deposit',
        status: 'completed',
        reference: reference,
        mode: 'test',
      });

      // Log the simulated payment
      await supabase.from('payment_provider_logs').insert({
        provider: 'paystack',
        reference: reference,
        event_type: 'deposit_simulated',
        payload: { amount, email, test_mode: true },
        status: 'completed',
        user_id: user.id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          test_mode: true,
          message: 'Test deposit successful',
          new_balance: newBalance,
          reference: reference,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Live mode - Initialize Paystack transaction
    const paystackSecretKey = Deno.env.get('PAYSTACK_LIVE_SECRET_KEY');
    
    if (!paystackSecretKey) {
      console.error('PAYSTACK_LIVE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create pending transaction record
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount: amount,
      description: 'Deposit (pending)',
      status: 'pending',
      reference: reference,
      mode: 'live',
    });

    // Initialize Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        amount: amount * 100, // Paystack uses kobo
        reference: reference,
        callback_url: callback_url || `${req.headers.get('origin')}/wallet/callback`,
        metadata: {
          user_id: user.id,
          custom_fields: [
            {
              display_name: 'User ID',
              variable_name: 'user_id',
              value: user.id,
            },
          ],
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('Paystack initialization failed:', paystackData);
      
      // Update transaction to failed
      await supabase
        .from('wallet_transactions')
        .update({ status: 'failed', description: 'Deposit initialization failed' })
        .eq('reference', reference);

      return new Response(
        JSON.stringify({ error: paystackData.message || 'Payment initialization failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the initialization
    await supabase.from('payment_provider_logs').insert({
      provider: 'paystack',
      reference: reference,
      event_type: 'deposit_initialized',
      payload: { amount, email, paystack_response: paystackData },
      status: 'pending',
      user_id: user.id,
    });

    console.log(`Deposit initialized: ${reference} for ₦${amount}`);

    return new Response(
      JSON.stringify({
        success: true,
        test_mode: false,
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: reference,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Deposit error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
