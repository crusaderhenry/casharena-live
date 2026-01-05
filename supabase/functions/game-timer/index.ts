import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cronSecret = Deno.env.get('CRON_SECRET');

// This function is designed to be called by:
// 1. Cron job (uses CRON_SECRET for authentication)
// 2. Admin for manual operations (requires admin auth via JWT)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, gameId } = await req.json();

    console.log(`[game-timer] Action: ${action}, Game: ${gameId}`);

    // Check for cron secret in header (for cron job calls)
    const cronHeader = req.headers.get('x-cron-secret');
    const isCronJob = cronSecret && cronHeader === cronSecret;

    // Check for JWT auth (for admin calls)
    const authHeader = req.headers.get('Authorization');
    
    if (!isCronJob) {
      if (!authHeader) {
        console.log('[game-timer] Unauthorized: No cron secret or auth header');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify admin role for manual calls
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const token = authHeader.replace('Bearer ', '');
      
      // Create client with user's JWT to verify their identity
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      });
      
      const { data: { user }, error } = await supabaseAuth.auth.getUser();
      
      if (error || !user) {
        console.log('[game-timer] Unauthorized: Invalid JWT');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        console.log('[game-timer] Forbidden: User is not admin');
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    console.log(`[game-timer] Authenticated via ${isCronJob ? 'cron secret' : 'admin JWT'}`);

    if (action === 'tick') {
      const { data: game, error: gameError } = await supabase
        .from('fastest_finger_games')
        .select('*')
        .eq('id', gameId)
        .eq('status', 'live')
        .maybeSingle();

      if (gameError || !game) {
        console.log('[game-timer] No active game found for tick');
        return new Response(JSON.stringify({ success: false, message: 'No active game' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const newCountdown = Math.max(0, game.countdown - 1);
      const startTime = new Date(game.start_time).getTime();
      const now = Date.now();
      const elapsedMinutes = (now - startTime) / (1000 * 60);

      if (newCountdown === 0 || elapsedMinutes >= game.max_duration) {
        console.log('[game-timer] Game ending - countdown reached 0 or max duration exceeded');

        // Idempotency lock: set end_time once so only one caller settles payouts.
        // NOTE: This sets end_time before status='ended' to prevent double payouts under concurrent calls.
        const lockIso = new Date().toISOString();
        const { data: lockedGame, error: lockErr } = await supabase
          .from('fastest_finger_games')
          .update({ end_time: lockIso })
          .eq('id', gameId)
          .eq('status', 'live')
          .is('end_time', null)
          .select('*')
          .maybeSingle();

        if (lockErr) {
          console.error('[game-timer] Error acquiring end lock:', lockErr);
          return new Response(JSON.stringify({ error: 'Failed to end game' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!lockedGame) {
          console.log('[game-timer] Game already ending/ended, skipping settlement');
          return new Response(JSON.stringify({ success: true, action: 'already_ending' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const gameForEnd = lockedGame as any;

        const payoutDistribution: number[] = gameForEnd.payout_distribution || [0.5, 0.3, 0.2];
        const winnerCount = payoutDistribution.length;

        const { data: comments } = await supabase
          .from('comments')
          .select('user_id, created_at')
          .eq('game_id', gameId)
          .order('created_at', { ascending: false })
          .limit(winnerCount);

        const uniqueWinnerIds: string[] = [];
        for (const comment of comments || []) {
          if (!uniqueWinnerIds.includes(comment.user_id)) {
            uniqueWinnerIds.push(comment.user_id);
          }
          if (uniqueWinnerIds.length >= winnerCount) break;
        }

        const poolValue = gameForEnd.pool_value;
        const platformCut = Math.floor(poolValue * 0.1);
        const prizePool = poolValue - platformCut;

        for (let i = 0; i < uniqueWinnerIds.length; i++) {
          const winnerId = uniqueWinnerIds[i];
          const prize = Math.floor(prizePool * payoutDistribution[i]);

          await supabase.from('winners').insert({
            game_id: gameId,
            user_id: winnerId,
            position: i + 1,
            amount_won: prize,
          });

          const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance, rank_points, total_wins')
            .eq('id', winnerId)
            .single();

          if (profile) {
            const rankPoints = [100, 60, 30, 10, 10, 10, 10, 10, 10, 10][i] || 10;
            await supabase
              .from('profiles')
              .update({
                wallet_balance: profile.wallet_balance + prize,
                rank_points: profile.rank_points + rankPoints,
                total_wins: profile.total_wins + 1,
              })
              .eq('id', winnerId);
          }

          await supabase.from('wallet_transactions').insert({
            user_id: winnerId,
            type: 'win',
            amount: prize,
            game_id: gameId,
            description: `${gameForEnd.name || 'Fastest Finger'} - Position ${i + 1}`,
          });

          await supabase.from('rank_history').insert({
            user_id: winnerId,
            points: [100, 60, 30, 10, 10, 10, 10, 10, 10, 10][i] || 10,
            reason: `Position ${i + 1} in ${gameForEnd.name || 'Fastest Finger'}`,
            game_id: gameId,
          });
        }

        await supabase
          .from('fastest_finger_games')
          .update({
            status: 'ended',
            end_time: lockIso,
            countdown: 0,
          })
          .eq('id', gameId);

        console.log(`[game-timer] Game ${gameId} ended. Winners: ${uniqueWinnerIds.length}`);

        return new Response(
          JSON.stringify({
            success: true,
            action: 'game_ended',
            winners: uniqueWinnerIds.length,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      await supabase
        .from('fastest_finger_games')
        .update({ countdown: newCountdown })
        .eq('id', gameId);

      return new Response(
        JSON.stringify({
          success: true,
          countdown: newCountdown,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'reset_countdown') {
      const { data: game, error } = await supabase
        .from('fastest_finger_games')
        .select('comment_timer')
        .eq('id', gameId)
        .eq('status', 'live')
        .single();

      if (error || !game) {
        return new Response(JSON.stringify({ success: false, message: 'No active game' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const commentTimer = (game as any).comment_timer || 60;
      await supabase
        .from('fastest_finger_games')
        .update({ countdown: commentTimer })
        .eq('id', gameId);

      console.log(`[game-timer] Countdown reset for game ${gameId}`);
      
      return new Response(JSON.stringify({ success: true, countdown: commentTimer }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'check_auto_end') {
      const { data: liveGames } = await supabase
        .from('fastest_finger_games')
        .select('*')
        .eq('status', 'live');

      if (!liveGames || liveGames.length === 0) {
        return new Response(JSON.stringify({ success: true, message: 'No live games' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const endedGames = [];
      
      for (const game of liveGames) {
        const startTime = new Date(game.start_time).getTime();
        const now = Date.now();
        const elapsedMinutes = (now - startTime) / (1000 * 60);
        
        if (elapsedMinutes >= game.max_duration) {
          console.log(`[game-timer] Auto-ending game ${game.id} - exceeded max duration`);
          
           if (!cronSecret) {
             console.log('[game-timer] CRON_SECRET not set; skipping internal auto-end tick');
             continue;
           }

           await fetch(`${supabaseUrl}/functions/v1/game-timer`, {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'x-cron-secret': cronSecret,
             },
             body: JSON.stringify({ action: 'tick', gameId: game.id }),
           });
          
          endedGames.push(game.id);
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        checkedGames: liveGames.length,
        endedGames,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    // Log detailed error for debugging (server-side only)
    const internalMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[game-timer] Error:', internalMessage);
    
    // Return generic error to client to prevent information disclosure
    return new Response(JSON.stringify({ error: 'An error occurred processing your request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});