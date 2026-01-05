import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to verify JWT and get user
async function verifyAuth(req: Request): Promise<{ user: any | null; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Create a client with the user's JWT to verify their identity
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
  
  const { data: { user }, error } = await userClient.auth.getUser();
  
  if (error || !user) {
    console.error('Auth verification error:', error?.message || 'No user found');
    return { user: null, error: 'Invalid or expired token' };
  }

  return { user, error: null };
}

// Helper to check if user has admin role
async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  
  return !!data;
}

// Helper to log admin actions
async function logAuditAction(
  supabase: any,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details: Record<string, any> | null,
  ipAddress: string | null
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ip_address: ipAddress,
    });
  } catch (err) {
    console.error('Failed to log audit action:', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP for audit logging
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('x-real-ip') || null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service key for all operations including auth verification
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, gameId, userId, config } = body;
    console.log(`Game action: ${action}`, { gameId, userId, config });

    // Actions that require authentication
    const authRequiredActions = ['join', 'create_game', 'start_game', 'end_game', 'reset_weekly_ranks'];
    const adminRequiredActions = ['create_game', 'start_game', 'end_game', 'reset_weekly_ranks'];

    let authenticatedUser = null;

    // Verify authentication for protected actions
    if (authRequiredActions.includes(action)) {
      const { user, error } = await verifyAuth(req);
      if (error) {
        return new Response(JSON.stringify({ error }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      authenticatedUser = user;

      // Verify admin role for admin actions
      if (adminRequiredActions.includes(action)) {
        const hasAdminRole = await isAdmin(supabase, user.id);
        if (!hasAdminRole) {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    switch (action) {
      case 'create_game': {
        // Admin only - already verified above
        const gameConfig = config || {};
        
        // Calculate scheduled_at based on go_live_type
        let scheduledAt = null;
        if (gameConfig.go_live_type === 'scheduled' && gameConfig.scheduled_at) {
          scheduledAt = gameConfig.scheduled_at;
        }
        
        const { data: game, error } = await supabase
          .from('fastest_finger_games')
          .insert({
            status: 'scheduled',
            name: gameConfig.name || 'Fastest Finger',
            description: gameConfig.description || null,
            entry_fee: gameConfig.entry_fee || 700,
            max_duration: gameConfig.max_duration || 20,
            pool_value: 0,
            participant_count: 0,
            countdown: gameConfig.countdown || 60,
            comment_timer: gameConfig.comment_timer || 60,
            payout_type: gameConfig.payout_type || 'top3',
            payout_distribution: gameConfig.payout_distribution || [0.5, 0.3, 0.2],
            min_participants: gameConfig.min_participants || 3,
            created_by: authenticatedUser?.id,
            go_live_type: gameConfig.go_live_type || 'immediate',
            scheduled_at: scheduledAt,
            recurrence_type: gameConfig.recurrence_type || null,
            recurrence_interval: gameConfig.recurrence_interval || null,
            is_sponsored: gameConfig.is_sponsored || false,
            sponsored_amount: gameConfig.sponsored_amount || 0,
            platform_cut_percentage: gameConfig.platform_cut_percentage || 10,
            visibility: 'public',
          })
          .select()
          .single();

        if (error) throw error;
        
        // Log audit action
        await logAuditAction(supabase, authenticatedUser!.id, 'create_game', 'game', game.id, gameConfig, clientIp);
        
        console.log('Game created by admin:', authenticatedUser?.id, game.id);
        return new Response(JSON.stringify({ success: true, game }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'join': {
        // Verify user is joining as themselves
        if (userId !== authenticatedUser?.id) {
          return new Response(JSON.stringify({ error: 'Cannot join as another user' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!gameId) throw new Error('Missing gameId');

        // Use atomic database function to prevent race conditions
        // This wraps all operations (check, deduct, insert, update) in a single transaction
        const { data: result, error: rpcError } = await supabase
          .rpc('join_game_atomic', {
            p_game_id: gameId,
            p_user_id: userId,
          });

        if (rpcError) {
          console.error('Join game RPC error:', rpcError);
          throw new Error('Failed to join game');
        }

        if (!result.success) {
          return new Response(JSON.stringify({ error: result.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (result.alreadyJoined) {
          return new Response(JSON.stringify({ success: true, alreadyJoined: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('User joined game:', userId, gameId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'start_game': {
        // Admin only - already verified above
        if (!gameId) throw new Error('Missing gameId');

        const { data: game } = await supabase
          .from('fastest_finger_games')
          .select('*')
          .eq('id', gameId)
          .single();

        const commentTimer = (game as any)?.comment_timer || 60;

        const { error } = await supabase
          .from('fastest_finger_games')
          .update({
            status: 'live',
            start_time: new Date().toISOString(),
            countdown: commentTimer,
          })
          .eq('id', gameId);

        if (error) throw error;
        
        // Log audit action
        await logAuditAction(supabase, authenticatedUser!.id, 'start_game', 'game', gameId, { participant_count: (game as any)?.participant_count }, clientIp);
        
        console.log('Game started by admin:', authenticatedUser?.id, gameId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'end_game': {
        // Admin only - already verified above
        if (!gameId) throw new Error('Missing gameId');

        const { data: game, error: gameError } = await supabase
          .from('fastest_finger_games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (gameError || !game) throw new Error('Game not found');

        const payoutType = (game as any).payout_type || 'top3';
        const payoutDistribution: number[] = (game as any).payout_distribution || [0.5, 0.3, 0.2];
        const winnerCount = payoutDistribution.length;

        const { data: lastComments, error: commentsError } = await supabase
          .from('comments')
          .select('user_id, created_at')
          .eq('game_id', gameId)
          .order('created_at', { ascending: false })
          .limit(winnerCount);

        if (commentsError) throw commentsError;

        const uniqueWinnerIds: string[] = [];
        for (const comment of lastComments || []) {
          if (!uniqueWinnerIds.includes(comment.user_id)) {
            uniqueWinnerIds.push(comment.user_id);
          }
          if (uniqueWinnerIds.length >= winnerCount) break;
        }

        const { data: winnerProfiles } = await supabase
          .from('profiles')
          .select('id, username, avatar, wallet_balance, rank_points, total_wins')
          .in('id', uniqueWinnerIds);

        const profileMap = new Map(winnerProfiles?.map(p => [p.id, p]) || []);

        const netPool = Math.floor(game.pool_value * 0.9);
        const platformCut = game.pool_value - netPool;
        const prizes = payoutDistribution.map(pct => Math.floor(netPool * pct));

        const winners: any[] = [];

        for (let i = 0; i < uniqueWinnerIds.length; i++) {
          const winnerId = uniqueWinnerIds[i];
          const position = i + 1;
          const prize = prizes[i] || 0;
          const profile = profileMap.get(winnerId);

          if (!profile) continue;

          await supabase.from('winners').insert({
            game_id: gameId,
            user_id: winnerId,
            position,
            amount_won: prize,
          });

          const rankPoints = position === 1 ? 100 : position === 2 ? 60 : position === 3 ? 30 : 10;

          await supabase
            .from('profiles')
            .update({
              wallet_balance: profile.wallet_balance + prize,
              rank_points: profile.rank_points + rankPoints,
              total_wins: profile.total_wins + 1,
            })
            .eq('id', winnerId);

          await supabase.from('wallet_transactions').insert({
            user_id: winnerId,
            type: 'win',
            amount: prize,
            description: `${(game as any).name || 'Fastest Finger'} - Position ${position}`,
            game_id: gameId,
          });

          await supabase.from('rank_history').insert({
            user_id: winnerId,
            points: rankPoints,
            reason: `Position ${position} finish`,
            game_id: gameId,
          });

          winners.push({
            user_id: winnerId,
            username: profile.username,
            avatar: profile.avatar,
            position,
            amount_won: prize,
          });
        }

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

        await supabase
          .from('fastest_finger_games')
          .update({
            status: 'ended',
            end_time: new Date().toISOString(),
          })
          .eq('id', gameId);

        // Log audit action
        await logAuditAction(supabase, authenticatedUser!.id, 'end_game', 'game', gameId, { 
          winner_count: winners.length, 
          pool_value: game.pool_value,
          platform_cut: platformCut 
        }, clientIp);

        console.log('Game ended by admin:', authenticatedUser?.id, gameId, 'Winners:', winners.length);
        return new Response(JSON.stringify({ success: true, winners, platformCut }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_countdown': {
        // Internal use only - no auth (called by cron)
        if (!gameId) throw new Error('Missing gameId');
        const { countdown } = body;

        await supabase
          .from('fastest_finger_games')
          .update({ countdown })
          .eq('id', gameId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'reset_weekly_ranks': {
        // Admin only - already verified above
        await supabase
          .from('profiles')
          .update({ rank_points: 0, weekly_rank: null });

        // Log audit action
        await logAuditAction(supabase, authenticatedUser!.id, 'reset_weekly_ranks', 'system', null, null, clientIp);

        console.log('Weekly ranks reset by admin:', authenticatedUser?.id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    // Log detailed error for debugging (server-side only)
    const internalMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Game manager error:', internalMessage);
    
    // Return generic error to client to prevent information disclosure
    return new Response(JSON.stringify({ error: 'An error occurred processing your request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});