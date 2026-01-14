import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OGImageRequest {
  type: 'game' | 'winner' | 'badge';
  // Game share
  game_id?: string;
  // Winner share
  user_id?: string;
  position?: number;
  amount?: number;
  username?: string;
  avatar?: string;
  // Badge share
  badge_id?: string;
  badge_name?: string;
  badge_description?: string;
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

    const body: OGImageRequest = await req.json();
    const { type } = body;

    console.log(`[og-image] Generating OG image for type: ${type}`);

    let prompt: string;
    let fileName: string;

    switch (type) {
      case 'game': {
        // Fetch game data
        const { data: cycle, error } = await supabase
          .from('game_cycles')
          .select('*, game_templates(name)')
          .eq('id', body.game_id)
          .single();

        if (error || !cycle) {
          console.error('[og-image] Game not found:', error);
          return new Response(
            JSON.stringify({ error: 'Game not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const templateName = (cycle.game_templates as any)?.name || 'Royal Rumble';
        const prizePool = cycle.pool_value + (cycle.sponsored_prize_amount || 0);
        const status = cycle.status === 'live' ? 'LIVE NOW' : cycle.status === 'opening' ? 'OPEN FOR ENTRY' : 'COMING SOON';

        prompt = `Create a social media share card (1200x630px, 16:9 aspect ratio) for a mobile gaming tournament app called FortunesHQ. 
The card should feature:
- Dark gradient background (deep blue/purple tones)
- Gold and teal accent colors
- Bold text showing "${templateName}" as the game title
- "₦${prizePool.toLocaleString()}" as the prize pool in large gold text
- "${cycle.participant_count} Players" indicator
- Status badge showing "${status}" (red if live, green if open, blue if upcoming)
- "Top ${cycle.winner_count} Win!" text
- FortunesHQ branding at the bottom
- Gaming/competition visual elements like trophies, crowns, or money icons
Style: Modern, sleek, gaming aesthetic. Premium feel. Ultra high resolution.`;

        fileName = `game-${body.game_id}.png`;
        break;
      }

      case 'winner': {
        const { username, avatar, position, amount } = body;
        const positionText = position === 1 ? '1st Place 🥇' : position === 2 ? '2nd Place 🥈' : position === 3 ? '3rd Place 🥉' : `${position}th Place`;

        prompt = `Create a winner celebration social media card (1200x630px, 16:9 aspect ratio) for FortunesHQ gaming app.
The card should feature:
- Celebratory dark gradient background with gold confetti/sparkles
- Large trophy or crown icon at the top
- "${username}" as the winner's name in white bold text
- Avatar emoji: ${avatar || '🎮'}
- "${positionText}" badge prominently displayed
- "WON ₦${(amount || 0).toLocaleString()}" in massive gold gradient text
- Celebratory elements like confetti, stars, light rays
- FortunesHQ branding with tagline "Play • Win • Celebrate"
Style: Victory celebration, premium gaming, gold accents on dark background. Ultra high resolution.`;

        fileName = `winner-${body.game_id || 'game'}-${body.user_id}.png`;
        break;
      }

      case 'badge': {
        const { badge_name, badge_description, username } = body;

        prompt = `Create an achievement badge unlock social media card (1200x630px, 16:9 aspect ratio) for FortunesHQ gaming app.
The card should feature:
- Dark gradient background with glowing effect
- "Achievement Unlocked!" header text with sparkle effects
- Large circular badge icon in the center with glow effect
- Badge name: "${badge_name}" in bold gradient text
- Badge description: "${badge_description}" in smaller white text
- Player name: "${username || 'Player'}" at the bottom
- FortunesHQ branding
- Decorative elements suggesting achievement/leveling up
Style: RPG achievement unlock aesthetic, purple and gold tones, magical glow effects. Ultra high resolution.`;

        fileName = `badge-${body.badge_id}-${body.user_id || 'user'}.png`;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Generate image using Lovable AI
    console.log(`[og-image] Generating image with prompt: ${prompt.substring(0, 100)}...`);
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[og-image] AI generation failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Image generation failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const imageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64) {
      console.error('[og-image] No image in AI response:', aiData);
      return new Response(
        JSON.stringify({ error: 'No image generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract base64 data (remove data:image/png;base64, prefix)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('og-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('[og-image] Upload failed:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Upload failed', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('og-images')
      .getPublicUrl(fileName);

    console.log(`[og-image] Generated and uploaded: ${publicUrlData.publicUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrlData.publicUrl,
        fileName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[og-image] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
