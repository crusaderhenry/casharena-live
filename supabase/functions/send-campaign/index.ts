import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCampaignRequest {
  campaignId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const zeptoApiKey = Deno.env.get("ZEPTOMAIL_API_KEY");
    const zeptoFromEmail = Deno.env.get("ZEPTOMAIL_FROM_EMAIL");
    const zeptoFromName = Deno.env.get("ZEPTOMAIL_FROM_NAME");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaignId }: SendCampaignRequest = await req.json();

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (campaign.status !== "draft") {
      return new Response(JSON.stringify({ error: "Campaign already sent" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to sending
    await supabase
      .from("email_campaigns")
      .update({ status: "sending" })
      .eq("id", campaignId);

    // Build query for recipients based on audience
    let query = supabase.from("profiles").select("id, email, username");
    
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    switch (campaign.target_audience) {
      case "active":
        query = query.gte("last_active_at", sevenDaysAgo);
        break;
      case "inactive":
        query = query.lt("last_active_at", thirtyDaysAgo);
        break;
      case "kyc_verified":
        query = query.eq("kyc_verified", true);
        break;
      case "high_value":
        query = query.gte("games_played", 5);
        break;
      case "new_users":
        query = query.gte("created_at", sevenDaysAgo);
        break;
    }

    const { data: recipients, error: recipientsError } = await query;

    if (recipientsError) {
      console.error("Error fetching recipients:", recipientsError);
      await supabase
        .from("email_campaigns")
        .update({ status: "draft" })
        .eq("id", campaignId);
      return new Response(JSON.stringify({ error: "Failed to fetch recipients" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending campaign to ${recipients?.length || 0} recipients`);

    let sentCount = 0;
    let failedCount = 0;

    // Send emails using ZeptoMail
    for (const recipient of recipients || []) {
      try {
        // Personalize the email body
        const personalizedBody = campaign.body
          .replace(/\{\{username\}\}/g, recipient.username || "Player")
          .replace(/\{\{email\}\}/g, recipient.email);

        if (zeptoApiKey && zeptoFromEmail) {
          const response = await fetch("https://api.zeptomail.com/v1.1/email", {
            method: "POST",
            headers: {
              "Authorization": zeptoApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: { address: zeptoFromEmail, name: zeptoFromName || "FortunesHQ" },
              to: [{ email_address: { address: recipient.email, name: recipient.username } }],
              subject: campaign.subject,
              htmlbody: personalizedBody,
            }),
          });

          if (response.ok) {
            sentCount++;
            await supabase.from("email_campaign_recipients").insert({
              campaign_id: campaignId,
              user_id: recipient.id,
              email: recipient.email,
              status: "sent",
              sent_at: new Date().toISOString(),
            });
          } else {
            const errorText = await response.text();
            console.error(`Failed to send to ${recipient.email}:`, errorText);
            failedCount++;
            await supabase.from("email_campaign_recipients").insert({
              campaign_id: campaignId,
              user_id: recipient.id,
              email: recipient.email,
              status: "failed",
              error_message: errorText,
            });
          }
        } else {
          // Log email for testing when ZeptoMail is not configured
          console.log(`[TEST MODE] Would send to: ${recipient.email}`);
          sentCount++;
          await supabase.from("email_campaign_recipients").insert({
            campaign_id: campaignId,
            user_id: recipient.id,
            email: recipient.email,
            status: "sent",
            sent_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error(`Error sending to ${recipient.email}:`, err);
        failedCount++;
      }
    }

    // Update campaign status
    await supabase
      .from("email_campaigns")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq("id", campaignId);

    console.log(`Campaign sent: ${sentCount} successful, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ success: true, sentCount, failedCount }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-campaign:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
