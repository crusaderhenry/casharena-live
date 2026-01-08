import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WithdrawRequest {
  amount: number;
  bank_code: string;
  account_number: string;
  account_name: string;
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

    const { amount, bank_code, account_number, account_name }: WithdrawRequest = await req.json();

    // Validate request
    if (!amount || amount < 100) {
      return new Response(
        JSON.stringify({ error: 'Minimum withdrawal is ₦100' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bank_code || !account_number || !account_name) {
      return new Response(
        JSON.stringify({ error: 'Bank details are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check platform test mode
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('test_mode')
      .single();

    const isTestMode = settings?.test_mode ?? true;

    // Get user profile and check balance/lock status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, wallet_locked')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.wallet_locked) {
      return new Response(
        JSON.stringify({ error: 'Wallet is locked. A transaction is in progress.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.wallet_balance < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique reference
    const reference = `wth_${user.id.substring(0, 8)}_${Date.now()}`;

    if (isTestMode) {
      // In test mode, simulate instant withdrawal
      console.log(`[TEST MODE] Simulating withdrawal of ₦${amount} for user ${user.id}`);

      const newBalance = profile.wallet_balance - amount;

      // Debit wallet
      await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      // Record transaction as completed
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'withdrawal',
        amount: -amount,
        description: 'Test Mode Withdrawal',
        status: 'completed',
        reference: reference,
        mode: 'test',
      });

      // Log the simulated withdrawal
      await supabase.from('payment_provider_logs').insert({
        provider: 'paystack',
        reference: reference,
        event_type: 'withdrawal_simulated',
        payload: { amount, bank_code, account_number, account_name, test_mode: true },
        status: 'completed',
        user_id: user.id,
      });

      // Save bank details for future use
      await supabase
        .from('profiles')
        .update({
          bank_account_name: account_name,
          bank_account_number: account_number,
          bank_code: bank_code,
        })
        .eq('id', user.id);

      // Send withdrawal complete email
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            template_key: 'withdrawal_complete',
            user_id: user.id,
            data: {
              amount: amount.toLocaleString(),
              reference: reference,
              bank_name: 'Test Bank',
              account_number: `****${account_number.slice(-4)}`,
            },
          }),
        });
        console.log(`[TEST MODE] Withdrawal complete email sent`);
      } catch (emailError) {
        console.error('Failed to send withdrawal email:', emailError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          test_mode: true,
          message: 'Test withdrawal successful',
          new_balance: newBalance,
          reference: reference,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Live mode - Process withdrawal via Paystack
    const paystackSecretKey = Deno.env.get('PAYSTACK_LIVE_SECRET_KEY');
    
    if (!paystackSecretKey) {
      console.error('PAYSTACK_LIVE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Lock wallet
    await supabase
      .from('profiles')
      .update({ wallet_locked: true })
      .eq('id', user.id);

    // Debit wallet immediately
    const newBalance = profile.wallet_balance - amount;
    await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id);

    // Create pending transaction record
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'withdrawal',
      amount: -amount,
      description: 'Withdrawal (processing)',
      status: 'processing',
      reference: reference,
      mode: 'live',
    });

    // Save bank details
    await supabase
      .from('profiles')
      .update({
        bank_account_name: account_name,
        bank_account_number: account_number,
        bank_code: bank_code,
      })
      .eq('id', user.id);

    try {
      // Create transfer recipient
      const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: account_name,
          account_number: account_number,
          bank_code: bank_code,
          currency: 'NGN',
        }),
      });

      const recipientData = await recipientResponse.json();

      if (!recipientData.status) {
        throw new Error(recipientData.message || 'Failed to create recipient');
      }

      const recipientCode = recipientData.data.recipient_code;

      // Initiate transfer
      const transferResponse = await fetch('https://api.paystack.co/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: amount * 100, // Paystack uses kobo
          recipient: recipientCode,
          reference: reference,
          reason: 'FortunesHQ Withdrawal',
        }),
      });

      const transferData = await transferResponse.json();

      if (!transferData.status) {
        throw new Error(transferData.message || 'Failed to initiate transfer');
      }

      // Log the transfer initiation
      await supabase.from('payment_provider_logs').insert({
        provider: 'paystack',
        reference: reference,
        event_type: 'withdrawal_initiated',
        payload: { amount, recipient_code: recipientCode, transfer_data: transferData },
        status: 'processing',
        user_id: user.id,
      });

      console.log(`Withdrawal initiated: ${reference} for ₦${amount}`);

      return new Response(
        JSON.stringify({
          success: true,
          test_mode: false,
          message: 'Withdrawal initiated. You will be notified when complete.',
          reference: reference,
          status: 'processing',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (transferError: unknown) {
      const rawMessage = transferError instanceof Error ? transferError.message : 'Withdrawal failed';
      console.error('Transfer failed:', transferError);

      // Check if it's a temporary issue (like insufficient Paystack balance)
      const isRetryable = rawMessage.includes('balance is not enough') || 
                          rawMessage.includes('temporarily unavailable');

      if (isRetryable) {
        // Keep as pending for manual processing - don't refund
        await supabase
          .from('wallet_transactions')
          .update({
            status: 'pending',
            description: 'Withdrawal pending - awaiting processing',
          })
          .eq('reference', reference);

        // Unlock wallet but keep balance deducted
        await supabase
          .from('profiles')
          .update({ wallet_locked: false })
          .eq('id', user.id);

        // Log for admin attention
        await supabase.from('payment_provider_logs').insert({
          provider: 'paystack',
          reference: reference,
          event_type: 'withdrawal_pending',
          payload: { amount, error: rawMessage, requires_manual_processing: true },
          status: 'pending',
          user_id: user.id,
        });

        console.log(`Withdrawal queued for manual processing: ${reference}`);

        return new Response(
          JSON.stringify({
            success: true,
            test_mode: false,
            message: 'Withdrawal submitted. You will be notified when complete.',
            reference: reference,
            status: 'pending',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // For other errors, refund immediately
      await supabase
        .from('profiles')
        .update({
          wallet_balance: profile.wallet_balance,
          wallet_locked: false,
        })
        .eq('id', user.id);

      await supabase
        .from('wallet_transactions')
        .update({
          status: 'failed',
          description: 'Withdrawal failed',
        })
        .eq('reference', reference);

      return new Response(
        JSON.stringify({ error: rawMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Withdrawal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
