import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock comment templates - varied and natural sounding
const MOCK_COMMENTS = [
  "Let's go!", "I'm winning this!", "Come on!", "Easy win", "💪", "🔥",
  "Too slow!", "Speed!", "First!", "Mine!", "Gotcha!", "Fast!",
  "Let's gooo!", "Watch me!", "Here we go!", "Boom!", "Yes!",
  "Another one!", "Keep up!", "My turn!", "👆", "⚡", "🏆",
  "Quick!", "Now!", "Again!", "This is it!", "🎯", "💨",
];

// Get random comment
const getRandomComment = (): string => {
  return MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)];
};

// Get delay based on personality and activity level
const getCommentDelay = (personality: string, activityLevel: string): number => {
  let baseDelay = 5000;
  
  switch (activityLevel) {
    case 'high':
      baseDelay = 2000;
      break;
    case 'medium':
      baseDelay = 5000;
      break;
    case 'low':
      baseDelay = 10000;
      break;
  }
  
  switch (personality) {
    case 'aggressive':
      baseDelay *= 0.5;
      break;
    case 'passive':
      baseDelay *= 2;
      break;
    case 'random':
      baseDelay *= (0.5 + Math.random() * 2);
      break;
  }
  
  return baseDelay + (Math.random() * baseDelay * 0.5);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, gameId, cycleId } = await req.json();
    
    // Support both gameId and cycleId for backwards compatibility
    const targetCycleId = cycleId || gameId;

    // Check if mock users are enabled
    const { data: settings, error: settingsError } = await supabase
      .from('mock_user_settings')
      .select('*')
      .single();

    if (settingsError || !settings?.enabled) {
      return new Response(JSON.stringify({ success: true, message: 'Mock users disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'trigger_joins': {
        // Triggered when a real user joins or cycle needs activity
        if (!targetCycleId) throw new Error('Missing cycleId');

        const shouldJoin = Math.random() * 100 < Math.max(settings.join_probability, 70);
        if (!shouldJoin) {
          return new Response(JSON.stringify({ success: true, joined: 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get current mock participation count for this cycle
        const { count: currentMockCount } = await supabase
          .from('cycle_participants')
          .select('*', { count: 'exact', head: true })
          .eq('cycle_id', targetCycleId)
          .in('user_id', (await supabase.from('mock_users').select('id')).data?.map((m: any) => m.id) || []);

        const remainingSlots = settings.max_mock_users_per_game - (currentMockCount || 0);
        if (remainingSlots <= 0) {
          return new Response(JSON.stringify({ success: true, joined: 0, message: 'Max mock users reached' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Determine how many to add based on activity level
        let toAdd = 2;
        if (settings.activity_level === 'high') {
          toAdd = Math.min(5, remainingSlots);
        } else if (settings.activity_level === 'medium') {
          toAdd = Math.min(3, remainingSlots);
        }

        // Get mock users already in this cycle
        const { data: existingParticipants } = await supabase
          .from('cycle_participants')
          .select('user_id')
          .eq('cycle_id', targetCycleId);

        const existingIds = existingParticipants?.map(p => p.user_id) || [];

        // Get available mock users
        let query = supabase
          .from('mock_users')
          .select('*')
          .eq('is_active', true);

        if (existingIds.length > 0) {
          query = query.not('id', 'in', `(${existingIds.join(',')})`);
        }

        const { data: availableMocks } = await query.limit(50);

        if (!availableMocks || availableMocks.length === 0) {
          return new Response(JSON.stringify({ success: true, joined: 0, message: 'No available mock users' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Randomly select mock users to join
        const shuffled = availableMocks.sort(() => Math.random() - 0.5);
        const toJoin = shuffled.slice(0, Math.min(toAdd, availableMocks.length));

        // Get cycle info for pool updates
        const { data: cycle } = await supabase
          .from('game_cycles')
          .select('pool_value, participant_count, entry_fee')
          .eq('id', targetCycleId)
          .single();

        if (!cycle) {
          return new Response(JSON.stringify({ success: false, error: 'Cycle not found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Add mock users to cycle_participants
        for (const mockUser of toJoin) {
          await supabase.from('cycle_participants').insert({
            cycle_id: targetCycleId,
            user_id: mockUser.id,
            is_spectator: false,
          });
        }

        // Update cycle pool and participant count
        await supabase
          .from('game_cycles')
          .update({
            pool_value: cycle.pool_value + (cycle.entry_fee * toJoin.length),
            participant_count: cycle.participant_count + toJoin.length,
          })
          .eq('id', targetCycleId);

        console.log(`Mock users joined cycle ${targetCycleId}:`, toJoin.map(m => m.username));

        return new Response(JSON.stringify({ 
          success: true, 
          joined: toJoin.length,
          users: toJoin.map(m => ({ id: m.id, username: m.username })),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'trigger_comment': {
        // Triggered periodically during live cycles
        if (!targetCycleId) throw new Error('Missing cycleId');

        // Check comment frequency
        if (Math.random() * 100 > settings.comment_frequency) {
          return new Response(JSON.stringify({ success: true, commented: false }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get all mock user IDs first
        const { data: allMockUsers } = await supabase
          .from('mock_users')
          .select('id, username')
          .eq('is_active', true);

        if (!allMockUsers || allMockUsers.length === 0) {
          return new Response(JSON.stringify({ success: true, commented: false, message: 'No active mock users' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const mockUserIds = allMockUsers.map(m => m.id);
        const mockUserMap = new Map(allMockUsers.map(m => [m.id, m.username]));

        // Get participants in this cycle
        const { data: participants } = await supabase
          .from('cycle_participants')
          .select('user_id')
          .eq('cycle_id', targetCycleId)
          .eq('is_spectator', false);

        if (!participants || participants.length === 0) {
          return new Response(JSON.stringify({ success: true, commented: false, message: 'No participants in cycle' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Filter to only mock participants
        const mockParticipants = participants.filter(p => mockUserIds.includes(p.user_id));

        if (mockParticipants.length === 0) {
          return new Response(JSON.stringify({ success: true, commented: false, message: 'No mock participants in cycle' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Pick random mock participant
        const randomParticipant = mockParticipants[Math.floor(Math.random() * mockParticipants.length)];
        const username = mockUserMap.get(randomParticipant.user_id) || 'MockUser';

        // Insert comment
        const comment = getRandomComment();
        
        const { error: commentError } = await supabase.from('cycle_comments').insert({
          cycle_id: targetCycleId,
          user_id: randomParticipant.user_id,
          content: comment,
        });

        if (commentError) {
          console.error('Failed to insert comment:', commentError);
          return new Response(JSON.stringify({ success: false, error: commentError.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Mock user ${username} commented in cycle ${targetCycleId}: ${comment}`);

        return new Response(JSON.stringify({ 
          success: true, 
          commented: true,
          username,
          comment,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_mock_participants': {
        // Get all mock users participating in a cycle
        if (!targetCycleId) throw new Error('Missing cycleId');

        // Get mock user IDs
        const { data: mockUsers } = await supabase
          .from('mock_users')
          .select('id, username, avatar');

        const mockUserMap = new Map(mockUsers?.map(m => [m.id, m]) || []);
        const mockUserIds = mockUsers?.map(m => m.id) || [];

        // Get participants that are mock users
        const { data: participants } = await supabase
          .from('cycle_participants')
          .select('user_id, joined_at')
          .eq('cycle_id', targetCycleId)
          .in('user_id', mockUserIds);

        const mockParticipants = (participants || []).map(p => {
          const mock = mockUserMap.get(p.user_id);
          return {
            id: p.user_id,
            username: mock?.username || 'Unknown',
            avatar: mock?.avatar || '🎮',
            joined_at: p.joined_at,
          };
        });

        return new Response(JSON.stringify({ 
          success: true, 
          participants: mockParticipants,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'cleanup_cycle': {
        // Clean up mock participation after cycle ends
        if (!targetCycleId) throw new Error('Missing cycleId');

        // Get mock user IDs to only delete mock participants
        const { data: mockUsers } = await supabase
          .from('mock_users')
          .select('id');

        const mockUserIds = mockUsers?.map(m => m.id) || [];

        if (mockUserIds.length > 0) {
          await supabase
            .from('cycle_participants')
            .delete()
            .eq('cycle_id', targetCycleId)
            .in('user_id', mockUserIds);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Auto-populate mock users for active cycles
      case 'auto_populate': {
        // Get all opening cycles
        const { data: openCycles } = await supabase
          .from('game_cycles')
          .select('id, participant_count, entry_fee, pool_value')
          .eq('status', 'opening');

        if (!openCycles || openCycles.length === 0) {
          return new Response(JSON.stringify({ success: true, message: 'No opening cycles' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let totalJoined = 0;

        for (const cycle of openCycles) {
          // Randomly add 3-8 mock users per cycle
          const toAdd = Math.floor(Math.random() * 6) + 3;
          
          // Get available mock users
          const { data: existingParticipants } = await supabase
            .from('cycle_participants')
            .select('user_id')
            .eq('cycle_id', cycle.id);

          const existingIds = existingParticipants?.map(p => p.user_id) || [];

          let query = supabase
            .from('mock_users')
            .select('*')
            .eq('is_active', true);

          if (existingIds.length > 0) {
            query = query.not('id', 'in', `(${existingIds.join(',')})`);
          }

          const { data: availableMocks } = await query.limit(toAdd);

          if (availableMocks && availableMocks.length > 0) {
            for (const mockUser of availableMocks) {
              await supabase.from('cycle_participants').insert({
                cycle_id: cycle.id,
                user_id: mockUser.id,
                is_spectator: false,
              });
            }

            await supabase
              .from('game_cycles')
              .update({
                pool_value: cycle.pool_value + (cycle.entry_fee * availableMocks.length),
                participant_count: cycle.participant_count + availableMocks.length,
              })
              .eq('id', cycle.id);

            totalJoined += availableMocks.length;
            console.log(`Auto-populated ${availableMocks.length} mock users to cycle ${cycle.id}`);
          }
        }

        return new Response(JSON.stringify({ success: true, totalJoined }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error('Mock user service error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
