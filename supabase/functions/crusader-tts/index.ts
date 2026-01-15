import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple rate limiting - store last request time per user
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 2000; // 2 seconds between requests

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    
    // Use service role to validate user token - more reliable than anon key
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[crusader-tts] Auth error:', authError?.message || 'No user');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token. Please refresh the page and try again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting per user
    const lastRequest = rateLimitMap.get(user.id);
    const now = Date.now();
    if (lastRequest && (now - lastRequest) < RATE_LIMIT_MS) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait before making another request.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    rateLimitMap.set(user.id, now);

    // Clean up old entries periodically
    if (rateLimitMap.size > 1000) {
      const cutoff = now - 60000; // Remove entries older than 1 minute
      for (const [key, time] of rateLimitMap.entries()) {
        if (time < cutoff) rateLimitMap.delete(key);
      }
    }

    const { text, voiceId } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ElevenLabs API key not configured");
    }

    if (!text) {
      throw new Error("Text is required");
    }

    // Limit text length to prevent API abuse
    const maxTextLength = 500;
    const truncatedText = text.substring(0, maxTextLength);

    // Use custom cloned voice for Crusader
    const selectedVoiceId = voiceId || "I26ofw8CwlRZ6PZzoFaX";

    console.log(`[crusader-tts] User ${user.id} generating TTS for: "${truncatedText.substring(0, 50)}..."`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: truncatedText,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.85,
            style: 0.25,
            use_speaker_boost: true,
            speed: 1.05,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[crusader-tts] ElevenLabs API error:", errorText);
      
       // Check for quota exceeded specifically
       if (errorText.includes('quota_exceeded')) {
         // Return 200 so clients using SDK invoke() don't throw/unmount the UI.
         // Client can detect this via the JSON body and fall back to Web Speech API.
         return new Response(
           JSON.stringify({ audioContent: null, error: 'quota_exceeded', message: 'TTS service temporarily unavailable' }),
           { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }
      
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);

    console.log("[crusader-tts] TTS generated successfully for user:", user.id);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    // Log detailed error for debugging (server-side only)
    const internalMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[crusader-tts] Error:", internalMessage);
    
    // Return generic error to client to prevent information disclosure
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});