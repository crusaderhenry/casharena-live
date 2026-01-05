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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, gameId, userId, entryFee, maxDuration } = await req.json();
    console.log(`Game action: ${action}`, { gameId, userId });

    switch (action) {
      case 'create': {
        // Create a new scheduled game
        const { data: game, error } = await supabase
          .from('fastest_finger_games')
          .insert({
            status: 'scheduled',
            entry_fee: entryFee || 700,
            max_duration: maxDuration || 20,
            pool_value: 0,
            participant_count: 0,
            countdown: 60,
          })
          .select()
          .single();

        if (error) throw error;
        console.log('Game created:', game.id);
        return new Response(JSON.stringify({ success: true, game }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'join': {
        if (!gameId || !userId) throw new Error('Missing gameId or userId');

        // Get game info
        const { data: game, error: gameError } = await supabase
          .from('fastest_finger_games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (gameError || !game) throw new Error('Game not found');
        if (game.status !== 'scheduled' && game.status !== 'live') {
          throw new Error('Game is not accepting participants');
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', userId)
          .single();

        if (profileError || !profile) throw new Error('User not found');
        if (profile.wallet_balance < game.entry_fee) {
          throw new Error('Insufficient balance');
        }

        // Check if already joined
        const { data: existing } = await supabase
          .from('fastest_finger_participants')
          .select('id')
          .eq('game_id', gameId)
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({ success: true, alreadyJoined: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Deduct entry fee
        const { error: walletError } = await supabase
          .from('profiles')
          .update({ wallet_balance: profile.wallet_balance - game.entry_fee })
          .eq('id', userId);

        if (walletError) throw walletError;

        // Record transaction
        await supabase.from('wallet_transactions').insert({
          user_id: userId,
          type: 'entry',
          amount: -game.entry_fee,
          description: 'Fastest Finger Entry',
          game_id: gameId,
        });

        // Add participant
        const { error: participantError } = await supabase
          .from('fastest_finger_participants')
          .insert({ game_id: gameId, user_id: userId });

        if (participantError) throw participantError;

        // Update game pool and participant count
        await supabase
          .from('fastest_finger_games')
          .update({
            pool_value: game.pool_value + game.entry_fee,
            participant_count: game.participant_count + 1,
          })
          .eq('id', gameId);

        console.log('User joined game:', userId, gameId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'start': {
        if (!gameId) throw new Error('Missing gameId');

        const { error } = await supabase
          .from('fastest_finger_games')
          .update({
            status: 'live',
            start_time: new Date().toISOString(),
            countdown: 60,
          })
          .eq('id', gameId);

        if (error) throw error;
        console.log('Game started:', gameId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'end': {
        if (!gameId) throw new Error('Missing gameId');

        // Get game
        const { data: game, error: gameError } = await supabase
          .from('fastest_finger_games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (gameError || !game) throw new Error('Game not found');

        // Get last 3 commenters (winners)
        const { data: lastComments, error: commentsError } = await supabase
          .from('comments')
          .select('user_id, created_at, profiles!inner(id, username, avatar)')
          .eq('game_id', gameId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (commentsError) throw commentsError;

        // Calculate payouts (90% of pool, 10% platform cut)
        const netPool = Math.floor(game.pool_value * 0.9);
        const platformCut = game.pool_value - netPool;
        const prizes = [
          Math.floor(netPool * 0.5), // 1st: 50%
          Math.floor(netPool * 0.3), // 2nd: 30%
          Math.floor(netPool * 0.2), // 3rd: 20%
        ];

        const winners: any[] = [];

        // Process winners
        for (let i = 0; i < Math.min(lastComments?.length || 0, 3); i++) {
          const comment = lastComments![i];
          const position = i + 1;
          const prize = prizes[i];

          // Record winner
          await supabase.from('winners').insert({
            game_id: gameId,
            user_id: comment.user_id,
            position,
            amount_won: prize,
          });

          // Credit winner's wallet
          const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance, rank_points, total_wins')
            .eq('id', comment.user_id)
            .single();

          if (profile) {
            // Award rank points based on position
            const rankPoints = position === 1 ? 100 : position === 2 ? 60 : 30;

            await supabase
              .from('profiles')
              .update({
                wallet_balance: profile.wallet_balance + prize,
                rank_points: profile.rank_points + rankPoints,
                total_wins: profile.total_wins + 1,
              })
              .eq('id', comment.user_id);

            // Record win transaction
            await supabase.from('wallet_transactions').insert({
              user_id: comment.user_id,
              type: 'win',
              amount: prize,
              description: `Fastest Finger ${position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'} Place`,
              game_id: gameId,
            });

            // Record rank points
            await supabase.from('rank_history').insert({
              user_id: comment.user_id,
              points: rankPoints,
              reason: `Top ${position} finish`,
              game_id: gameId,
            });
          }

          winners.push({
            user_id: comment.user_id,
            username: (comment.profiles as any).username,
            avatar: (comment.profiles as any).avatar,
            position,
            amount_won: prize,
          });
        }

        // Update all participants' games_played count
        const { data: participants } = await supabase
          .from('fastest_finger_participants')
          .select('user_id')
          .eq('game_id', gameId);

        if (participants) {
          for (const p of participants) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('games_played')
              .eq('id', p.user_id)
              .single();

            if (profileData) {
              await supabase
                .from('profiles')
                .update({ games_played: profileData.games_played + 1 })
                .eq('id', p.user_id);
            }
          }
        }

        // End game
        await supabase
          .from('fastest_finger_games')
          .update({
            status: 'ended',
            end_time: new Date().toISOString(),
          })
          .eq('id', gameId);

        console.log('Game ended:', gameId, 'Winners:', winners.length);
        return new Response(JSON.stringify({ success: true, winners, platformCut }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_countdown': {
        if (!gameId) throw new Error('Missing gameId');
        const { countdown } = await req.json();

        await supabase
          .from('fastest_finger_games')
          .update({ countdown })
          .eq('id', gameId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'reset_weekly_ranks': {
        // Reset all rank points
        await supabase
          .from('profiles')
          .update({ rank_points: 0, weekly_rank: null });

        console.log('Weekly ranks reset');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Game manager error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
