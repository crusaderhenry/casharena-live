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

    console.log('Running auto-open-games cron job at:', new Date().toISOString());

    // Find scheduled games where scheduled_at has passed
    const now = new Date().toISOString();
    
    const { data: gamesToOpen, error: fetchError } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('status', 'scheduled')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now);

    if (fetchError) {
      console.error('Error fetching games to open:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${gamesToOpen?.length || 0} games to auto-open`);

    const openedGames: string[] = [];

    for (const game of gamesToOpen || []) {
      console.log(`Auto-opening game: ${game.id} (${game.name})`);
      
      const { error: updateError } = await supabase
        .from('fastest_finger_games')
        .update({
          status: 'open',
          start_time: now,
        })
        .eq('id', game.id);

      if (updateError) {
        console.error(`Failed to open game ${game.id}:`, updateError);
      } else {
        openedGames.push(game.id);
        console.log(`Successfully opened game: ${game.id}`);
        
        // Log audit action (system action)
        await supabase.from('audit_logs').insert({
          user_id: game.created_by || '00000000-0000-0000-0000-000000000000',
          action: 'auto_open_game',
          resource_type: 'game',
          resource_id: game.id,
          details: { scheduled_at: game.scheduled_at, opened_at: now },
          ip_address: null,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        opened_count: openedGames.length,
        opened_games: openedGames,
        checked_at: now,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auto-open games error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
