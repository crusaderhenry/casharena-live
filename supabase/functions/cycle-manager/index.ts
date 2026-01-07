import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GameTemplate {
  id: string;
  name: string;
  game_type: string;
  entry_mode: string;
  entry_fee: number;
  sponsored_prize_amount: number;
  winner_count: number;
  prize_distribution: number[];
  max_live_duration: number;
  comment_timer: number;
  open_entry_duration: number;
  waiting_duration: number;
  recurrence_type: string;
  recurrence_start_time: string;
  allow_spectators: boolean;
  min_participants: number;
  platform_cut_percentage: number;
  is_active: boolean;
}

interface GameCycle {
  id: string;
  template_id: string;
  status: string;
  entry_open_at: string;
  entry_close_at: string;
  live_start_at: string;
  live_end_at: string;
  countdown: number;
  participant_count: number;
  pool_value: number;
  real_pool_value: number;
  winner_count: number;
  prize_distribution: number[];
  comment_timer: number;
  platform_cut_percentage: number;
  min_participants: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, templateId, cycleId } = await req.json();
    console.log(`[cycle-manager] Action: ${action}, templateId: ${templateId}, cycleId: ${cycleId}`);

    switch (action) {
      case 'tick':
        return await handleTick(supabase);
      case 'create_cycle':
        return await createCycleFromTemplate(supabase, templateId);
      case 'settle_cycle':
        return await settleCycle(supabase, cycleId);
      case 'init_infinity':
        return await initInfinityTemplates(supabase);
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('[cycle-manager] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Main tick function - called every second by cron
async function handleTick(supabase: any) {
  const now = new Date();
  console.log(`[tick] Processing at ${now.toISOString()}`);

  // 1. Process state transitions for active cycles
  const { data: cycles, error: cyclesError } = await supabase
    .from('game_cycles')
    .select('*')
    .in('status', ['waiting', 'opening', 'live', 'ending']);

  if (cyclesError) {
    console.error('[tick] Error fetching cycles:', cyclesError);
    throw cyclesError;
  }

  const results = [];

  for (const cycle of cycles || []) {
    const result = await processStateTransition(supabase, cycle, now);
    if (result) results.push(result);
  }

  // 2. Check for infinity templates that need new cycles
  await checkInfinityTemplates(supabase, now);

  return new Response(
    JSON.stringify({ success: true, processed: results.length, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Process state transition for a single cycle
async function processStateTransition(supabase: any, cycle: GameCycle, now: Date) {
  const nowTime = now.getTime();
  const entryOpenAt = new Date(cycle.entry_open_at).getTime();
  const entryCloseAt = new Date(cycle.entry_close_at).getTime();
  const liveStartAt = new Date(cycle.live_start_at).getTime();
  const liveEndAt = new Date(cycle.live_end_at).getTime();

  let newStatus = cycle.status;
  let updates: any = {};

  switch (cycle.status) {
    case 'waiting':
      if (nowTime >= entryOpenAt) {
        newStatus = 'opening';
        console.log(`[transition] Cycle ${cycle.id}: waiting -> opening`);
      }
      break;

    case 'opening':
      if (nowTime >= liveStartAt) {
        // Check min participants
        if (cycle.participant_count < cycle.min_participants) {
          newStatus = 'cancelled';
          console.log(`[transition] Cycle ${cycle.id}: opening -> cancelled (min participants not met: ${cycle.participant_count}/${cycle.min_participants})`);
          // Refund participants
          await refundCycleParticipants(supabase, cycle.id);
        } else {
          newStatus = 'live';
          updates.countdown = cycle.comment_timer;
          console.log(`[transition] Cycle ${cycle.id}: opening -> live`);
        }
      }
      break;

    case 'live':
      // Decrement countdown
      const newCountdown = Math.max(0, cycle.countdown - 1);
      updates.countdown = newCountdown;

      // Trigger mock comments periodically (every ~3 seconds for activity)
      if (Math.random() < 0.3) {
        try {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/mock-user-service`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ action: 'trigger_comment', cycleId: cycle.id }),
          });
        } catch (e) {
          console.log('[live] Mock comment trigger failed:', e);
        }
      }

      // Check if countdown hit zero OR max duration exceeded
      if (newCountdown <= 0 || nowTime >= liveEndAt) {
        newStatus = 'ending';
        console.log(`[transition] Cycle ${cycle.id}: live -> ending (countdown: ${newCountdown}, time exceeded: ${nowTime >= liveEndAt})`);
      }
      break;

    case 'ending':
      // Settle the game
      await settleCycle(supabase, cycle.id);
      newStatus = 'ended';
      updates.actual_end_at = now.toISOString();
      console.log(`[transition] Cycle ${cycle.id}: ending -> ended`);
      break;
  }

  if (newStatus !== cycle.status || Object.keys(updates).length > 0) {
    updates.status = newStatus;
    const { error } = await supabase
      .from('game_cycles')
      .update(updates)
      .eq('id', cycle.id);

    if (error) {
      console.error(`[transition] Error updating cycle ${cycle.id}:`, error);
    }
    return { cycleId: cycle.id, from: cycle.status, to: newStatus };
  }

  return null;
}

// Check infinity templates and create new cycles if needed
async function checkInfinityTemplates(supabase: any, now: Date) {
  const { data: templates, error } = await supabase
    .from('game_templates')
    .select('*')
    .eq('recurrence_type', 'infinity')
    .eq('is_active', true);

  if (error || !templates) return;

  for (const template of templates) {
    // Check if there's already an active cycle for this template
    const { data: activeCycles } = await supabase
      .from('game_cycles')
      .select('id')
      .eq('template_id', template.id)
      .in('status', ['waiting', 'opening', 'live', 'ending'])
      .limit(1);

    if (!activeCycles || activeCycles.length === 0) {
      // No active cycle - check if we should create one
      // Find the last ended cycle to respect waiting_duration
      const { data: lastCycle } = await supabase
        .from('game_cycles')
        .select('actual_end_at')
        .eq('template_id', template.id)
        .eq('status', 'ended')
        .order('actual_end_at', { ascending: false })
        .limit(1);

      let shouldCreate = true;
      if (lastCycle && lastCycle.length > 0 && lastCycle[0].actual_end_at) {
        const lastEndTime = new Date(lastCycle[0].actual_end_at).getTime();
        const waitUntil = lastEndTime + (template.waiting_duration * 1000);
        shouldCreate = now.getTime() >= waitUntil;
      }

      if (shouldCreate) {
        console.log(`[infinity] Creating new cycle for template ${template.id}`);
        await createCycleFromTemplate(supabase, template.id);
      }
    }
  }
}

// Create a new cycle from a template
async function createCycleFromTemplate(supabase: any, templateId: string) {
  const { data: template, error: templateError } = await supabase
    .from('game_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError || !template) {
    return new Response(
      JSON.stringify({ error: 'Template not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const now = new Date();
  
  // Calculate cycle times (all in WAT - UTC+1)
  const entryOpenAt = new Date(now.getTime() + (template.waiting_duration * 1000));
  const entryCloseAt = new Date(entryOpenAt.getTime() + (template.open_entry_duration * 60 * 1000));
  const liveStartAt = entryCloseAt; // Live starts when entries close
  const liveEndAt = new Date(liveStartAt.getTime() + (template.max_live_duration * 60 * 1000));

  const cycleData = {
    template_id: templateId,
    status: 'waiting',
    entry_open_at: entryOpenAt.toISOString(),
    entry_close_at: entryCloseAt.toISOString(),
    live_start_at: liveStartAt.toISOString(),
    live_end_at: liveEndAt.toISOString(),
    entry_fee: template.entry_fee,
    sponsored_prize_amount: template.sponsored_prize_amount,
    winner_count: template.winner_count,
    prize_distribution: template.prize_distribution,
    comment_timer: template.comment_timer,
    platform_cut_percentage: template.platform_cut_percentage,
    min_participants: template.min_participants,
    allow_spectators: template.allow_spectators,
    countdown: template.comment_timer,
    pool_value: template.entry_mode === 'sponsored' ? template.sponsored_prize_amount : 0,
    real_pool_value: 0,
    participant_count: 0,
  };

  const { data: cycle, error: cycleError } = await supabase
    .from('game_cycles')
    .insert(cycleData)
    .select()
    .single();

  if (cycleError) {
    console.error('[create_cycle] Error:', cycleError);
    return new Response(
      JSON.stringify({ error: cycleError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[create_cycle] Created cycle ${cycle.id} for template ${templateId}`);
  return new Response(
    JSON.stringify({ success: true, cycle }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Settle a cycle - determine winners and distribute prizes
async function settleCycle(supabase: any, cycleId: string) {
  console.log(`[settle] Starting settlement for cycle ${cycleId}`);

  // Get cycle data
  const { data: cycle, error: cycleError } = await supabase
    .from('game_cycles')
    .select('*')
    .eq('id', cycleId)
    .single();

  if (cycleError || !cycle) {
    console.error('[settle] Cycle not found:', cycleError);
    return new Response(
      JSON.stringify({ error: 'Cycle not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if already settled
  if (cycle.settled_at) {
    console.log(`[settle] Cycle ${cycleId} already settled`);
    return new Response(
      JSON.stringify({ success: true, message: 'Already settled' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get the last N commenters (winners) - ordered by server_timestamp DESC
  const { data: comments, error: commentsError } = await supabase
    .from('cycle_comments')
    .select('user_id, server_timestamp')
    .eq('cycle_id', cycleId)
    .order('server_timestamp', { ascending: false });

  if (commentsError) {
    console.error('[settle] Error fetching comments:', commentsError);
    throw commentsError;
  }

  // Get unique commenters in order (last comment wins position)
  const seenUsers = new Set<string>();
  const orderedCommenters: string[] = [];
  
  for (const comment of comments || []) {
    if (!seenUsers.has(comment.user_id)) {
      seenUsers.add(comment.user_id);
      orderedCommenters.push(comment.user_id);
    }
  }

  // Filter out mock users from winners
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, user_type')
    .in('id', orderedCommenters);

  const realUsers = new Set(
    (profiles || [])
      .filter((p: any) => p.user_type !== 'mock')
      .map((p: any) => p.id)
  );

  // Get real winners only
  const realWinners = orderedCommenters.filter(id => realUsers.has(id));

  // Calculate prize pool
  const totalPool = cycle.pool_value + (cycle.sponsored_prize_amount || 0);
  const platformCut = Math.floor(totalPool * (cycle.platform_cut_percentage / 100));
  const distributablePool = totalPool - platformCut;

  const winners: any[] = [];
  const prizeDistribution = cycle.prize_distribution || [50, 30, 20];

  for (let i = 0; i < Math.min(cycle.winner_count, realWinners.length); i++) {
    const userId = realWinners[i];
    const percentage = prizeDistribution[i] || 0;
    const prize = Math.floor(distributablePool * (percentage / 100));

    winners.push({
      cycle_id: cycleId,
      user_id: userId,
      position: i + 1,
      prize_amount: prize,
    });

    // Credit wallet and update stats
    if (prize > 0) {
      // Fetch current profile to update incrementally
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance, rank_points, total_wins')
        .eq('id', userId)
        .single();
      
      if (profile) {
        const rankPoints = [100, 60, 30, 10, 10][i] || 5;
        
        // Update wallet balance and stats
        await supabase
          .from('profiles')
          .update({ 
            wallet_balance: profile.wallet_balance + prize,
            rank_points: profile.rank_points + rankPoints,
            total_wins: profile.total_wins + 1,
          })
          .eq('id', userId);
        
        // Record transaction
        await supabase.from('wallet_transactions').insert({
          user_id: userId,
          type: 'win',
          amount: prize,
          description: `Royal Rumble - Position ${i + 1}`,
        });

        // Record rank history
        await supabase.from('rank_history').insert({
          user_id: userId,
          points: rankPoints,
          reason: `Position ${i + 1} in Royal Rumble`,
        });
        
        console.log(`[settle] Credited ₦${prize} + ${rankPoints} rank points to ${userId}`);
      }
    }

    console.log(`[settle] Winner ${i + 1}: ${userId} wins ₦${prize}`);
  }

  // Insert winners
  if (winners.length > 0) {
    await supabase.from('cycle_winners').insert(winners);
  }

  // Update all participants' games_played
  const { data: participants } = await supabase
    .from('cycle_participants')
    .select('user_id')
    .eq('cycle_id', cycleId)
    .eq('is_spectator', false);

  for (const p of participants || []) {
    // Fetch and update games_played
    const { data: pProfile } = await supabase
      .from('profiles')
      .select('games_played, rank_points')
      .eq('id', p.user_id)
      .single();
    
    if (pProfile) {
      await supabase
        .from('profiles')
        .update({ 
          games_played: pProfile.games_played + 1,
          rank_points: pProfile.rank_points + 5,
        })
        .eq('id', p.user_id);
    }
    
    // Participation rank points
    await supabase.from('rank_history').insert({
      user_id: p.user_id,
      points: 5,
      reason: 'Royal Rumble Participation',
    });
  }

  // Mark cycle as settled
  await supabase
    .from('game_cycles')
    .update({
      settled_at: new Date().toISOString(),
      settlement_data: { winners, platformCut, distributablePool, totalParticipants: participants?.length || 0 },
    })
    .eq('id', cycleId);

  console.log(`[settle] Cycle ${cycleId} settled successfully with ${winners.length} winners`);

  return new Response(
    JSON.stringify({ success: true, winners, platformCut }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Refund all participants in a cancelled cycle
async function refundCycleParticipants(supabase: any, cycleId: string) {
  const { data: cycle } = await supabase
    .from('game_cycles')
    .select('entry_fee')
    .eq('id', cycleId)
    .single();

  if (!cycle || cycle.entry_fee === 0) return;

  const { data: participants } = await supabase
    .from('cycle_participants')
    .select('user_id')
    .eq('cycle_id', cycleId)
    .eq('is_spectator', false);

  for (const p of participants || []) {
    // Refund wallet
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', p.user_id)
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance + cycle.entry_fee })
        .eq('id', p.user_id);

      // Record refund transaction
      await supabase.from('wallet_transactions').insert({
        user_id: p.user_id,
        type: 'refund',
        amount: cycle.entry_fee,
        description: 'Royal Rumble Cancelled - Refund',
      });
    }
  }

  console.log(`[refund] Refunded ${participants?.length || 0} participants for cycle ${cycleId}`);
}

// Initialize infinity templates - create first cycle if needed
async function initInfinityTemplates(supabase: any) {
  const { data: templates } = await supabase
    .from('game_templates')
    .select('id')
    .eq('recurrence_type', 'infinity')
    .eq('is_active', true);

  const results = [];
  for (const t of templates || []) {
    const result = await createCycleFromTemplate(supabase, t.id);
    results.push({ templateId: t.id, result: await result.json() });
  }

  return new Response(
    JSON.stringify({ success: true, initialized: results.length, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}