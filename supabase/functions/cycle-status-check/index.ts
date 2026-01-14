import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get current cycle status
    const { data: cycle, error: fetchError } = await supabase
      .from('game_cycles')
      .select('id, status, entry_open_at, live_start_at, live_end_at, participant_count, min_participants')
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

    let newStatus = cycle.status;
    let statusUpdated = false;

    // Check for status transitions
    if (cycle.status === 'waiting' && now >= entryOpenAt) {
      newStatus = 'opening';
      statusUpdated = true;
    } else if (cycle.status === 'opening' && now >= liveStartAt) {
      // Check min participants
      if (cycle.participant_count < cycle.min_participants) {
        newStatus = 'cancelled';
      } else {
        newStatus = 'live';
      }
      statusUpdated = true;
    } else if (cycle.status === 'live' && now >= liveEndAt) {
      newStatus = 'ending';
      statusUpdated = true;
    }

    // Update status if changed
    if (statusUpdated) {
      const { error: updateError } = await supabase
        .from('game_cycles')
        .update({ status: newStatus })
        .eq('id', cycle_id);

      if (updateError) {
        console.error('[cycle-status-check] Update error:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        cycle_id: cycle.id,
        previous_status: cycle.status,
        current_status: newStatus,
        status_updated: statusUpdated,
        server_time: now.toISOString(),
        seconds_until_opening: Math.max(0, Math.floor((entryOpenAt.getTime() - now.getTime()) / 1000)),
        seconds_until_live: Math.max(0, Math.floor((liveStartAt.getTime() - now.getTime()) / 1000)),
        seconds_until_end: Math.max(0, Math.floor((liveEndAt.getTime() - now.getTime()) / 1000)),
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
