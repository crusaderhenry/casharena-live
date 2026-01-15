import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * READ-ONLY status check endpoint.
 * This function ONLY computes and returns status information - it does NOT write to the database.
 * All status transitions are handled by cycle-manager to ensure proper side-effects (refunds, etc.)
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { cycle_id } = await req.json();

    if (!cycle_id) {
      return new Response(
        JSON.stringify({ error: 'cycle_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current cycle status (READ-ONLY)
    const { data: cycle, error: fetchError } = await supabase
      .from('game_cycles')
      .select('id, status, entry_open_at, live_start_at, live_end_at, participant_count, min_participants, countdown')
      .eq('id', cycle_id)
      .single();

    if (fetchError || !cycle) {
      return new Response(
        JSON.stringify({ error: 'Cycle not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const entryOpenAt = new Date(cycle.entry_open_at);
    const liveStartAt = new Date(cycle.live_start_at);
    const liveEndAt = new Date(cycle.live_end_at);

    // Compute what the status SHOULD be based on current time
    // This is READ-ONLY - we do NOT update the database here
    let computedStatus = cycle.status;
    let shouldTransition = false;

    if (cycle.status === 'waiting' && now >= entryOpenAt) {
      computedStatus = 'opening';
      shouldTransition = true;
    } else if (cycle.status === 'opening' && now >= liveStartAt) {
      // Check min participants to determine if it would go live or be cancelled
      if (cycle.participant_count < cycle.min_participants) {
        computedStatus = 'cancelled';
      } else {
        computedStatus = 'live';
      }
      shouldTransition = true;
    } else if (cycle.status === 'live' && now >= liveEndAt) {
      computedStatus = 'ending';
      shouldTransition = true;
    }

    return new Response(
      JSON.stringify({
        cycle_id: cycle.id,
        current_status: cycle.status,
        computed_status: computedStatus,
        should_transition: shouldTransition,
        // Keep these for frontend display (backwards compatibility)
        status_updated: shouldTransition && computedStatus !== cycle.status,
        previous_status: cycle.status,
        server_time: now.toISOString(),
        seconds_until_opening: Math.max(0, Math.floor((entryOpenAt.getTime() - now.getTime()) / 1000)),
        seconds_until_live: Math.max(0, Math.floor((liveStartAt.getTime() - now.getTime()) / 1000)),
        seconds_until_end: Math.max(0, Math.floor((liveEndAt.getTime() - now.getTime()) / 1000)),
        countdown: cycle.countdown,
        participant_count: cycle.participant_count,
        min_participants: cycle.min_participants,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cycle-status-check] Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
