import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    if (!authHeader?.includes(cronSecret || '')) {
      console.log('[expire-stale-deposits] Unauthorized request');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find pending deposits older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: staleDeposits, error: fetchError } = await supabase
      .from('wallet_transactions')
      .select('id, reference, user_id, amount, created_at')
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .lt('created_at', thirtyMinutesAgo);

    if (fetchError) {
      console.error('[expire-stale-deposits] Error fetching stale deposits:', fetchError);
      throw fetchError;
    }

    if (!staleDeposits || staleDeposits.length === 0) {
      console.log('[expire-stale-deposits] No stale deposits found');
      return new Response(JSON.stringify({ expired: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[expire-stale-deposits] Found ${staleDeposits.length} stale deposits to expire`);

    // Mark them as failed
    const staleIds = staleDeposits.map(d => d.id);
    const { error: updateError } = await supabase
      .from('wallet_transactions')
      .update({ 
        status: 'failed', 
        description: 'Payment not completed - auto-expired after 30 minutes' 
      })
      .in('id', staleIds);

    if (updateError) {
      console.error('[expire-stale-deposits] Error updating stale deposits:', updateError);
      throw updateError;
    }

    console.log(`[expire-stale-deposits] Expired ${staleDeposits.length} stale deposits`);

    return new Response(JSON.stringify({ 
      expired: staleDeposits.length,
      references: staleDeposits.map(d => d.reference)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[expire-stale-deposits] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
