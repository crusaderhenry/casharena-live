import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

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

    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    // Verify webhook signature
    const secret = Deno.env.get('PAYSTACK_LIVE_SECRET_KEY') ?? '';
    const hash = createHmac('sha512', secret).update(body).digest('hex');

    if (hash !== signature) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const event = JSON.parse(body);
    const { event: eventType, data } = event;

    console.log(`Webhook received: ${eventType}`, { reference: data?.reference });

    // Log the webhook event
    await supabase.from('payment_provider_logs').insert({
      provider: 'paystack',
      reference: data?.reference || 'unknown',
      event_type: eventType,
      payload: event,
      status: 'received',
    });

    // Handle charge.success event
    if (eventType === 'charge.success') {
      const reference = data.reference;
      const amountInKobo = data.amount;
      const amountInNaira = amountInKobo / 100;

      // Check if this transaction has already been processed (idempotency)
      const { data: existingTx } = await supabase
        .from('wallet_transactions')
        .select('id, status')
        .eq('reference', reference)
        .single();

      if (existingTx?.status === 'completed') {
        console.log(`Transaction ${reference} already processed, skipping`);
        return new Response(
          JSON.stringify({ message: 'Already processed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user_id from metadata or existing transaction
      let userId = data.metadata?.user_id;

      if (!userId && existingTx) {
        const { data: tx } = await supabase
          .from('wallet_transactions')
          .select('user_id')
          .eq('reference', reference)
          .single();
        userId = tx?.user_id;
      }

      if (!userId) {
        console.error('No user_id found for transaction', reference);
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Credit user's wallet
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();

      const currentBalance = profile?.wallet_balance || 0;
      const newBalance = currentBalance + amountInNaira;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update wallet balance:', updateError);
        throw updateError;
      }

      // Update transaction status
      if (existingTx) {
        await supabase
          .from('wallet_transactions')
          .update({
            status: 'completed',
            description: 'Deposit',
            provider_reference: data.id?.toString(),
          })
          .eq('reference', reference);
      } else {
        // Create transaction record if it doesn't exist
        await supabase.from('wallet_transactions').insert({
          user_id: userId,
          type: 'deposit',
          amount: amountInNaira,
          description: 'Deposit',
          status: 'completed',
          reference: reference,
          mode: 'live',
          provider_reference: data.id?.toString(),
        });
      }

      // Update payment log
      await supabase
        .from('payment_provider_logs')
        .update({ status: 'completed' })
        .eq('reference', reference)
        .eq('event_type', 'deposit_initialized');

      console.log(`Deposit completed: ${reference}, ₦${amountInNaira} credited to ${userId}`);
    }

    // Handle transfer.success event (for withdrawals)
    if (eventType === 'transfer.success') {
      const reference = data.reference;

      // Update withdrawal transaction
      await supabase
        .from('wallet_transactions')
        .update({
          status: 'completed',
          description: 'Withdrawal',
          provider_reference: data.transfer_code,
        })
        .eq('reference', reference);

      // Unlock user's wallet
      const { data: tx } = await supabase
        .from('wallet_transactions')
        .select('user_id')
        .eq('reference', reference)
        .single();

      if (tx?.user_id) {
        await supabase
          .from('profiles')
          .update({ wallet_locked: false })
          .eq('id', tx.user_id);
      }

      console.log(`Withdrawal completed: ${reference}`);
    }

    // Handle transfer.failed event
    if (eventType === 'transfer.failed') {
      const reference = data.reference;

      // Get transaction details
      const { data: tx } = await supabase
        .from('wallet_transactions')
        .select('user_id, amount')
        .eq('reference', reference)
        .single();

      if (tx) {
        // Refund the amount to user's wallet
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', tx.user_id)
          .single();

        const refundedBalance = (profile?.wallet_balance || 0) + Math.abs(tx.amount);

        await supabase
          .from('profiles')
          .update({
            wallet_balance: refundedBalance,
            wallet_locked: false,
          })
          .eq('id', tx.user_id);

        // Update transaction status
        await supabase
          .from('wallet_transactions')
          .update({
            status: 'failed',
            description: 'Withdrawal failed - refunded',
          })
          .eq('reference', reference);

        console.log(`Withdrawal failed and refunded: ${reference}`);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
