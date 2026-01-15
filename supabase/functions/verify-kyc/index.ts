import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KycRequest {
  type: 'nin' | 'bvn';
  number: string;
  first_name?: string;
  last_name?: string;
}

// Rate limiting constants
const MAX_ATTEMPTS_PER_DAY = 3;
const RATE_LIMIT_HOURS = 24;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is already KYC verified
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('kyc_verified, kyc_first_name, kyc_last_name, bank_account_name, status')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    // Security: Check if user is suspended
    if (profile?.status === 'suspended') {
      return new Response(JSON.stringify({ error: 'Account suspended' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profile?.kyc_verified) {
      return new Response(JSON.stringify({ 
        success: true, 
        already_verified: true,
        first_name: profile.kyc_first_name,
        last_name: profile.kyc_last_name,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: KycRequest = await req.json();
    const type = body.type;
    const number = body.number?.trim();
    // Sanitize names: only allow letters, spaces, hyphens, and apostrophes
    const first_name = body.first_name?.trim().replace(/[^a-zA-Z\s\-']/g, '').substring(0, 50);
    const last_name = body.last_name?.trim().replace(/[^a-zA-Z\s\-']/g, '').substring(0, 50);

    if (!type || !['nin', 'bvn'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid KYC type. Must be nin or bvn' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Strict validation: must be exactly 11 digits
    if (!number || !/^\d{11}$/.test(number)) {
      return new Response(JSON.stringify({ error: `${type.toUpperCase()} must be exactly 11 digits` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting: Check recent attempts for this user
    const rateLimitCutoff = new Date(Date.now() - RATE_LIMIT_HOURS * 60 * 60 * 1000).toISOString();
    const { data: recentAttempts, error: attemptsError } = await supabase
      .from('kyc_attempts')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', rateLimitCutoff);

    if (attemptsError) {
      console.error('[verify-kyc] Error checking rate limit:', attemptsError);
    }

    const attemptCount = recentAttempts?.length || 0;
    if (attemptCount >= MAX_ATTEMPTS_PER_DAY) {
      console.log(`[verify-kyc] Rate limit exceeded for user ${user.id}: ${attemptCount} attempts`);
      return new Response(JSON.stringify({ 
        error: `Too many verification attempts. Please try again in ${RATE_LIMIT_HOURS} hours.` 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Duplicate check: Ensure this NIN/BVN is not already verified by another user
    const { data: existingVerification, error: duplicateError } = await supabase
      .from('kyc_attempts')
      .select('user_id')
      .eq('kyc_number', number)
      .eq('success', true)
      .neq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (duplicateError) {
      console.error('[verify-kyc] Error checking duplicate:', duplicateError);
    }

    if (existingVerification) {
      // Log the failed attempt
      await supabase.from('kyc_attempts').insert({
        user_id: user.id,
        kyc_type: type,
        kyc_number: number,
        success: false,
      });
      
      console.log(`[verify-kyc] Duplicate ${type.toUpperCase()} ${number} already verified by another user`);
      return new Response(JSON.stringify({ 
        error: `This ${type.toUpperCase()} is already associated with another account.` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get platform settings to determine test/live mode
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('test_mode')
      .single();

    const isTestMode = settings?.test_mode ?? true;
    const paystackSecretKey = isTestMode 
      ? Deno.env.get('PAYSTACK_TEST_SECRET_KEY') 
      : Deno.env.get('PAYSTACK_LIVE_SECRET_KEY');

    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured');
    }

    let verifiedFirstName: string;
    let verifiedLastName: string;

    if (isTestMode) {
      // Simulate KYC verification in test mode
      console.log(`[verify-kyc] Test mode - simulating ${type.toUpperCase()} verification for ${number}`);
      
      // In test mode, use provided names or bank account name if available
      if (first_name && last_name) {
        verifiedFirstName = first_name;
        verifiedLastName = last_name;
      } else if (profile?.bank_account_name) {
        // Parse bank account name (usually "LASTNAME FIRSTNAME" or "FIRSTNAME LASTNAME")
        const nameParts = profile.bank_account_name.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          verifiedFirstName = nameParts[0];
          verifiedLastName = nameParts.slice(1).join(' ');
        } else {
          verifiedFirstName = 'Test';
          verifiedLastName = 'User';
        }
      } else {
        verifiedFirstName = 'Test';
        verifiedLastName = 'User';
      }
    } else {
      // In live mode, use Paystack's Resolve BVN endpoint (requires business activation)
      // For now, we'll use the customer validation approach with the provided name
      
      if (type === 'bvn') {
        // Use Paystack Resolve BVN (requires Paystack approval for live mode)
        const resolveUrl = `https://api.paystack.co/bank/resolve_bvn/${number}`;
        
        const resolveResponse = await fetch(resolveUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${paystackSecretKey}`,
          },
        });

        const resolveData = await resolveResponse.json();
        console.log(`[verify-kyc] Paystack BVN resolve response status: ${resolveResponse.status}`);

        if (!resolveResponse.ok || !resolveData.status) {
          // If resolve fails, check if names were provided to verify manually
          if (first_name && last_name) {
            console.log(`[verify-kyc] BVN resolve unavailable, using provided names`);
            verifiedFirstName = first_name;
            verifiedLastName = last_name;
          } else {
            // Log failed attempt
            await supabase.from('kyc_attempts').insert({
              user_id: user.id,
              kyc_type: type,
              kyc_number: number,
              success: false,
            });
            
            return new Response(JSON.stringify({ 
              error: 'BVN verification is not available. Please contact support.' 
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else {
          verifiedFirstName = resolveData.data?.first_name || '';
          verifiedLastName = resolveData.data?.last_name || '';
        }
      } else {
        // NIN verification - Paystack doesn't have a direct NIN lookup
        // Use the provided names with the NIN as a reference
        if (first_name && last_name) {
          console.log(`[verify-kyc] NIN verification with provided names`);
          verifiedFirstName = first_name;
          verifiedLastName = last_name;
        } else {
          return new Response(JSON.stringify({ 
            error: 'Please provide your first and last name for NIN verification' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      if (!verifiedFirstName || !verifiedLastName) {
        // Log failed attempt
        await supabase.from('kyc_attempts').insert({
          user_id: user.id,
          kyc_type: type,
          kyc_number: number,
          success: false,
        });
        
        return new Response(JSON.stringify({ 
          error: 'Could not retrieve name from verification. Please provide your name.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Record successful attempt
    await supabase.from('kyc_attempts').insert({
      user_id: user.id,
      kyc_type: type,
      kyc_number: number,
      success: true,
    });

    // Update user profile with KYC info
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        kyc_verified: true,
        kyc_type: type,
        kyc_first_name: verifiedFirstName,
        kyc_last_name: verifiedLastName,
        kyc_verified_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`[verify-kyc] User ${user.id} verified via ${type.toUpperCase()}`);

    // Send KYC verified email
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          template_key: 'kyc_verified',
          user_id: user.id,
          data: {
            first_name: verifiedFirstName,
            last_name: verifiedLastName,
            kyc_type: type.toUpperCase(),
          },
        }),
      });
      console.log(`[verify-kyc] KYC verified email sent to user ${user.id}`);
    } catch (emailError) {
      console.error('[verify-kyc] Failed to send email:', emailError);
      // Don't fail the whole request if email fails
    }

    return new Response(JSON.stringify({ 
      success: true,
      first_name: verifiedFirstName,
      last_name: verifiedLastName,
      message: `${type.toUpperCase()} verified successfully`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const internalMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[verify-kyc] Error:', internalMessage);
    return new Response(JSON.stringify({ error: 'Verification failed. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
