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
// Also handles recurrence and settlement

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

    // 1. Transition SCHEDULED games to OPEN when scheduled_at is reached
    const { data: scheduledGames } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'scheduled')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now.toISOString());

    for (const game of (scheduledGames || []) as GameRow[]) {
      console.log(`[game-lifecycle] Opening game ${game.id} (${game.name})`);
      
      // Calculate when game should go live based on countdown
      const liveAt = new Date(now.getTime() + (game.countdown * 1000));
      
      await supabase
        .from('fastest_finger_games')
        .update({
          status: 'open',
          lobby_opens_at: now.toISOString(),
          start_time: liveAt.toISOString(),
        })
        .eq('id', game.id);
    }

    // 2. Transition OPEN games to LIVE when start_time is reached
    const { data: openGames } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'open')
      .not('start_time', 'is', null)
      .lte('start_time', now.toISOString());

    for (const game of (openGames || []) as GameRow[]) {
      // Check minimum participants
      if (game.participant_count < game.min_participants) {
        console.log(`[game-lifecycle] Game ${game.id} cancelled - insufficient participants (${game.participant_count}/${game.min_participants})`);
        
        // Refund all participants
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
        
        continue;
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
    }

    // 3. Check LIVE games for ending phase (last 5 minutes)
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
      const fiveMinutesMs = 5 * 60 * 1000;
      
      // Check if game should end (countdown reached 0 OR max duration exceeded)
      if (game.countdown <= 0 || remainingMs <= 0) {
        console.log(`[game-lifecycle] Ending game ${game.id} - ${game.countdown <= 0 ? 'countdown reached 0' : 'max duration exceeded'}`);
        await endGame(supabase, game);
        continue;
      }
      
      // Check if entering "ending soon" phase
      if (remainingMs <= fiveMinutesMs && game.status !== 'ending') {
        console.log(`[game-lifecycle] Game ${game.id} entering ending phase`);
        // We could update status to 'ending' but for now we just let frontend calculate this
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
      
      const liveAt = new Date(now.getTime() + (game.countdown * 1000));
      
      await supabase
        .from('fastest_finger_games')
        .update({
          status: 'open',
          lobby_opens_at: now.toISOString(),
          start_time: liveAt.toISOString(),
        })
        .eq('id', game.id);
    }

    return new Response(JSON.stringify({ 
      success: true,
      processed: {
        opened: scheduledGames?.length || 0,
        started: openGames?.length || 0,
        checked: liveGames?.length || 0,
        immediate: immediateGames?.length || 0,
      },
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
async function endGame(supabase: any, game: GameRow) {
  const now = new Date();
  const payoutDistribution = game.payout_distribution || [0.5, 0.3, 0.2];
  const winnerCount = payoutDistribution.length;
  const platformCut = game.platform_cut_percentage || 10;

  // Get last comments (unique users)
  const { data: comments } = await supabase
    .from('comments')
    .select('user_id, created_at')
    .eq('game_id', game.id)
    .order('created_at', { ascending: false })
    .limit(winnerCount * 3); // Get more to ensure we have enough unique users

  const uniqueWinnerIds: string[] = [];
  for (const comment of comments || []) {
    if (!uniqueWinnerIds.includes(comment.user_id)) {
      uniqueWinnerIds.push(comment.user_id);
    }
    if (uniqueWinnerIds.length >= winnerCount) break;
  }

  // Calculate prize pool
  const effectivePool = game.pool_value + (game.is_sponsored ? (game.sponsored_amount || 0) : 0);
  const platformAmount = Math.floor(effectivePool * (platformCut / 100));
  const prizePool = effectivePool - platformAmount;

  console.log(`[game-lifecycle] Game ${game.id} settlement: pool=${effectivePool}, platform=${platformAmount}, prizes=${prizePool}, winners=${uniqueWinnerIds.length}`);

  // Process winners
  for (let i = 0; i < uniqueWinnerIds.length; i++) {
    const winnerId = uniqueWinnerIds[i];
    const position = i + 1;
    const prize = Math.floor(prizePool * payoutDistribution[i]);
    
    // Insert winner record
    await supabase.from('winners').insert({
      game_id: game.id,
      user_id: winnerId,
      position,
      amount_won: prize,
    });
    
    // Get current profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance, rank_points, total_wins')
      .eq('id', winnerId)
      .single();
    
    if (profile) {
      // Calculate rank points based on position
      const rankPoints = position === 1 ? 100 : position === 2 ? 60 : position === 3 ? 30 : 10;
      
      // Update profile
      await supabase
        .from('profiles')
        .update({
          wallet_balance: profile.wallet_balance + prize,
          rank_points: profile.rank_points + rankPoints,
          total_wins: profile.total_wins + 1,
        })
        .eq('id', winnerId);
      
      // Record transaction
      await supabase.from('wallet_transactions').insert({
        user_id: winnerId,
        type: 'win',
        amount: prize,
        game_id: game.id,
        description: `${game.name} - Position ${position}`,
      });
      
      // Record rank history
      await supabase.from('rank_history').insert({
        user_id: winnerId,
        points: rankPoints,
        reason: `Position ${position} in ${game.name}`,
        game_id: game.id,
      });
    }
  }

  // Update games_played for all participants
  const { data: participants } = await supabase
    .from('fastest_finger_participants')
    .select('user_id')
    .eq('game_id', game.id);

  for (const p of participants || []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('games_played')
      .eq('id', p.user_id)
      .single();
    
    if (profile) {
      await supabase
        .from('profiles')
        .update({ games_played: profile.games_played + 1 })
        .eq('id', p.user_id);
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

  // Handle recurrence - create next game if applicable
  if (game.recurrence_type && game.recurrence_interval) {
    await createRecurringGame(supabase, game, now);
  }
}

// Create next recurring game instance
async function createRecurringGame(supabase: any, baseGame: GameRow, now: Date) {
  let nextScheduledAt: Date;
  
  switch (baseGame.recurrence_type) {
    case 'minutes':
      nextScheduledAt = new Date(now.getTime() + (baseGame.recurrence_interval! * 60 * 1000));
      break;
    case 'hours':
      nextScheduledAt = new Date(now.getTime() + (baseGame.recurrence_interval! * 60 * 60 * 1000));
      break;
    case 'daily':
      nextScheduledAt = new Date(now.getTime() + (24 * 60 * 60 * 1000));
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

  console.log(`[game-lifecycle] Creating recurring game from ${baseGame.id}, next at ${nextScheduledAt.toISOString()}`);

  await supabase.from('fastest_finger_games').insert({
    name: baseGame.name,
    entry_fee: baseGame.entry_fee,
    max_duration: baseGame.max_duration,
    comment_timer: baseGame.comment_timer,
    payout_type: baseGame.payout_type,
    payout_distribution: baseGame.payout_distribution,
    min_participants: baseGame.min_participants,
    countdown: baseGame.countdown,
    recurrence_type: baseGame.recurrence_type,
    recurrence_interval: baseGame.recurrence_interval,
    is_sponsored: baseGame.is_sponsored,
    sponsored_amount: baseGame.sponsored_amount,
    platform_cut_percentage: baseGame.platform_cut_percentage,
    go_live_type: 'scheduled',
    scheduled_at: nextScheduledAt.toISOString(),
    visibility: baseGame.visibility,
    entry_cutoff_minutes: baseGame.entry_cutoff_minutes,
    status: 'scheduled',
    pool_value: 0,
    participant_count: 0,
  });
}