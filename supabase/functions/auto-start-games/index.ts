import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    // Verify cron secret for scheduled calls (optional auth check)
    const authHeader = req.headers.get('Authorization');
    const isCronCall = authHeader?.includes(cronSecret || '');
    
    console.log('[auto-start-games] Starting check for games ready to go live...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();

    // Find all games with status 'open' where lobby countdown has expired
    // Lobby countdown = start_time + countdown seconds
    const { data: openGames, error: fetchError } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'open')
      .not('start_time', 'is', null);

    if (fetchError) {
      console.error('[auto-start-games] Error fetching games:', fetchError);
      throw fetchError;
    }

    console.log(`[auto-start-games] Found ${openGames?.length || 0} open games with start_time`);

    const gamesToStart: string[] = [];
    
    for (const game of openGames || []) {
      const startTime = new Date(game.start_time);
      const lobbyDurationMs = (game.countdown || 60) * 1000;
      const lobbyEndTime = new Date(startTime.getTime() + lobbyDurationMs);
      
      console.log(`[auto-start-games] Game ${game.id} (${game.name}):`, {
        startTime: startTime.toISOString(),
        lobbyDuration: `${game.countdown}s`,
        lobbyEndTime: lobbyEndTime.toISOString(),
        now: now.toISOString(),
        shouldStart: now >= lobbyEndTime,
        participantCount: game.participant_count,
        minParticipants: game.min_participants,
      });

      // Check if lobby countdown has expired
      if (now >= lobbyEndTime) {
        // Check minimum participants
        const minParticipants = game.min_participants || 3;
        
        if (game.participant_count >= minParticipants) {
          gamesToStart.push(game.id);
          console.log(`[auto-start-games] Game ${game.id} ready to start (${game.participant_count} >= ${minParticipants} players)`);
        } else {
          console.log(`[auto-start-games] Game ${game.id} has insufficient players (${game.participant_count} < ${minParticipants}), extending lobby by 30s`);
          
          // Extend the lobby by 30 seconds if not enough players
          const newStartTime = new Date(now.getTime());
          const { error: extendError } = await supabase
            .from('fastest_finger_games')
            .update({ 
              start_time: newStartTime.toISOString(),
              countdown: 30, // Give 30 more seconds
            })
            .eq('id', game.id);
            
          if (extendError) {
            console.error(`[auto-start-games] Error extending game ${game.id}:`, extendError);
          }
        }
      }
    }

    // Start games that are ready
    let startedCount = 0;
    for (const gameId of gamesToStart) {
      const { error: updateError } = await supabase
        .from('fastest_finger_games')
        .update({ 
          status: 'live',
        })
        .eq('id', gameId);

      if (updateError) {
        console.error(`[auto-start-games] Error starting game ${gameId}:`, updateError);
      } else {
        startedCount++;
        console.log(`[auto-start-games] ✅ Game ${gameId} started successfully!`);
      }
    }

    // Also check for scheduled games that should auto-open
    const { data: scheduledGames, error: scheduledError } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'scheduled')
      .not('scheduled_at', 'is', null);

    if (scheduledError) {
      console.error('[auto-start-games] Error fetching scheduled games:', scheduledError);
    }

    let openedCount = 0;
    for (const game of scheduledGames || []) {
      const scheduledAt = new Date(game.scheduled_at);
      
      if (now >= scheduledAt) {
        console.log(`[auto-start-games] Opening scheduled game ${game.id} (${game.name})`);
        
        const { error: openError } = await supabase
          .from('fastest_finger_games')
          .update({ 
            status: 'open',
            start_time: now.toISOString(),
          })
          .eq('id', game.id);

        if (openError) {
          console.error(`[auto-start-games] Error opening game ${game.id}:`, openError);
        } else {
          openedCount++;
          console.log(`[auto-start-games] ✅ Game ${game.id} opened for entries!`);
        }
      }
    }

    const result = {
      success: true,
      timestamp: now.toISOString(),
      gamesChecked: openGames?.length || 0,
      gamesStarted: startedCount,
      gamesOpened: openedCount,
      scheduledGamesChecked: scheduledGames?.length || 0,
    };

    console.log('[auto-start-games] Complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[auto-start-games] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});