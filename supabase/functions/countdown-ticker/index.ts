import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cronSecret = Deno.env.get('CRON_SECRET');

// This function ticks the countdown for all live games every second
// It's designed to be called frequently (every second) via client-side polling
// or less frequently via cron with multiple ticks per call

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify authentication - either cron secret or valid user session
    const cronHeader = req.headers.get('x-cron-secret');
    const isCronJob = cronSecret && cronHeader === cronSecret;
    
    const authHeader = req.headers.get('Authorization');
    let isAuthorized = isCronJob;
    
    if (!isCronJob && authHeader) {
      // Allow any authenticated user to trigger tick (they're playing the game)
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const token = authHeader.replace('Bearer ', '');
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      
      const { data: { user } } = await supabaseAuth.auth.getUser();
      isAuthorized = !!user;
    }
    
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call the tick function
    const { data: tickResults, error } = await supabase.rpc('tick_game_countdowns');
    
    if (error) {
      console.error('[countdown-ticker] Error ticking:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for games that ended
    const endedGames = (tickResults || []).filter((r: any) => r.game_ended);
    
    for (const endedGame of endedGames) {
      console.log(`[countdown-ticker] Game ${endedGame.game_id} countdown reached 0, triggering end`);
      
      // Trigger the game-timer to handle end-game logic
      await supabase.functions.invoke('game-timer', {
        body: { action: 'tick', gameId: endedGame.game_id },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      tickedGames: tickResults?.length || 0,
      endedGames: endedGames.length,
      results: tickResults,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[countdown-ticker] Error:', message);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});