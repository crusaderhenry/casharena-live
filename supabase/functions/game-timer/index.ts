import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, gameId } = await req.json();

    console.log(`[game-timer] Action: ${action}, Game: ${gameId}`);

    if (action === 'tick') {
      // Process countdown tick for a live game
      const { data: game, error: gameError } = await supabase
        .from('fastest_finger_games')
        .select('*')
        .eq('id', gameId)
        .eq('status', 'live')
        .single();

      if (gameError || !game) {
        console.log('[game-timer] No active game found for tick');
        return new Response(JSON.stringify({ success: false, message: 'No active game' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const newCountdown = Math.max(0, game.countdown - 1);
      
      // Check if game should auto-end (countdown reached 0 or max duration exceeded)
      const startTime = new Date(game.start_time).getTime();
      const now = Date.now();
      const elapsedMinutes = (now - startTime) / (1000 * 60);
      
      if (newCountdown === 0 || elapsedMinutes >= game.max_duration) {
        console.log('[game-timer] Game ending - countdown reached 0 or max duration exceeded');
        
        // Get last 3 commenters as winners
        const { data: comments } = await supabase
          .from('comments')
          .select('user_id, created_at')
          .eq('game_id', gameId)
          .order('created_at', { ascending: false })
          .limit(3);

        const winners = comments || [];
        const poolValue = game.pool_value;
        const platformCut = Math.floor(poolValue * 0.1);
        const prizePool = poolValue - platformCut;
        
        // Prize distribution: 50%, 30%, 20%
        const prizeDistribution = [0.5, 0.3, 0.2];
        
        // Record winners and distribute prizes
        for (let i = 0; i < winners.length; i++) {
          const prize = Math.floor(prizePool * prizeDistribution[i]);
          const winnerId = winners[i].user_id;
          
          // Insert winner record
          await supabase.from('winners').insert({
            game_id: gameId,
            user_id: winnerId,
            position: i + 1,
            amount_won: prize,
          });
          
          // Get current wallet balance and update
          const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance, rank_points, total_wins')
            .eq('id', winnerId)
            .single();
            
          if (profile) {
            // Credit winner's wallet
            await supabase
              .from('profiles')
              .update({ 
                wallet_balance: profile.wallet_balance + prize,
                rank_points: profile.rank_points + [100, 60, 30][i],
                total_wins: profile.total_wins + 1,
              })
              .eq('id', winnerId);
          }
          
          // Record win transaction
          await supabase.from('wallet_transactions').insert({
            user_id: winnerId,
            type: 'win',
            amount: prize,
            game_id: gameId,
            description: `Fastest Finger ${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : 'rd'} place prize`,
          });
          
          // Record rank history
          const rankPoints = [100, 60, 30][i];
          await supabase.from('rank_history').insert({
            user_id: winnerId,
            points: rankPoints,
            reason: `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : 'rd'} place in Fastest Finger`,
            game_id: gameId,
          });
        }
        
        // End the game
        await supabase
          .from('fastest_finger_games')
          .update({
            status: 'ended',
            end_time: new Date().toISOString(),
            countdown: 0,
          })
          .eq('id', gameId);
          
        console.log(`[game-timer] Game ${gameId} ended. Winners: ${winners.length}`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          action: 'game_ended',
          winners: winners.length,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Just update countdown
      await supabase
        .from('fastest_finger_games')
        .update({ countdown: newCountdown })
        .eq('id', gameId);
        
      return new Response(JSON.stringify({ 
        success: true, 
        countdown: newCountdown,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reset_countdown') {
      // Reset countdown when a new comment is posted
      const { data: game, error } = await supabase
        .from('fastest_finger_games')
        .select('countdown')
        .eq('id', gameId)
        .eq('status', 'live')
        .single();

      if (error || !game) {
        return new Response(JSON.stringify({ success: false, message: 'No active game' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Reset to 60 seconds
      await supabase
        .from('fastest_finger_games')
        .update({ countdown: 60 })
        .eq('id', gameId);

      console.log(`[game-timer] Countdown reset for game ${gameId}`);
      
      return new Response(JSON.stringify({ success: true, countdown: 60 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'check_auto_end') {
      // Check all live games for auto-end conditions
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
          // Auto-end this game
          console.log(`[game-timer] Auto-ending game ${game.id} - exceeded max duration`);
          
          // Trigger full end logic by calling with tick action
          await fetch(`${supabaseUrl}/functions/v1/game-timer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
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
    console.error('[game-timer] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
