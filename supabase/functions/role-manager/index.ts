import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to verify JWT and get user
async function verifyAuth(req: Request, supabase: any): Promise<{ user: any | null; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { user: null, error: 'Invalid or expired token' };
  }

  return { user, error: null };
}

// Helper to check if user has admin role
async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  
  return !!data;
}

// Helper to log audit actions
async function logAuditAction(
  supabase: any,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details: Record<string, any> | null,
  ipAddress: string | null
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ip_address: ipAddress,
    });
    console.log(`Audit logged: ${action} on ${resourceType} by ${userId}`);
  } catch (err) {
    console.error('Failed to log audit action:', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP for audit logging
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('x-real-ip') || null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const { user, error: authError } = await verifyAuth(req, supabaseAuth);
    if (authError) {
      return new Response(JSON.stringify({ error: authError }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const hasAdminRole = await isAdmin(supabase, user.id);
    if (!hasAdminRole) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, targetUserId, role } = body;
    console.log(`Role action: ${action}`, { targetUserId, role, adminId: user.id });

    // Get target user profile for logging
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', targetUserId)
      .single();

    switch (action) {
      case 'add_role': {
        if (!targetUserId || !role) {
          throw new Error('Missing targetUserId or role');
        }

        // Check if role already exists
        const { data: existing } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('role', role)
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({ error: 'User already has this role' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: targetUserId, role });

        if (error) throw error;

        // Log audit action
        await logAuditAction(supabase, user.id, 'add_role', 'user_role', targetUserId, {
          role,
          target_username: targetProfile?.username || 'Unknown',
        }, clientIp);

        console.log(`Role ${role} added to user ${targetUserId} by admin ${user.id}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'remove_role': {
        if (!targetUserId || !role) {
          throw new Error('Missing targetUserId or role');
        }

        // Prevent admin from removing their own admin role
        if (targetUserId === user.id && role === 'admin') {
          return new Response(JSON.stringify({ error: 'Cannot remove your own admin role' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', targetUserId)
          .eq('role', role);

        if (error) throw error;

        // Log audit action
        await logAuditAction(supabase, user.id, 'remove_role', 'user_role', targetUserId, {
          role,
          target_username: targetProfile?.username || 'Unknown',
        }, clientIp);

        console.log(`Role ${role} removed from user ${targetUserId} by admin ${user.id}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Role manager error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});