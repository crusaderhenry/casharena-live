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
  // Base delay in ms
  let baseDelay = 5000;
  
  // Adjust for activity level
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
  
  // Adjust for personality
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
  
  // Add randomness
  return baseDelay + (Math.random() * baseDelay * 0.5);
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, gameId } = await req.json();

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
        // Triggered when a real user joins or game needs activity
        if (!gameId) throw new Error('Missing gameId');

        // Always try to add users (ignore probability for continuous triggers)
        // Random chance still applies but at a higher rate
        const shouldJoin = Math.random() * 100 < Math.max(settings.join_probability, 70);
        if (!shouldJoin) {
          return new Response(JSON.stringify({ success: true, joined: 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get current mock participation count for this game
        const { count: currentMockCount } = await supabase
          .from('mock_game_participation')
          .select('*', { count: 'exact', head: true })
          .eq('game_id', gameId);

        const remainingSlots = settings.max_mock_users_per_game - (currentMockCount || 0);
        if (remainingSlots <= 0) {
          return new Response(JSON.stringify({ success: true, joined: 0, message: 'Max mock users reached' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // More aggressive join rates: 2-5 users at a time based on activity level
        let toAdd = 2;
        if (settings.activity_level === 'high') {
          toAdd = Math.min(5, remainingSlots);
        } else if (settings.activity_level === 'medium') {
          toAdd = Math.min(3, remainingSlots);
        }

        // Get random mock users not already in this game
        const { data: existingMocks } = await supabase
          .from('mock_game_participation')
          .select('mock_user_id')
          .eq('game_id', gameId);

        const existingIds = existingMocks?.map(m => m.mock_user_id) || [];

        const { data: availableMocks } = await supabase
          .from('mock_users')
          .select('*')
          .eq('is_active', true)
          .not('id', 'in', existingIds.length > 0 ? `(${existingIds.join(',')})` : '()');

        if (!availableMocks || availableMocks.length === 0) {
          return new Response(JSON.stringify({ success: true, joined: 0, message: 'No available mock users' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Randomly select mock users to join
        const shuffled = availableMocks.sort(() => Math.random() - 0.5);
        const toJoin = shuffled.slice(0, Math.min(toAdd, availableMocks.length));

        // Add to game participation
        for (const mockUser of toJoin) {
          await supabase.from('mock_game_participation').insert({
            game_id: gameId,
            mock_user_id: mockUser.id,
          });

          // Update game display pool (add virtual entry fee)
          const { data: game } = await supabase
            .from('fastest_finger_games')
            .select('pool_value, participant_count, entry_fee')
            .eq('id', gameId)
            .single();

          if (game) {
            await supabase
              .from('fastest_finger_games')
              .update({
                pool_value: game.pool_value + game.entry_fee,
                participant_count: game.participant_count + 1,
              })
              .eq('id', gameId);
          }
        }

        console.log(`Mock users joined game ${gameId}:`, toJoin.map(m => m.username));

        return new Response(JSON.stringify({ 
          success: true, 
          joined: toJoin.length,
          users: toJoin.map(m => ({ id: m.id, username: m.username })),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'trigger_comment': {
        // Triggered periodically during live games
        if (!gameId) throw new Error('Missing gameId');

        // Check comment frequency
        if (Math.random() * 100 > settings.comment_frequency) {
          return new Response(JSON.stringify({ success: true, commented: false }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get mock users in this game
        const { data: mockParticipants } = await supabase
          .from('mock_game_participation')
          .select('mock_user_id, mock_users(*)')
          .eq('game_id', gameId);

        if (!mockParticipants || mockParticipants.length === 0) {
          return new Response(JSON.stringify({ success: true, commented: false }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Randomly pick one mock user to comment
        const randomParticipant = mockParticipants[Math.floor(Math.random() * mockParticipants.length)];
        const mockUser = randomParticipant.mock_users as any;

        if (!mockUser) {
          return new Response(JSON.stringify({ success: true, commented: false }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Insert comment using mock user ID as user_id
        // We use a special prefix to mark mock comments
        const comment = getRandomComment();
        
        await supabase.from('comments').insert({
          game_id: gameId,
          user_id: mockUser.id, // This will be the mock user's UUID
          content: comment,
        });

        // Update comment count
        await supabase
          .from('mock_game_participation')
          .update({ comment_count: (randomParticipant as any).comment_count + 1 })
          .eq('game_id', gameId)
          .eq('mock_user_id', mockUser.id);

        console.log(`Mock user ${mockUser.username} commented in game ${gameId}: ${comment}`);

        return new Response(JSON.stringify({ 
          success: true, 
          commented: true,
          username: mockUser.username,
          comment,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_mock_participants': {
        // Get all mock users participating in a game (for display)
        if (!gameId) throw new Error('Missing gameId');

        const { data } = await supabase
          .from('mock_game_participation')
          .select('*, mock_users(*)')
          .eq('game_id', gameId);

        return new Response(JSON.stringify({ 
          success: true, 
          participants: data?.map(p => ({
            id: (p.mock_users as any)?.id,
            username: (p.mock_users as any)?.username,
            avatar: (p.mock_users as any)?.avatar,
            joined_at: p.joined_at,
          })) || [],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'cleanup_game': {
        // Clean up mock participation after game ends
        if (!gameId) throw new Error('Missing gameId');

        await supabase
          .from('mock_game_participation')
          .delete()
          .eq('game_id', gameId);

        return new Response(JSON.stringify({ success: true }), {
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
