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
    const cacheKey = `${type || 'lobby'}_${style || 'chill'}`;
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
        chill: 'Relaxing ambient electronic music with soft synth pads, gentle beats at 80 BPM, perfect for a waiting room or lobby. Lo-fi hip hop vibes with warm bass.',
        intense: 'Epic orchestral buildup music with anticipation, suspenseful strings and brass, 100 BPM, building tension before an exciting event.',
        retro: '8-bit chiptune arcade music, nostalgic video game lobby theme, cheerful arpeggios and catchy melody at 110 BPM.',
      },
      arena: {
        chill: 'Upbeat electronic dance music with positive energy, 120 BPM, suitable for competition with inspiring synths and rhythmic bass.',
        intense: 'High energy aggressive electronic music, intense drops and powerful beats at 140 BPM, competitive gaming atmosphere with dramatic builds.',
        retro: 'Fast-paced 16-bit action game music, exciting chiptune battle theme, 130 BPM with heroic melodies and driving rhythm.',
      },
      tense: {
        chill: 'Suspenseful ambient music with subtle tension, mysterious pads and minimal beats, 90 BPM, countdown timer vibes.',
        intense: 'Heart-pounding dramatic music with urgent percussion, racing strings at 150 BPM, final countdown tension and excitement.',
        retro: 'Tense 8-bit boss battle music approaching, urgent chiptune with warning tones, 140 BPM pulse-pounding finale.',
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
        duration_seconds: 30, // 30 seconds of music (will loop on client)
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

    // Store in Supabase Storage for caching
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('[elevenlabs-music] Failed to cache audio:', uploadError);
    }

    // Get signed URL for the uploaded file
    const { data: signedUrlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600);

    if (signedUrlData?.signedUrl) {
      return new Response(
        JSON.stringify({ audioUrl: signedUrlData.signedUrl, cached: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: return base64 encoded audio
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
