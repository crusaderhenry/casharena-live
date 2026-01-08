import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, style, forceRegenerate } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

    if (!ELEVENLABS_API_KEY) {
      console.log('[elevenlabs-music] No API key configured, returning fallback');
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured', useFallback: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client to check/store cached music
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate cache key based on type and style
    const cacheKey = `v2_${type || 'lobby'}_${style || 'chill'}`;
    const bucketName = 'game-audio';
    const filePath = `music/${cacheKey}.mp3`;

    // Check if cached version exists (unless force regenerate)
    if (!forceRegenerate) {
      const { data: existingFile } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 3600); // 1 hour signed URL

      if (existingFile?.signedUrl) {
        console.log(`[elevenlabs-music] Returning cached music for ${cacheKey}`);
        return new Response(
          JSON.stringify({ audioUrl: existingFile.signedUrl, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate music prompts based on type and style
    const prompts: Record<string, Record<string, string>> = {
      lobby: {
        chill: 'Smooth Afro-lofi / amapiano-inspired chill beat. Warm bass, soft keys, gentle percussion, 92 BPM. No vocals. Designed to loop seamlessly for a game lobby.',
        intense: 'Hype Afro-electronic lobby build-up. Tight drums, big synth risers, 118 BPM. Stadium energy but still pre-game. No vocals. Loopable.',
        retro: 'Arcade chiptune groove with Afro-inspired drum rhythm. Bright 8-bit leads, catchy hook, 112 BPM. No vocals. Loopable lobby theme.',
      },
      arena: {
        chill: 'Upbeat Afro-house / electronic groove for competition. Clean punchy drums, confident bassline, 124 BPM. No vocals. Loopable.',
        intense: 'High-energy arena anthem: Afro-fusion + trap drums + EDM drops. Aggressive bass, sharp synth stabs, 140 BPM. No vocals. Designed for intense gameplay and looping.',
        retro: 'Fast 16-bit action game battle theme with crunchy chiptune leads and driving rhythm, 132 BPM. No vocals. Loopable.',
      },
      tense: {
        chill: 'Minimal cinematic tension bed for a countdown. Dark pads, subtle pulse, 90 BPM. No vocals. Loopable and suspenseful.',
        intense: 'Final countdown intensity: cinematic percussion + racing synth arpeggios, 150 BPM. Urgent, dramatic, no vocals. Loopable.',
        retro: '8-bit boss warning countdown track. Urgent chiptune rhythm, sharp beeps, 142 BPM. No vocals. Loopable.',
      },
    };

    const musicType = type || 'lobby';
    const musicStyle = style || 'chill';
    const prompt = prompts[musicType]?.[musicStyle] || prompts.lobby.chill;

    console.log(`[elevenlabs-music] Generating music: type=${musicType}, style=${musicStyle}`);
    console.log(`[elevenlabs-music] Prompt: ${prompt}`);

    // Call ElevenLabs Music API
    const response = await fetch('https://api.elevenlabs.io/v1/music', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        duration_seconds: 15, // short track; loops on client
      }),
    });


    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[elevenlabs-music] API error: ${response.status}`, errorText);
      return new Response(
        JSON.stringify({ error: 'Music generation failed', useFallback: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`[elevenlabs-music] Generated ${audioBuffer.byteLength} bytes of audio`);

    // Try to store in Supabase Storage for caching
    let signedUrl: string | null = null;
    try {
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) {
        console.warn('[elevenlabs-music] Failed to cache audio:', uploadError.message);
      } else {
        // Get signed URL for the uploaded file
        const { data: signedUrlData } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 3600);
        
        if (signedUrlData?.signedUrl) {
          signedUrl = signedUrlData.signedUrl;
        }
      }
    } catch (storageErr) {
      console.warn('[elevenlabs-music] Storage error:', storageErr);
    }

    if (signedUrl) {
      return new Response(
        JSON.stringify({ audioUrl: signedUrl, cached: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: return base64 encoded audio directly
    const base64Audio = base64Encode(audioBuffer);
    return new Response(
      JSON.stringify({ audioContent: base64Audio, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[elevenlabs-music] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message, useFallback: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
