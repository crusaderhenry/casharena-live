import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Unified Game Lifecycle Automation
 * 
 * This function handles the complete automated game lifecycle:
 * 1. Auto-open: scheduled → open when scheduled_at time arrives
 * 2. Auto-start: open → live when lobby countdown expires (if min players met)
 * 3. Auto-end: live → ended when game max_duration expires
 * 4. Auto-schedule: Create next recurring game instance after game ends
 * 
 * Called by cron job every minute
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('[game-lifecycle] Starting automated game lifecycle check...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();
    const nowIso = now.toISOString();

    const results = {
      timestamp: nowIso,
      gamesOpened: 0,
      gamesStarted: 0,
      gamesEnded: 0,
      gamesExtended: 0,
      recurringGamesCreated: 0,
      errors: [] as string[],
    };

    // ============================================
    // PHASE 1: AUTO-OPEN SCHEDULED GAMES
    // ============================================
    console.log('[game-lifecycle] Phase 1: Checking scheduled games to open...');
    
    const { data: scheduledGames, error: scheduledError } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'scheduled')
      .not('scheduled_at', 'is', null);

    if (scheduledError) {
      console.error('[game-lifecycle] Error fetching scheduled games:', scheduledError);
      results.errors.push(`Fetch scheduled error: ${scheduledError.message}`);
    }

    for (const game of scheduledGames || []) {
      const scheduledAt = new Date(game.scheduled_at);
      
      if (now >= scheduledAt) {
        console.log(`[game-lifecycle] Opening scheduled game ${game.id} (${game.name})`);
        
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
          
          // Log audit
          await supabase.from('audit_logs').insert({
            user_id: game.created_by || '00000000-0000-0000-0000-000000000000',
            action: 'auto_open_game',
            resource_type: 'game',
            resource_id: game.id,
            details: { scheduled_at: game.scheduled_at, opened_at: nowIso },
            ip_address: null,
          });
        }
      }
    }

    // ============================================
    // PHASE 2: AUTO-START OPEN GAMES (lobby → live)
    // ============================================
    console.log('[game-lifecycle] Phase 2: Checking open games to start...');
    
    const { data: openGames, error: openError } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'open')
      .not('start_time', 'is', null);

    if (openError) {
      console.error('[game-lifecycle] Error fetching open games:', openError);
      results.errors.push(`Fetch open error: ${openError.message}`);
    }

    for (const game of openGames || []) {
      const startTime = new Date(game.start_time);
      const lobbyDurationMs = (game.countdown || 60) * 1000;
      const lobbyEndTime = new Date(startTime.getTime() + lobbyDurationMs);
      
      console.log(`[game-lifecycle] Game ${game.id} (${game.name}):`, {
        startTime: startTime.toISOString(),
        lobbyDuration: `${game.countdown}s`,
        lobbyEndTime: lobbyEndTime.toISOString(),
        now: nowIso,
        shouldStart: now >= lobbyEndTime,
        participantCount: game.participant_count,
        minParticipants: game.min_participants,
      });

      // Check if lobby countdown has expired
      if (now >= lobbyEndTime) {
        const minParticipants = game.min_participants || 3;
        
        if (game.participant_count >= minParticipants) {
          // Start the game!
          const { error: startError } = await supabase
            .from('fastest_finger_games')
            .update({ 
              status: 'live',
              countdown: game.comment_timer || 60, // Reset to comment timer for live game
            })
            .eq('id', game.id);

          if (startError) {
            console.error(`[game-lifecycle] Error starting game ${game.id}:`, startError);
            results.errors.push(`Start game ${game.id}: ${startError.message}`);
          } else {
            results.gamesStarted++;
            console.log(`[game-lifecycle] ✅ Game ${game.id} started! (${game.participant_count} players)`);
            
            await supabase.from('audit_logs').insert({
              user_id: game.created_by || '00000000-0000-0000-0000-000000000000',
              action: 'auto_start_game',
              resource_type: 'game',
              resource_id: game.id,
              details: { participant_count: game.participant_count },
              ip_address: null,
            });
          }
        } else {
          // Not enough players - extend lobby by 30 seconds
          console.log(`[game-lifecycle] Game ${game.id} has ${game.participant_count}/${minParticipants} players, extending lobby`);
          
          const { error: extendError } = await supabase
            .from('fastest_finger_games')
            .update({ 
              start_time: nowIso,
              countdown: 30, // Give 30 more seconds
            })
            .eq('id', game.id);
            
          if (extendError) {
            console.error(`[game-lifecycle] Error extending game ${game.id}:`, extendError);
          } else {
            results.gamesExtended++;
          }
        }
      }
    }

    // ============================================
    // PHASE 3: AUTO-END LIVE GAMES (duration expired)
    // ============================================
    console.log('[game-lifecycle] Phase 3: Checking live games to end...');
    
    const { data: liveGames, error: liveError } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'live')
      .not('start_time', 'is', null);

    if (liveError) {
      console.error('[game-lifecycle] Error fetching live games:', liveError);
      results.errors.push(`Fetch live error: ${liveError.message}`);
    }

    for (const game of liveGames || []) {
      const startTime = new Date(game.start_time).getTime();
      const elapsedMinutes = (now.getTime() - startTime) / (1000 * 60);
      
      // Add lobby duration to start time for accurate game time calculation
      const lobbyDurationMinutes = (game.countdown || 60) / 60;
      const actualGameStartTime = startTime + ((game.countdown || 60) * 1000);
      const gameElapsedMinutes = (now.getTime() - actualGameStartTime) / (1000 * 60);
      
      console.log(`[game-lifecycle] Live game ${game.id}:`, {
        elapsed: `${gameElapsedMinutes.toFixed(1)} mins`,
        maxDuration: `${game.max_duration} mins`,
        shouldEnd: gameElapsedMinutes >= game.max_duration,
      });

      // Check if max duration exceeded
      if (gameElapsedMinutes >= game.max_duration) {
        console.log(`[game-lifecycle] Ending game ${game.id} - max duration exceeded`);
        
        await endGame(supabase, game, nowIso, results);
      }
    }

    // ============================================
    // PHASE 4: CREATE RECURRING GAME INSTANCES
    // ============================================
    console.log('[game-lifecycle] Phase 4: Checking for recurring games to create...');
    
    // Find recently ended games that have recurrence settings
    const { data: endedRecurringGames, error: recurringError } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'ended')
      .not('recurrence_type', 'is', null)
      .gte('end_time', new Date(now.getTime() - 5 * 60 * 1000).toISOString()); // Ended in last 5 mins

    if (recurringError) {
      console.error('[game-lifecycle] Error fetching recurring games:', recurringError);
      results.errors.push(`Fetch recurring error: ${recurringError.message}`);
    }

    for (const endedGame of endedRecurringGames || []) {
      // Check if next instance already exists
      const { data: existingNext } = await supabase
        .from('fastest_finger_games')
        .select('id')
        .eq('name', endedGame.name)
        .in('status', ['scheduled', 'open', 'live'])
        .limit(1);

      if (existingNext && existingNext.length > 0) {
        console.log(`[game-lifecycle] Recurring game "${endedGame.name}" already has next instance`);
        continue;
      }

      // Calculate next scheduled time based on recurrence
      const nextScheduledAt = calculateNextScheduledTime(endedGame, now);
      
      if (nextScheduledAt) {
        console.log(`[game-lifecycle] Creating next instance of "${endedGame.name}" for ${nextScheduledAt.toISOString()}`);
        
        const { error: createError } = await supabase
          .from('fastest_finger_games')
          .insert({
            name: endedGame.name,
            status: 'scheduled',
            entry_fee: endedGame.entry_fee,
            max_duration: endedGame.max_duration,
            pool_value: 0,
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
          });

        if (createError) {
          console.error(`[game-lifecycle] Error creating recurring game:`, createError);
          results.errors.push(`Create recurring: ${createError.message}`);
        } else {
          results.recurringGamesCreated++;
          console.log(`[game-lifecycle] ✅ Created next recurring game for ${nextScheduledAt.toISOString()}`);
          
          await supabase.from('audit_logs').insert({
            user_id: endedGame.created_by || '00000000-0000-0000-0000-000000000000',
            action: 'auto_create_recurring_game',
            resource_type: 'game',
            resource_id: endedGame.id,
            details: { 
              parent_game_id: endedGame.id,
              next_scheduled_at: nextScheduledAt.toISOString(),
              recurrence_type: endedGame.recurrence_type,
              recurrence_interval: endedGame.recurrence_interval,
            },
            ip_address: null,
          });
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
 * Calculate the next scheduled time for a recurring game
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

/**
 * End a game and distribute prizes
 */
async function endGame(supabase: any, game: any, nowIso: string, results: any) {
  try {
    const payoutDistribution: number[] = game.payout_distribution || [0.5, 0.3, 0.2];
    const winnerCount = payoutDistribution.length;

    // Get last comments (winners)
    const { data: comments } = await supabase
      .from('comments')
      .select('user_id, created_at')
      .eq('game_id', game.id)
      .order('created_at', { ascending: false })
      .limit(winnerCount * 2); // Get extra in case of duplicates

    // Get unique winners
    const uniqueWinnerIds: string[] = [];
    for (const comment of comments || []) {
      if (!uniqueWinnerIds.includes(comment.user_id)) {
        uniqueWinnerIds.push(comment.user_id);
      }
      if (uniqueWinnerIds.length >= winnerCount) break;
    }

    const poolValue = game.pool_value;
    const platformCut = Math.floor(poolValue * 0.1);
    const prizePool = poolValue - platformCut;
    
    // Distribute prizes
    for (let i = 0; i < uniqueWinnerIds.length; i++) {
      const winnerId = uniqueWinnerIds[i];
      const prize = Math.floor(prizePool * payoutDistribution[i]);
      const rankPoints = [100, 60, 30, 10, 10, 10, 10, 10, 10, 10][i] || 10;
      
      // Insert winner
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
        description: `${game.name || 'Fastest Finger'} - Position ${i + 1}`,
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
    
    // Mark game as ended
    await supabase
      .from('fastest_finger_games')
      .update({
        status: 'ended',
        end_time: nowIso,
        countdown: 0,
      })
      .eq('id', game.id);
      
    results.gamesEnded++;
    console.log(`[game-lifecycle] ✅ Game ${game.id} ended. Winners: ${uniqueWinnerIds.length}`);
    
    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: game.created_by || '00000000-0000-0000-0000-000000000000',
      action: 'auto_end_game',
      resource_type: 'game',
      resource_id: game.id,
      details: { 
        winners: uniqueWinnerIds.length,
        pool_value: poolValue,
        prize_pool: prizePool,
      },
      ip_address: null,
    });

  } catch (error: any) {
    console.error(`[game-lifecycle] Error ending game ${game.id}:`, error);
    results.errors.push(`End game ${game.id}: ${error.message}`);
  }
}
