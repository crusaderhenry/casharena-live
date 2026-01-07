import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push VAPID keys
// Generate with: npx web-push generate-vapid-keys
// Public key is shared with frontend, private key must be stored as VAPID_PRIVATE_KEY secret
const VAPID_PUBLIC_KEY = "BCjTvE7KQPl9RYPh6mYpTvKxWHRLrRCr4HqDQ1jKdNzgxOHjz3KJ4WUE_Pw9kv0J6BQzKhC2h7lZVqJRjXlCBj0";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = "mailto:hello@fortuneshq.com";

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
  requireInteraction?: boolean;
}

interface SendPushRequest {
  user_ids?: string[];
  all_users?: boolean;
  payload: PushPayload;
}

// Helper function to convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper function to convert Uint8Array to base64url
function uint8ArrayToBase64Url(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...array));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Generate JWT for VAPID authentication
async function generateVapidJwt(audience: string): Promise<string> {
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: VAPID_SUBJECT,
  };

  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyBytes = base64ToUint8Array(
    VAPID_PRIVATE_KEY.replace(/-/g, "+").replace(/_/g, "/")
  );
  
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes.buffer as ArrayBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = uint8ArrayToBase64Url(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

// Send push notification to a single subscription
async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  try {
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    const jwt = await generateVapidJwt(audience);
    const authorization = `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`;

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
        TTL: "86400",
        Urgency: "high",
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 201 || response.status === 200) {
      console.log(`Push sent successfully to ${subscription.endpoint}`);
      return true;
    } else if (response.status === 410 || response.status === 404) {
      // Subscription expired or invalid - should be removed
      console.log(`Subscription expired: ${subscription.endpoint}`);
      return false;
    } else {
      console.error(`Push failed: ${response.status} ${await response.text()}`);
      return false;
    }
  } catch (error) {
    console.error(`Error sending push to ${subscription.endpoint}:`, error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_ids, all_users, payload }: SendPushRequest = await req.json();

    if (!payload || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: title and body required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch subscriptions
    let query = supabase.from("push_subscriptions").select("*");
    
    if (!all_users && user_ids && user_ids.length > 0) {
      query = query.in("user_id", user_ids);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push to ${subscriptions.length} subscriptions`);

    // Send to all subscriptions in parallel
    const results = await Promise.all(
      subscriptions.map((sub) =>
        sendPushToSubscription(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload
        )
      )
    );

    // Remove expired subscriptions
    const expiredEndpoints = subscriptions
      .filter((_, i) => !results[i])
      .map((sub) => sub.endpoint);

    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
      console.log(`Removed ${expiredEndpoints.length} expired subscriptions`);
    }

    const successCount = results.filter(Boolean).length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: results.length - successCount,
        removed: expiredEndpoints.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
