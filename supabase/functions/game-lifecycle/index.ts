import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cronSecret = Deno.env.get('CRON_SECRET');

// Game Lifecycle Manager
// Handles automated game state transitions:
// scheduled -> open -> live -> ending -> ended
// Also handles recurrence, auto-restart, and settlement

interface GameRow {
  id: string;
  name: string;
  status: string;
  scheduled_at: string | null;
  start_time: string | null;
  end_time: string | null;
  max_duration: number;
  comment_timer: number;
  countdown: number;
  pool_value: number;
  participant_count: number;
  entry_fee: number;
  payout_type: string;
  payout_distribution: number[];
  min_participants: number;
  recurrence_type: string | null;
  recurrence_interval: number | null;
  is_sponsored: boolean;
  sponsored_amount: number | null;
  platform_cut_percentage: number;
  go_live_type: string;
  visibility: string;
  entry_cutoff_minutes: number;
  // New fields
  auto_restart: boolean;
  fixed_daily_time: string | null;
  entry_wait_seconds: number;
  min_participants_action: 'cancel' | 'reset' | 'start_anyway';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify cron secret for automated calls
    const cronHeader = req.headers.get('x-cron-secret');
    const isCronJob = cronSecret && cronHeader === cronSecret;
    
    // Also allow admin JWT auth
    const authHeader = req.headers.get('Authorization');
    let isAdmin = false;
    
    if (!isCronJob && authHeader) {
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const token = authHeader.replace('Bearer ', '');
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        isAdmin = !!roleData;
      }
    }
    
    if (!isCronJob && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    console.log(`[game-lifecycle] Running at ${now.toISOString()}`);

    const results = {
      opened: 0,
      started: 0,
      ended: 0,
      reset: 0,
      cancelled: 0,
      immediate: 0,
      recurring: 0,
    };

    // 1. Transition SCHEDULED games to OPEN when scheduled_at is reached
    const { data: scheduledGames } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'scheduled')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now.toISOString());

    for (const game of (scheduledGames || []) as GameRow[]) {
      console.log(`[game-lifecycle] Opening game ${game.id} (${game.name})`);
      
      // Use entry_wait_seconds for the lobby countdown
      const entryWait = game.entry_wait_seconds || game.countdown || 60;
      const liveAt = new Date(now.getTime() + (entryWait * 1000));
      
      await supabase
        .from('fastest_finger_games')
        .update({
          status: 'open',
          lobby_opens_at: now.toISOString(),
          start_time: liveAt.toISOString(),
          countdown: entryWait,
        })
        .eq('id', game.id);
      
      results.opened++;
    }

    // 2. Transition OPEN games to LIVE when start_time is reached
    const { data: openGames } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'open')
      .not('start_time', 'is', null)
      .lte('start_time', now.toISOString());

    for (const game of (openGames || []) as GameRow[]) {
      const minAction = game.min_participants_action || 'reset';
      
      // Check minimum participants
      if (game.participant_count < game.min_participants) {
        console.log(`[game-lifecycle] Game ${game.id} has ${game.participant_count}/${game.min_participants} participants`);
        
        if (minAction === 'reset') {
          // Reset countdown and keep waiting
          const entryWait = game.entry_wait_seconds || game.countdown || 60;
          const newLiveAt = new Date(now.getTime() + (entryWait * 1000));
          
          console.log(`[game-lifecycle] Resetting countdown for game ${game.id}`);
          
          await supabase
            .from('fastest_finger_games')
            .update({
              countdown: entryWait,
              start_time: newLiveAt.toISOString(),
            })
            .eq('id', game.id);
          
          results.reset++;
          continue;
        } else if (minAction === 'cancel') {
          // Refund all participants and cancel
          console.log(`[game-lifecycle] Cancelling game ${game.id} - insufficient participants`);
          
          const { data: participants } = await supabase
            .from('fastest_finger_participants')
            .select('user_id')
            .eq('game_id', game.id);
          
          for (const p of participants || []) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('wallet_balance')
              .eq('id', p.user_id)
              .single();
            
            if (profile) {
              await supabase
                .from('profiles')
                .update({ wallet_balance: profile.wallet_balance + game.entry_fee })
                .eq('id', p.user_id);
              
              await supabase.from('wallet_transactions').insert({
                user_id: p.user_id,
                type: 'refund',
                amount: game.entry_fee,
                description: `${game.name} cancelled - insufficient players`,
                game_id: game.id,
              });
            }
          }
          
          await supabase
            .from('fastest_finger_games')
            .update({ status: 'cancelled', end_time: now.toISOString() })
            .eq('id', game.id);
          
          // Handle auto-restart or recurrence after cancellation
          if (game.auto_restart || game.recurrence_type) {
            await createNextGame(supabase, game, now);
            results.recurring++;
          }
          
          results.cancelled++;
          continue;
        }
        // start_anyway - fall through to start the game
      }
      
      console.log(`[game-lifecycle] Starting game ${game.id} (${game.name}) LIVE`);
      
      await supabase
        .from('fastest_finger_games')
        .update({
          status: 'live',
          start_time: now.toISOString(),
          countdown: game.comment_timer,
        })
        .eq('id', game.id);
      
      results.started++;
    }

    // 3. Check LIVE games for ending
    const { data: liveGames } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'live');

    for (const game of (liveGames || []) as GameRow[]) {
      if (!game.start_time) continue;
      
      const startTime = new Date(game.start_time).getTime();
      const elapsedMs = now.getTime() - startTime;
      const maxDurationMs = game.max_duration * 60 * 1000;
      const remainingMs = maxDurationMs - elapsedMs;
      
      // Check if game should end (countdown reached 0 OR max duration exceeded)
      if (game.countdown <= 0 || remainingMs <= 0) {
        console.log(`[game-lifecycle] Ending game ${game.id} - ${game.countdown <= 0 ? 'countdown reached 0' : 'max duration exceeded'}`);
        await endGame(supabase, game, now);
        results.ended++;
      }
    }

    // 4. Handle IMMEDIATE go_live_type games that were just created
    const { data: immediateGames } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'scheduled')
      .eq('go_live_type', 'immediate')
      .is('scheduled_at', null);

    for (const game of (immediateGames || []) as GameRow[]) {
      console.log(`[game-lifecycle] Immediately opening game ${game.id} (${game.name})`);
      
      const entryWait = game.entry_wait_seconds || game.countdown || 60;
      const liveAt = new Date(now.getTime() + (entryWait * 1000));
      
      await supabase
        .from('fastest_finger_games')
        .update({
          status: 'open',
          lobby_opens_at: now.toISOString(),
          start_time: liveAt.toISOString(),
          countdown: entryWait,
        })
        .eq('id', game.id);
      
      results.immediate++;
    }

    return new Response(JSON.stringify({ 
      success: true,
      processed: results,
      timestamp: now.toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[game-lifecycle] Error:', message);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// End game and settle payouts
async function endGame(supabase: any, game: GameRow, now: Date) {
  const payoutDistribution = game.payout_distribution || [0.5, 0.3, 0.2];
  const winnerCount = payoutDistribution.length;
  const platformCut = game.platform_cut_percentage || 10;

  // CRITICAL: Check for edge case - no participants means no valid game
  if (game.participant_count === 0) {
    console.warn(`[game-lifecycle] WARNING: Game ${game.id} has 0 participants - ending without winners`);
    
    // Just mark as ended with no winners
    await supabase
      .from('fastest_finger_games')
      .update({
        status: 'ended',
        end_time: now.toISOString(),
        countdown: 0,
      })
      .eq('id', game.id);

    // Handle auto-restart or recurrence even for empty games
    if (game.auto_restart || game.recurrence_type) {
      await createNextGame(supabase, game, now);
    }
    return;
  }

  // Check for edge case - pool_value is 0 but has participants (entry wasn't deducted)
  if (game.pool_value === 0 && !game.is_sponsored) {
    console.warn(`[game-lifecycle] WARNING: Game ${game.id} has ${game.participant_count} participants but pool_value is 0 - this indicates join_game_atomic may have failed`);
  }

  // Fetch rank points configuration from platform_settings
  const { data: platformSettings } = await supabase
    .from('platform_settings')
    .select('rank_points_win_1st, rank_points_win_2nd, rank_points_win_3rd, rank_points_participation')
    .single();

  const rankPointsConfig = {
    win1st: platformSettings?.rank_points_win_1st ?? 100,
    win2nd: platformSettings?.rank_points_win_2nd ?? 60,
    win3rd: platformSettings?.rank_points_win_3rd ?? 30,
    participation: platformSettings?.rank_points_participation ?? 5,
  };

  console.log(`[game-lifecycle] Using rank points config:`, rankPointsConfig);

  // Get all participants FIRST and increment games_played + award participation points
  const { data: participants } = await supabase
    .from('fastest_finger_participants')
    .select('user_id')
    .eq('game_id', game.id);

  const participantIds = new Set((participants || []).map((p: any) => p.user_id));
  
  // Increment games_played and award participation points for all participants BEFORE processing winners
  for (const p of participants || []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('games_played, rank_points')
      .eq('id', p.user_id)
      .single();
    
    if (profile) {
      await supabase
        .from('profiles')
        .update({ 
          games_played: profile.games_played + 1,
          rank_points: profile.rank_points + rankPointsConfig.participation,
        })
        .eq('id', p.user_id);

      // Record participation rank points
      if (rankPointsConfig.participation > 0) {
        await supabase.from('rank_history').insert({
          user_id: p.user_id,
          points: rankPointsConfig.participation,
          reason: `Participated in ${game.name}`,
          game_id: game.id,
        });
      }
    }
  }

  // Get last comments (unique users) - only from participants
  const { data: comments } = await supabase
    .from('comments')
    .select('user_id, created_at')
    .eq('game_id', game.id)
    .order('created_at', { ascending: false })
    .limit(winnerCount * 3);

  const uniqueWinnerIds: string[] = [];
  for (const comment of comments || []) {
    // Only count as winner if they were a participant
    if (participantIds.has(comment.user_id) && !uniqueWinnerIds.includes(comment.user_id)) {
      uniqueWinnerIds.push(comment.user_id);
    }
    if (uniqueWinnerIds.length >= winnerCount) break;
  }

  // Calculate prize pool
  const effectivePool = game.pool_value + (game.is_sponsored ? (game.sponsored_amount || 0) : 0);
  const platformAmount = Math.floor(effectivePool * (platformCut / 100));
  const prizePool = effectivePool - platformAmount;

  console.log(`[game-lifecycle] Game ${game.id} settlement: pool=${effectivePool}, platform=${platformAmount}, prizes=${prizePool}, winners=${uniqueWinnerIds.length}`);

  // Process winners (games_played already incremented above)
  for (let i = 0; i < uniqueWinnerIds.length; i++) {
    const winnerId = uniqueWinnerIds[i];
    const position = i + 1;
    const prize = Math.floor(prizePool * payoutDistribution[i]);
    
    await supabase.from('winners').insert({
      game_id: game.id,
      user_id: winnerId,
      position,
      amount_won: prize,
    });
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance, rank_points, total_wins')
      .eq('id', winnerId)
      .single();
    
    if (profile) {
      // Get position-based rank points from config
      const winRankPoints = position === 1 ? rankPointsConfig.win1st 
        : position === 2 ? rankPointsConfig.win2nd 
        : position === 3 ? rankPointsConfig.win3rd 
        : 10;
      
      await supabase
        .from('profiles')
        .update({
          wallet_balance: profile.wallet_balance + prize,
          rank_points: profile.rank_points + winRankPoints,
          total_wins: profile.total_wins + 1,
        })
        .eq('id', winnerId);
      
      await supabase.from('wallet_transactions').insert({
        user_id: winnerId,
        type: 'win',
        amount: prize,
        game_id: game.id,
        description: `${game.name} - Position ${position}`,
      });
      
      await supabase.from('rank_history').insert({
        user_id: winnerId,
        points: winRankPoints,
        reason: `Position ${position} in ${game.name}`,
        game_id: game.id,
      });
    }
  }

  // Mark game as ended
  await supabase
    .from('fastest_finger_games')
    .update({
      status: 'ended',
      end_time: now.toISOString(),
      countdown: 0,
    })
    .eq('id', game.id);

  // Handle auto-restart or recurrence
  if (game.auto_restart || game.recurrence_type) {
    await createNextGame(supabase, game, now);
  }
}

// Create next game instance (for auto-restart or recurrence)
async function createNextGame(supabase: any, baseGame: GameRow, now: Date) {
  let nextScheduledAt: Date | null = null;
  let goLiveType = 'scheduled';
  
  // Auto-restart: immediately open for entries (no scheduled time)
  if (baseGame.auto_restart) {
    console.log(`[game-lifecycle] Auto-restarting game from ${baseGame.id}`);
    goLiveType = 'immediate';
    nextScheduledAt = null;
  } else if (baseGame.recurrence_type) {
    // Calculate next scheduled time based on recurrence
    switch (baseGame.recurrence_type) {
      case 'minutes':
        nextScheduledAt = new Date(now.getTime() + (baseGame.recurrence_interval! * 60 * 1000));
        break;
      case 'hours':
        nextScheduledAt = new Date(now.getTime() + (baseGame.recurrence_interval! * 60 * 60 * 1000));
        break;
      case 'daily':
        if (baseGame.fixed_daily_time) {
          // Use fixed daily time
          const [hours, minutes] = baseGame.fixed_daily_time.split(':').map(Number);
          nextScheduledAt = new Date(now);
          nextScheduledAt.setDate(nextScheduledAt.getDate() + 1);
          nextScheduledAt.setHours(hours, minutes, 0, 0);
        } else {
          // Same time tomorrow
          nextScheduledAt = new Date(now.getTime() + (24 * 60 * 60 * 1000));
        }
        break;
      case 'weekly':
        nextScheduledAt = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
        break;
      case 'monthly':
        nextScheduledAt = new Date(now);
        nextScheduledAt.setMonth(nextScheduledAt.getMonth() + 1);
        break;
      default:
        return;
    }
    
    console.log(`[game-lifecycle] Creating recurring game from ${baseGame.id}, next at ${nextScheduledAt?.toISOString()}`);
  } else {
    return; // No auto-restart or recurrence
  }

  await supabase.from('fastest_finger_games').insert({
    name: baseGame.name,
    entry_fee: baseGame.entry_fee,
    max_duration: baseGame.max_duration,
    comment_timer: baseGame.comment_timer,
    payout_type: baseGame.payout_type,
    payout_distribution: baseGame.payout_distribution,
    min_participants: baseGame.min_participants,
    countdown: baseGame.entry_wait_seconds || baseGame.countdown || 60,
    recurrence_type: baseGame.recurrence_type,
    recurrence_interval: baseGame.recurrence_interval,
    is_sponsored: baseGame.is_sponsored,
    sponsored_amount: baseGame.sponsored_amount,
    platform_cut_percentage: baseGame.platform_cut_percentage,
    go_live_type: goLiveType,
    scheduled_at: nextScheduledAt?.toISOString() || null,
    visibility: baseGame.visibility,
    entry_cutoff_minutes: baseGame.entry_cutoff_minutes,
    // New fields
    auto_restart: baseGame.auto_restart,
    fixed_daily_time: baseGame.fixed_daily_time,
    entry_wait_seconds: baseGame.entry_wait_seconds,
    min_participants_action: baseGame.min_participants_action,
    status: 'scheduled',
    pool_value: 0,
    participant_count: 0,
  });
}