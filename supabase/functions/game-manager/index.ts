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
  
  // Use service role key for more reliable token validation
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.error('[game-manager] Auth verification error:', error?.message || 'No user found');
    return { user: null, error: 'Invalid or expired token. Please refresh and try again.' };
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
    const { action, gameId, userId, config, reason } = body;
    console.log(`Game action: ${action}`, { gameId, userId, config, reason });

    // Actions that require authentication
    const authRequiredActions = ['join', 'create_game', 'update_game', 'start_game', 'end_game', 'cancel_game', 'delete_game', 'reset_weekly_ranks'];
    const adminRequiredActions = ['create_game', 'update_game', 'start_game', 'end_game', 'cancel_game', 'delete_game', 'reset_weekly_ranks'];

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
        
        // Use nullish coalescing to allow 0 values for entry_fee (sponsored games)
        const entryFee = gameConfig.entry_fee ?? 700;
        
        const { data: game, error } = await supabase
          .from('fastest_finger_games')
          .insert({
            status: 'scheduled',
            name: gameConfig.name || 'Fastest Finger',
            description: gameConfig.description || null,
            entry_fee: entryFee,
            max_duration: gameConfig.max_duration || 20,
            pool_value: 0,
            participant_count: 0,
            countdown: gameConfig.entry_wait_seconds || gameConfig.countdown || 60,
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
            // New automation fields
            auto_restart: gameConfig.auto_restart || false,
            fixed_daily_time: gameConfig.fixed_daily_time || null,
            entry_wait_seconds: gameConfig.entry_wait_seconds || 60,
            min_participants_action: gameConfig.min_participants_action || 'reset',
            // Music settings
            music_type: gameConfig.music_type || 'generated',
            lobby_music_url: gameConfig.lobby_music_url || null,
            arena_music_url: gameConfig.arena_music_url || null,
            tense_music_url: gameConfig.tense_music_url || null,
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

        // Get mock user IDs for this game to filter them out
        const { data: mockParticipants } = await supabase
          .from('mock_game_participation')
          .select('mock_user_id')
          .eq('game_id', gameId);
        
        const mockUserIds = new Set(mockParticipants?.map(m => m.mock_user_id) || []);

        // Get all recent comments
        const { data: lastComments, error: commentsError } = await supabase
          .from('comments')
          .select('user_id, created_at')
          .eq('game_id', gameId)
          .order('created_at', { ascending: false })
          .limit(winnerCount * 3); // Get more to account for mock users

        if (commentsError) throw commentsError;

        // Filter out mock users and get unique real winners
        const uniqueRealWinnerIds: string[] = [];
        const displayWinnerIds: string[] = []; // For visual display (includes mock users)
        
        for (const comment of lastComments || []) {
          // Track display order (includes mock users for visual)
          if (!displayWinnerIds.includes(comment.user_id) && displayWinnerIds.length < winnerCount) {
            displayWinnerIds.push(comment.user_id);
          }
          
          // Track real winners (excludes mock users for payouts)
          if (!mockUserIds.has(comment.user_id) && !uniqueRealWinnerIds.includes(comment.user_id)) {
            uniqueRealWinnerIds.push(comment.user_id);
          }
          if (uniqueRealWinnerIds.length >= winnerCount) break;
        }

        // Get real winner profiles (only real users get paid)
        const { data: winnerProfiles } = await supabase
          .from('profiles')
          .select('id, username, avatar, wallet_balance, rank_points, total_wins, user_type')
          .in('id', uniqueRealWinnerIds);

        const profileMap = new Map(winnerProfiles?.map(p => [p.id, p]) || []);

        // Use real_pool_value for actual payouts (only real money)
        const realPool = (game as any).real_pool_value || game.pool_value;
        const netPool = Math.floor(realPool * 0.9);
        const platformCut = realPool - netPool;
        const prizes = payoutDistribution.map(pct => Math.floor(netPool * pct));

        const winners: any[] = [];
        const displayWinners: any[] = [];

        // Process real winners for actual payouts
        for (let i = 0; i < uniqueRealWinnerIds.length; i++) {
          const winnerId = uniqueRealWinnerIds[i];
          const position = i + 1;
          const prize = prizes[i] || 0;
          const profile = profileMap.get(winnerId);

          if (!profile) continue;
          
          // Skip if somehow a mock user got through
          if (profile.user_type === 'mock') {
            console.log('Skipping mock user from payout:', winnerId);
            continue;
          }

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
            is_mock: false,
          });
        }

        // Build display winners list (includes mock users visually, but they got no payout)
        for (let i = 0; i < displayWinnerIds.length; i++) {
          const userId = displayWinnerIds[i];
          const isMock = mockUserIds.has(userId);
          
          if (isMock) {
            // Get mock user info
            const { data: mockUser } = await supabase
              .from('mock_users')
              .select('username, avatar, virtual_wins, virtual_rank_points')
              .eq('id', userId)
              .single();
            
            if (mockUser) {
              // Update virtual stats for mock user
              await supabase
                .from('mock_users')
                .update({ 
                  virtual_wins: mockUser.virtual_wins + 1,
                  virtual_rank_points: mockUser.virtual_rank_points + (i === 0 ? 100 : i === 1 ? 60 : 30),
                })
                .eq('id', userId);
              
              // Record mock user final position
              await supabase
                .from('mock_game_participation')
                .update({ final_position: i + 1 })
                .eq('game_id', gameId)
                .eq('mock_user_id', userId);
              
              displayWinners.push({
                user_id: userId,
                username: mockUser.username,
                avatar: mockUser.avatar,
                position: i + 1,
                amount_won: 0, // Mock users get nothing
                is_mock: true,
              });
            }
          } else {
            const realWinner = winners.find(w => w.user_id === userId);
            if (realWinner) {
              displayWinners.push(realWinner);
            }
          }
        }

        // Update games_played for real participants only
        const { data: participants } = await supabase
          .from('fastest_finger_participants')
          .select('user_id')
          .eq('game_id', gameId);

        if (participants) {
          for (const p of participants) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('games_played, user_type')
              .eq('id', p.user_id)
              .single();

            if (profileData && profileData.user_type !== 'mock') {
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

        // Clean up mock game participation
        await supabase
          .from('mock_game_participation')
          .delete()
          .eq('game_id', gameId);

        // Log audit action
        await logAuditAction(supabase, authenticatedUser!.id, 'end_game', 'game', gameId, { 
          winner_count: winners.length,
          mock_winner_count: displayWinners.filter(w => w.is_mock).length,
          display_pool: game.pool_value,
          real_pool: realPool,
          platform_cut: platformCut 
        }, clientIp);

        console.log('Game ended by admin:', authenticatedUser?.id, gameId, 'Real winners:', winners.length, 'Display winners:', displayWinners.length);
        return new Response(JSON.stringify({ 
          success: true, 
          winners: displayWinners, // Return display winners for UI
          realWinners: winners, // Return real winners for admin
          platformCut,
          displayPool: game.pool_value,
          realPool,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // update_countdown action removed - use game-timer function with proper auth instead

      case 'update_game': {
        // Admin only - already verified above
        if (!gameId) throw new Error('Missing gameId');

        const { data: game, error: gameError } = await supabase
          .from('fastest_finger_games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (gameError || !game) throw new Error('Game not found');
        
        // Cannot edit live games
        if (game.status === 'live') {
          return new Response(JSON.stringify({ error: 'Cannot edit live games' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const gameConfig = config || {};
        
        // If game has participants, don't allow changing entry_fee
        if (game.participant_count > 0 && gameConfig.entry_fee !== undefined && gameConfig.entry_fee !== game.entry_fee) {
          return new Response(JSON.stringify({ error: 'Cannot change entry fee when participants have joined' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Build update object with only provided fields
        const updateData: Record<string, any> = {};
        
        if (gameConfig.name !== undefined) updateData.name = gameConfig.name;
        if (gameConfig.description !== undefined) updateData.description = gameConfig.description;
        if (gameConfig.entry_fee !== undefined) updateData.entry_fee = gameConfig.entry_fee;
        if (gameConfig.max_duration !== undefined) updateData.max_duration = gameConfig.max_duration;
        if (gameConfig.comment_timer !== undefined) updateData.comment_timer = gameConfig.comment_timer;
        if (gameConfig.payout_type !== undefined) updateData.payout_type = gameConfig.payout_type;
        if (gameConfig.payout_distribution !== undefined) updateData.payout_distribution = gameConfig.payout_distribution;
        if (gameConfig.min_participants !== undefined) updateData.min_participants = gameConfig.min_participants;
        if (gameConfig.countdown !== undefined) updateData.countdown = gameConfig.countdown;
        if (gameConfig.go_live_type !== undefined) updateData.go_live_type = gameConfig.go_live_type;
        if (gameConfig.scheduled_at !== undefined) updateData.scheduled_at = gameConfig.scheduled_at;
        if (gameConfig.recurrence_type !== undefined) updateData.recurrence_type = gameConfig.recurrence_type;
        if (gameConfig.recurrence_interval !== undefined) updateData.recurrence_interval = gameConfig.recurrence_interval;
        if (gameConfig.is_sponsored !== undefined) updateData.is_sponsored = gameConfig.is_sponsored;
        if (gameConfig.sponsored_amount !== undefined) updateData.sponsored_amount = gameConfig.sponsored_amount;
        if (gameConfig.platform_cut_percentage !== undefined) updateData.platform_cut_percentage = gameConfig.platform_cut_percentage;
        if (gameConfig.auto_restart !== undefined) updateData.auto_restart = gameConfig.auto_restart;
        if (gameConfig.fixed_daily_time !== undefined) updateData.fixed_daily_time = gameConfig.fixed_daily_time;
        if (gameConfig.entry_wait_seconds !== undefined) updateData.entry_wait_seconds = gameConfig.entry_wait_seconds;
        if (gameConfig.min_participants_action !== undefined) updateData.min_participants_action = gameConfig.min_participants_action;
        if (gameConfig.music_type !== undefined) updateData.music_type = gameConfig.music_type;
        if (gameConfig.lobby_music_url !== undefined) updateData.lobby_music_url = gameConfig.lobby_music_url;
        if (gameConfig.arena_music_url !== undefined) updateData.arena_music_url = gameConfig.arena_music_url;
        if (gameConfig.tense_music_url !== undefined) updateData.tense_music_url = gameConfig.tense_music_url;

        const { data: updatedGame, error } = await supabase
          .from('fastest_finger_games')
          .update(updateData)
          .eq('id', gameId)
          .select()
          .single();

        if (error) throw error;
        
        // Log audit action
        await logAuditAction(supabase, authenticatedUser!.id, 'update_game', 'game', gameId, gameConfig, clientIp);
        
        console.log('Game updated by admin:', authenticatedUser?.id, gameId);
        return new Response(JSON.stringify({ success: true, game: updatedGame }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'cancel_game': {
        // Admin only - already verified above
        if (!gameId) throw new Error('Missing gameId');
        if (!reason) throw new Error('Missing cancellation reason');

        const { data: game, error: gameError } = await supabase
          .from('fastest_finger_games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (gameError || !game) throw new Error('Game not found');
        
        // Only allow cancelling non-live games
        if (game.status === 'live') {
          return new Response(JSON.stringify({ error: 'Cannot cancel a live game. End the game instead.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get all participants
        const { data: participants } = await supabase
          .from('fastest_finger_participants')
          .select('user_id')
          .eq('game_id', gameId);

        // Refund all participants
        if (participants && participants.length > 0) {
          for (const p of participants) {
            // Get current balance
            const { data: profile } = await supabase
              .from('profiles')
              .select('wallet_balance')
              .eq('id', p.user_id)
              .single();

            if (profile) {
              // Refund entry fee
              await supabase
                .from('profiles')
                .update({ wallet_balance: profile.wallet_balance + game.entry_fee })
                .eq('id', p.user_id);

              // Create refund transaction
              await supabase.from('wallet_transactions').insert({
                user_id: p.user_id,
                type: 'refund',
                amount: game.entry_fee,
                description: `Game cancelled: ${reason}`,
                game_id: gameId,
              });
            }
          }
        }

        // Update game status to cancelled
        await supabase
          .from('fastest_finger_games')
          .update({
            status: 'cancelled',
            end_time: new Date().toISOString(),
          })
          .eq('id', gameId);

        // Log audit action
        await logAuditAction(supabase, authenticatedUser!.id, 'cancel_game', 'game', gameId, { 
          reason,
          refunded_participants: participants?.length || 0,
          refund_amount_each: game.entry_fee
        }, clientIp);

        console.log('Game cancelled by admin:', authenticatedUser?.id, gameId, 'Reason:', reason, 'Refunded:', participants?.length || 0);
        return new Response(JSON.stringify({ 
          success: true, 
          refundedCount: participants?.length || 0,
          refundAmount: game.entry_fee
        }), {
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

      case 'delete_game': {
        // Admin only - already verified above
        if (!gameId) throw new Error('Missing gameId');

        const { data: game, error: gameError } = await supabase
          .from('fastest_finger_games')
          .select('status, name')
          .eq('id', gameId)
          .single();

        if (gameError || !game) throw new Error('Game not found');
        
        // Only allow deleting ended or cancelled games
        if (game.status === 'live' || game.status === 'open' || game.status === 'scheduled') {
          return new Response(JSON.stringify({ error: 'Cannot delete active games. Cancel the game first.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Delete related records first (in order of dependencies)
        await supabase.from('comments').delete().eq('game_id', gameId);
        await supabase.from('winners').delete().eq('game_id', gameId);
        await supabase.from('fastest_finger_participants').delete().eq('game_id', gameId);
        await supabase.from('voice_room_participants').delete().eq('game_id', gameId);

        // Detach ledger rows that reference game_id (FKs are not cascading)
        const { error: txDetachError } = await supabase
          .from('wallet_transactions')
          .update({ game_id: null })
          .eq('game_id', gameId);
        if (txDetachError) throw txDetachError;

        const { error: rankDetachError } = await supabase
          .from('rank_history')
          .update({ game_id: null })
          .eq('game_id', gameId);
        if (rankDetachError) throw rankDetachError;
        
        // Delete the game
        const { error: deleteError } = await supabase
          .from('fastest_finger_games')
          .delete()
          .eq('id', gameId);

        if (deleteError) throw deleteError;

        // Log audit action
        await logAuditAction(supabase, authenticatedUser!.id, 'delete_game', 'game', gameId, { 
          game_name: game.name 
        }, clientIp);

        console.log('Game deleted by admin:', authenticatedUser?.id, gameId);
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