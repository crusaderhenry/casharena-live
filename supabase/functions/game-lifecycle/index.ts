import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

/**
 * UNIFIED GAME LIFECYCLE ENGINE
 * 
 * This edge function manages the complete automated game lifecycle:
 * 
 * 1. SCHEDULED → OPEN: When scheduled_at time arrives, game opens for entries
 * 2. OPEN → LIVE: When lobby countdown expires (if min players met)
 * 3. LIVE → ENDING_SOON: When less than 5 minutes remain
 * 4. ENDING_SOON/LIVE → ENDED: When max_duration expires or timer hits 0
 * 5. ENDED → SETTLED: After prizes are distributed
 * 6. RECURRING: Auto-create next game instance after settlement
 * 
 * Called by cron job every 10 seconds for responsive automation
 */

interface GameResult {
  gamesOpened: number;
  gamesStarted: number;
  gamesEndingSoon: number;
  gamesEnded: number;
  gamesSettled: number;
  recurringGamesCreated: number;
  errors: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    // Verify cron secret for scheduled jobs
    const requestCronSecret = req.headers.get('x-cron-secret');
    if (cronSecret && requestCronSecret !== cronSecret) {
      // Allow manual trigger from admin without cron secret
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('[game-lifecycle] Starting automated game lifecycle check...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();
    const nowIso = now.toISOString();

    const results: GameResult = {
      gamesOpened: 0,
      gamesStarted: 0,
      gamesEndingSoon: 0,
      gamesEnded: 0,
      gamesSettled: 0,
      recurringGamesCreated: 0,
      errors: [],
    };

    // ============================================
    // PHASE 1: SCHEDULED → OPEN
    // Open games when their scheduled_at time arrives
    // ============================================
    console.log('[game-lifecycle] Phase 1: Checking scheduled games to open...');
    
    const { data: scheduledGames, error: scheduledError } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'scheduled')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', nowIso);

    if (scheduledError) {
      console.error('[game-lifecycle] Error fetching scheduled games:', scheduledError);
      results.errors.push(`Fetch scheduled: ${scheduledError.message}`);
    }

    for (const game of scheduledGames || []) {
      console.log(`[game-lifecycle] Opening game ${game.id} (${game.name})`);
      
      const { error: openError } = await supabase
        .from('fastest_finger_games')
        .update({ 
          status: 'open',
          start_time: nowIso, // Lobby countdown starts now
        })
        .eq('id', game.id);

      if (openError) {
        console.error(`[game-lifecycle] Error opening game ${game.id}:`, openError);
        results.errors.push(`Open game ${game.id}: ${openError.message}`);
      } else {
        results.gamesOpened++;
        console.log(`[game-lifecycle] ✅ Game ${game.id} opened for entries!`);
        
        await supabase.from('audit_logs').insert({
          user_id: game.created_by || '00000000-0000-0000-0000-000000000000',
          action: 'auto_open_game',
          resource_type: 'game',
          resource_id: game.id,
          details: { scheduled_at: game.scheduled_at, opened_at: nowIso },
        });
      }
    }

    // ============================================
    // PHASE 2: OPEN → LIVE
    // Start games when lobby countdown expires
    // ============================================
    console.log('[game-lifecycle] Phase 2: Checking open games to start...');
    
    const { data: openGames, error: openError } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'open')
      .not('start_time', 'is', null);

    if (openError) {
      console.error('[game-lifecycle] Error fetching open games:', openError);
      results.errors.push(`Fetch open: ${openError.message}`);
    }

    for (const game of openGames || []) {
      const startTime = new Date(game.start_time);
      const lobbyDurationMs = (game.countdown || 60) * 1000;
      const lobbyEndTime = new Date(startTime.getTime() + lobbyDurationMs);
      
      console.log(`[game-lifecycle] Game ${game.id}: lobby ends at ${lobbyEndTime.toISOString()}, now: ${nowIso}`);

      if (now >= lobbyEndTime) {
        const minParticipants = game.min_participants || 3;
        
        if (game.participant_count >= minParticipants) {
          // Start the game
          const { error: startError } = await supabase
            .from('fastest_finger_games')
            .update({ 
              status: 'live',
              countdown: game.comment_timer || 60,
              start_time: nowIso, // Reset start_time to actual game start
            })
            .eq('id', game.id);

          if (startError) {
            console.error(`[game-lifecycle] Error starting game ${game.id}:`, startError);
            results.errors.push(`Start game ${game.id}: ${startError.message}`);
          } else {
            results.gamesStarted++;
            console.log(`[game-lifecycle] ✅ Game ${game.id} is now LIVE! (${game.participant_count} players)`);
            
            await supabase.from('audit_logs').insert({
              user_id: game.created_by || '00000000-0000-0000-0000-000000000000',
              action: 'auto_start_game',
              resource_type: 'game',
              resource_id: game.id,
              details: { participant_count: game.participant_count },
            });
          }
        } else {
          // Not enough players - extend lobby by 30 seconds
          console.log(`[game-lifecycle] Game ${game.id}: ${game.participant_count}/${minParticipants} players, extending lobby`);
          
          await supabase
            .from('fastest_finger_games')
            .update({ 
              start_time: nowIso,
              countdown: 30,
            })
            .eq('id', game.id);
        }
      }
    }

    // ============================================
    // PHASE 3: LIVE → ENDING_SOON
    // Mark games entering last 5 minutes
    // ============================================
    console.log('[game-lifecycle] Phase 3: Checking for ending soon games...');
    
    const { data: liveGames, error: liveError } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .in('status', ['live'])
      .not('start_time', 'is', null);

    if (liveError) {
      console.error('[game-lifecycle] Error fetching live games:', liveError);
      results.errors.push(`Fetch live: ${liveError.message}`);
    }

    for (const game of liveGames || []) {
      const startTime = new Date(game.start_time);
      const maxDurationMs = (game.max_duration || 20) * 60 * 1000;
      const endTime = new Date(startTime.getTime() + maxDurationMs);
      const timeRemainingMs = endTime.getTime() - now.getTime();
      const fiveMinutesMs = 5 * 60 * 1000;
      
      console.log(`[game-lifecycle] Game ${game.id}: ${Math.floor(timeRemainingMs / 1000)}s remaining`);

      // Check if max duration exceeded
      if (timeRemainingMs <= 0) {
        console.log(`[game-lifecycle] Game ${game.id} max duration exceeded, ending...`);
        await endAndSettleGame(supabase, game, nowIso, results);
      }
      // Check if entering "ending soon" phase (last 5 minutes)
      else if (timeRemainingMs <= fiveMinutesMs && game.status !== 'ending_soon') {
        const { error: endingSoonError } = await supabase
          .from('fastest_finger_games')
          .update({ status: 'ending_soon' })
          .eq('id', game.id);

        if (!endingSoonError) {
          results.gamesEndingSoon++;
          console.log(`[game-lifecycle] ⚠️ Game ${game.id} entering ENDING SOON phase!`);
        }
      }
    }

    // ============================================
    // PHASE 4: Check ENDING_SOON games
    // ============================================
    console.log('[game-lifecycle] Phase 4: Checking ending soon games...');
    
    const { data: endingSoonGames } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'ending_soon')
      .not('start_time', 'is', null);

    for (const game of endingSoonGames || []) {
      const startTime = new Date(game.start_time);
      const maxDurationMs = (game.max_duration || 20) * 60 * 1000;
      const endTime = new Date(startTime.getTime() + maxDurationMs);
      
      if (now >= endTime) {
        console.log(`[game-lifecycle] Game ${game.id} time's up, ending...`);
        await endAndSettleGame(supabase, game, nowIso, results);
      }
    }

    // ============================================
    // PHASE 5: Create recurring game instances
    // ============================================
    console.log('[game-lifecycle] Phase 5: Checking for recurring games to create...');
    
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    
    const { data: settledRecurringGames } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'settled')
      .not('recurrence_type', 'is', null)
      .gte('end_time', fiveMinutesAgo);

    for (const endedGame of settledRecurringGames || []) {
      // Check if next instance already exists
      const { data: existingNext } = await supabase
        .from('fastest_finger_games')
        .select('id')
        .eq('name', endedGame.name)
        .in('status', ['scheduled', 'open', 'live', 'ending_soon'])
        .limit(1);

      if (existingNext && existingNext.length > 0) {
        continue;
      }

      const nextScheduledAt = calculateNextScheduledTime(endedGame, now);
      
      if (nextScheduledAt) {
        console.log(`[game-lifecycle] Creating next instance of "${endedGame.name}" for ${nextScheduledAt.toISOString()}`);
        
        const { error: createError } = await supabase
          .from('fastest_finger_games')
          .insert({
            name: endedGame.name,
            description: endedGame.description,
            status: 'scheduled',
            entry_fee: endedGame.entry_fee,
            max_duration: endedGame.max_duration,
            pool_value: endedGame.is_sponsored ? 0 : 0,
            participant_count: 0,
            countdown: endedGame.countdown,
            comment_timer: endedGame.comment_timer,
            payout_type: endedGame.payout_type,
            payout_distribution: endedGame.payout_distribution,
            min_participants: endedGame.min_participants,
            created_by: endedGame.created_by,
            go_live_type: 'scheduled',
            scheduled_at: nextScheduledAt.toISOString(),
            recurrence_type: endedGame.recurrence_type,
            recurrence_interval: endedGame.recurrence_interval,
            is_sponsored: endedGame.is_sponsored,
            sponsored_amount: endedGame.sponsored_amount,
            visibility: endedGame.visibility,
            entry_cutoff_minutes: endedGame.entry_cutoff_minutes,
          });

        if (createError) {
          results.errors.push(`Create recurring: ${createError.message}`);
        } else {
          results.recurringGamesCreated++;
          console.log(`[game-lifecycle] ✅ Created next recurring game`);
        }
      }
    }

    console.log('[game-lifecycle] Complete:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[game-lifecycle] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * End game and settle prizes atomically
 */
async function endAndSettleGame(supabase: any, game: any, nowIso: string, results: GameResult) {
  try {
    const payoutDistribution: number[] = game.payout_distribution || [0.5, 0.3, 0.2];
    const winnerCount = payoutDistribution.length;

    // Get last unique commenters (winners)
    const { data: comments } = await supabase
      .from('comments')
      .select('user_id, created_at')
      .eq('game_id', game.id)
      .order('created_at', { ascending: false })
      .limit(winnerCount * 3);

    const uniqueWinnerIds: string[] = [];
    for (const comment of comments || []) {
      if (!uniqueWinnerIds.includes(comment.user_id)) {
        uniqueWinnerIds.push(comment.user_id);
      }
      if (uniqueWinnerIds.length >= winnerCount) break;
    }

    // Calculate prize pool (including sponsored amount)
    const poolValue = game.pool_value || 0;
    const sponsoredAmount = game.is_sponsored ? (game.sponsored_amount || 0) : 0;
    const totalPrizePool = poolValue + sponsoredAmount;
    
    // Only apply platform cut to player-contributed pool, not sponsored amount
    const platformCut = Math.floor(poolValue * 0.1);
    const netPool = poolValue - platformCut + sponsoredAmount;
    
    console.log(`[game-lifecycle] Settling game ${game.id}:`, {
      poolValue,
      sponsoredAmount,
      platformCut,
      netPool,
      winners: uniqueWinnerIds.length,
    });

    // Distribute prizes
    for (let i = 0; i < uniqueWinnerIds.length; i++) {
      const winnerId = uniqueWinnerIds[i];
      const prize = Math.floor(netPool * payoutDistribution[i]);
      const rankPoints = [100, 60, 30, 10, 10, 10, 10, 10, 10, 10][i] || 10;
      
      // Insert winner record
      await supabase.from('winners').insert({
        game_id: game.id,
        user_id: winnerId,
        position: i + 1,
        amount_won: prize,
      });
      
      // Update profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance, rank_points, total_wins')
        .eq('id', winnerId)
        .single();
        
      if (profile) {
        await supabase
          .from('profiles')
          .update({ 
            wallet_balance: profile.wallet_balance + prize,
            rank_points: profile.rank_points + rankPoints,
            total_wins: profile.total_wins + 1,
          })
          .eq('id', winnerId);
      }
      
      // Record transaction
      await supabase.from('wallet_transactions').insert({
        user_id: winnerId,
        type: 'win',
        amount: prize,
        game_id: game.id,
        description: `${game.name || 'Fastest Finger'} - Position ${i + 1}${game.is_sponsored ? ' (Sponsored)' : ''}`,
      });
      
      // Record rank history
      await supabase.from('rank_history').insert({
        user_id: winnerId,
        points: rankPoints,
        reason: `Position ${i + 1} in ${game.name || 'Fastest Finger'}`,
        game_id: game.id,
      });
    }

    // Update all participants games_played count
    const { data: participants } = await supabase
      .from('fastest_finger_participants')
      .select('user_id')
      .eq('game_id', game.id);

    for (const p of participants || []) {
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
    
    // Mark game as settled (final state)
    await supabase
      .from('fastest_finger_games')
      .update({
        status: 'settled',
        end_time: nowIso,
        countdown: 0,
      })
      .eq('id', game.id);
      
    results.gamesEnded++;
    results.gamesSettled++;
    console.log(`[game-lifecycle] ✅ Game ${game.id} ended and settled. Winners: ${uniqueWinnerIds.length}`);
    
    await supabase.from('audit_logs').insert({
      user_id: game.created_by || '00000000-0000-0000-0000-000000000000',
      action: 'auto_settle_game',
      resource_type: 'game',
      resource_id: game.id,
      details: { 
        winners: uniqueWinnerIds.length,
        pool_value: poolValue,
        sponsored_amount: sponsoredAmount,
        net_pool: netPool,
      },
    });

  } catch (error: any) {
    console.error(`[game-lifecycle] Error settling game ${game.id}:`, error);
    results.errors.push(`Settle game ${game.id}: ${error.message}`);
  }
}

/**
 * Calculate next scheduled time for recurring games
 */
function calculateNextScheduledTime(game: any, now: Date): Date | null {
  const interval = game.recurrence_interval || 1;
  const endTime = game.end_time ? new Date(game.end_time) : now;
  
  let nextTime = new Date(endTime);
  
  switch (game.recurrence_type) {
    case 'minutes':
      nextTime.setMinutes(nextTime.getMinutes() + interval);
      break;
    case 'hours':
      nextTime.setHours(nextTime.getHours() + interval);
      break;
    case 'daily':
      nextTime.setDate(nextTime.getDate() + 1);
      break;
    case 'weekly':
      nextTime.setDate(nextTime.getDate() + 7);
      break;
    case 'monthly':
      nextTime.setMonth(nextTime.getMonth() + 1);
      break;
    default:
      return null;
  }
  
  // Ensure next time is in the future
  while (nextTime <= now) {
    switch (game.recurrence_type) {
      case 'minutes':
        nextTime.setMinutes(nextTime.getMinutes() + interval);
        break;
      case 'hours':
        nextTime.setHours(nextTime.getHours() + interval);
        break;
      case 'daily':
        nextTime.setDate(nextTime.getDate() + 1);
        break;
      case 'weekly':
        nextTime.setDate(nextTime.getDate() + 7);
        break;
      case 'monthly':
        nextTime.setMonth(nextTime.getMonth() + 1);
        break;
    }
  }
  
  return nextTime;
}
