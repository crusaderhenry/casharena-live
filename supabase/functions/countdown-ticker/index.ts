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

    const now = new Date();
    const nowIso = now.toISOString();

    // 1) Start OPEN games whose start_time has passed (auto-go-live)
    // IMPORTANT: Check min_participants before going live
    const { data: openGames, error: openErr } = await supabase
      .from('fastest_finger_games')
      .select('id, comment_timer, min_participants, min_participants_action, participant_count, entry_wait_seconds, countdown, name, entry_fee')
      .eq('status', 'open')
      .not('start_time', 'is', null)
      .lte('start_time', nowIso);

    if (openErr) {
      console.error('[countdown-ticker] Error selecting open games:', openErr);
    }

    let startedGames = 0;
    let resetGames = 0;
    let cancelledGames = 0;
    
    for (const g of (openGames || []) as any[]) {
      const minParticipants = Number(g.min_participants ?? 3);
      const participantCount = Number(g.participant_count ?? 0);
      const minAction = g.min_participants_action || 'reset';
      const commentTimer = Number(g.comment_timer ?? 60);
      
      // Check if we have enough participants
      if (participantCount < minParticipants) {
        console.log(`[countdown-ticker] Game ${g.id} has ${participantCount}/${minParticipants} participants - action: ${minAction}`);
        
        if (minAction === 'reset') {
          // Reset countdown and keep waiting
          const entryWait = Number(g.entry_wait_seconds ?? g.countdown ?? 60);
          const newLiveAt = new Date(now.getTime() + (entryWait * 1000));
          
          console.log(`[countdown-ticker] Resetting countdown for game ${g.id} to ${entryWait}s`);
          
          const { error: resetErr } = await supabase
            .from('fastest_finger_games')
            .update({
              countdown: entryWait,
              start_time: newLiveAt.toISOString(),
            })
            .eq('id', g.id)
            .eq('status', 'open');
          
          if (resetErr) {
            console.error('[countdown-ticker] Error resetting game:', g.id, resetErr);
          } else {
            resetGames += 1;
          }
          continue;
        } else if (minAction === 'cancel') {
          // Refund all participants and cancel
          console.log(`[countdown-ticker] Cancelling game ${g.id} - insufficient participants`);
          
          const { data: participants } = await supabase
            .from('fastest_finger_participants')
            .select('user_id')
            .eq('game_id', g.id);
          
          for (const p of participants || []) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('wallet_balance')
              .eq('id', p.user_id)
              .single();
            
            if (profile) {
              await supabase
                .from('profiles')
                .update({ wallet_balance: profile.wallet_balance + g.entry_fee })
                .eq('id', p.user_id);
              
              await supabase.from('wallet_transactions').insert({
                user_id: p.user_id,
                type: 'refund',
                amount: g.entry_fee,
                description: `${g.name} cancelled - insufficient players`,
                game_id: g.id,
              });
            }
          }
          
          await supabase
            .from('fastest_finger_games')
            .update({ status: 'cancelled', end_time: nowIso })
            .eq('id', g.id);
          
          cancelledGames += 1;
          continue;
        }
        // 'start_anyway' - fall through to start the game
      }
      
      // Start the game
      const { error: startErr } = await supabase
        .from('fastest_finger_games')
        .update({
          status: 'live',
          start_time: nowIso,
          countdown: commentTimer,
        })
        .eq('id', g.id)
        .eq('status', 'open');

      if (startErr) {
        console.error('[countdown-ticker] Error starting game:', g.id, startErr);
      } else {
        console.log(`[countdown-ticker] Started game ${g.id} with ${participantCount} participants`);
        startedGames += 1;
      }
    }

    // 2) Tick down countdowns for LIVE games
    const { data: tickResults, error } = await supabase.rpc('tick_game_countdowns');

    if (error) {
      console.error('[countdown-ticker] Error ticking:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for games that ended (or are stuck at 0)
    const endedFromRpc = (tickResults || []).filter((r: any) => r.game_ended);
    const endedGameIds = new Set<string>(endedFromRpc.map((r: any) => r.game_id));

    // Some games can get stuck at countdown=0 without being flagged by tick_game_countdowns.
    // Catch those and force end-game logic.
    const { data: stuckGames, error: stuckErr } = await supabase
      .from('fastest_finger_games')
      .select('id')
      .eq('status', 'live')
      .is('end_time', null)
      .lte('countdown', 0);

    if (stuckErr) {
      console.error('[countdown-ticker] Error selecting stuck games:', stuckErr);
    }

    for (const g of (stuckGames || []) as any[]) {
      endedGameIds.add(g.id);
    }

    const triggeredEndGames: string[] = [];

    for (const gameId of endedGameIds) {
      console.log(`[countdown-ticker] Game ${gameId} countdown reached 0, triggering end`);

      // Trigger the game-timer to handle end-game logic (as cron)
      const { error: invokeErr } = await supabase.functions.invoke('game-timer', {
        body: { action: 'tick', gameId },
        headers: cronSecret ? { 'x-cron-secret': cronSecret } : undefined,
      });

      if (invokeErr) {
        console.error('[countdown-ticker] Error invoking game-timer for game:', gameId, invokeErr);
      } else {
        triggeredEndGames.push(gameId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        startedGames,
        resetGames,
        cancelledGames,
        tickedGames: tickResults?.length || 0,
        endedGames: triggeredEndGames.length,
        triggeredEndGames,
        results: tickResults,
        timestamp: nowIso,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[countdown-ticker] Error:', message);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});