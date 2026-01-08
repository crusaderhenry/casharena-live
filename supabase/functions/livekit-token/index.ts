import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// LiveKit Access Token generation
function generateLiveKitToken(
  apiKey: string,
  apiSecret: string,
  roomName: string,
  participantIdentity: string,
  participantName: string,
  metadata: string
): string {
  // Create JWT header and payload
  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1 hour expiry

  const payload = {
    iss: apiKey,
    sub: participantIdentity,
    name: participantName,
    metadata: metadata,
    nbf: now,
    exp: exp,
    jti: participantIdentity,
    video: {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    }
  };

  // Base64url encode
  const base64UrlEncode = (obj: object): string => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Create HMAC-SHA256 signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const messageData = encoder.encode(signatureInput);

  // Use Web Crypto API for HMAC
  return new Promise<string>(async (resolve) => {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const signatureArray = new Uint8Array(signature);
    let signatureBase64 = btoa(String.fromCharCode(...signatureArray));
    signatureBase64 = signatureBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    resolve(`${signatureInput}.${signatureBase64}`);
  }) as unknown as string;
}

async function generateToken(
  apiKey: string,
  apiSecret: string,
  roomName: string,
  participantIdentity: string,
  participantName: string,
  metadata: string
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: apiKey,
    sub: participantIdentity,
    name: participantName,
    metadata: metadata,
    nbf: now,
    exp: now + 3600,
    jti: `${participantIdentity}-${now}`,
    video: {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    }
  };

  const base64UrlEncode = (data: string): string => {
    return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const messageData = encoder.encode(signatureInput);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const signatureArray = new Uint8Array(signature);
  let signatureBase64 = btoa(String.fromCharCode(...signatureArray));
  signatureBase64 = signatureBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  return `${signatureInput}.${signatureBase64}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { roomName } = await req.json();
    if (!roomName) {
      return new Response(
        JSON.stringify({ error: 'Room name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile for display name and avatar
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar')
      .eq('id', user.id)
      .single();

    const participantName = profile?.username || 'Player';
    const participantAvatar = profile?.avatar || '🎮';

    // Get LiveKit credentials
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const livekitUrl = Deno.env.get('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('Missing LiveKit credentials');
      return new Response(
        JSON.stringify({ error: 'LiveKit not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate access token
    const metadata = JSON.stringify({ avatar: participantAvatar });
    const token = await generateToken(
      apiKey,
      apiSecret,
      roomName,
      user.id,
      participantName,
      metadata
    );

    console.log(`Generated LiveKit token for user ${user.id} in room ${roomName}`);

    return new Response(
      JSON.stringify({ 
        token,
        url: livekitUrl,
        roomName,
        participantName,
        participantIdentity: user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating token:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate token' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
