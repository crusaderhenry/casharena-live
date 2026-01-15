import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to verify JWT and get user ID
async function verifyAuth(req: Request, supabase: any): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, error: 'Missing authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Use getUser instead of getClaims for proper token validation
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.error('JWT verification failed:', error?.message);
    return { userId: null, error: 'Invalid or expired token' };
  }

  return { userId: user.id, error: null };
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
    const { userId, error: authError } = await verifyAuth(req, supabaseAuth);
    if (authError || !userId) {
      return new Response(JSON.stringify({ error: authError || 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const hasAdminRole = await isAdmin(supabase, userId);
    if (!hasAdminRole) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, targetUserId, userId: bodyUserId, role } = body;
    const effectiveUserId = targetUserId || bodyUserId;
    console.log(`Role action: ${action}`, { effectiveUserId, role, adminId: userId });

    // Get target user profile for logging
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('username, wallet_balance')
      .eq('id', effectiveUserId)
      .single();

    switch (action) {
      case 'add_role': {
        if (!effectiveUserId || !role) {
          throw new Error('Missing targetUserId or role');
        }

        // Check if role already exists
        const { data: existing } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', effectiveUserId)
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
          .insert({ user_id: effectiveUserId, role });

        if (error) throw error;

        // Log audit action
        await logAuditAction(supabase, userId, 'add_role', 'user_role', effectiveUserId, {
          role,
          target_username: targetProfile?.username || 'Unknown',
        }, clientIp);

        console.log(`Role ${role} added to user ${effectiveUserId} by admin ${userId}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'remove_role': {
        if (!effectiveUserId || !role) {
          throw new Error('Missing targetUserId or role');
        }

        // Prevent admin from removing their own admin role
        if (effectiveUserId === userId && role === 'admin') {
          return new Response(JSON.stringify({ error: 'Cannot remove your own admin role' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', effectiveUserId)
          .eq('role', role);

        if (error) throw error;

        // Log audit action
        await logAuditAction(supabase, userId, 'remove_role', 'user_role', effectiveUserId, {
          role,
          target_username: targetProfile?.username || 'Unknown',
        }, clientIp);

        console.log(`Role ${role} removed from user ${effectiveUserId} by admin ${userId}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete-user': {
        if (!effectiveUserId) {
          throw new Error('Missing userId');
        }

        // Prevent admin from deleting themselves
        if (effectiveUserId === userId) {
          return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Delete the user from auth (profile will cascade due to foreign key)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(effectiveUserId);

        if (deleteError) throw deleteError;

        // Log audit action
        await logAuditAction(supabase, userId, 'delete_user', 'user', effectiveUserId, {
          target_username: targetProfile?.username || 'Unknown',
          had_balance: targetProfile?.wallet_balance || 0,
        }, clientIp);

        console.log(`User ${effectiveUserId} deleted by admin ${userId}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const internalMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Role manager error:', internalMessage);
    return new Response(JSON.stringify({ error: 'An error occurred processing your request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});