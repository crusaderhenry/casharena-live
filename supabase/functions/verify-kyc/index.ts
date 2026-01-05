import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KycRequest {
  type: 'nin' | 'bvn';
  number: string;
}

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
      .select('kyc_verified, kyc_first_name, kyc_last_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw profileError;
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
    const { type, number }: KycRequest = await req.json();

    if (!type || !['nin', 'bvn'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid KYC type. Must be nin or bvn' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!number || number.length !== 11) {
      return new Response(JSON.stringify({ error: `${type.toUpperCase()} must be 11 digits` }), {
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

    let firstName: string;
    let lastName: string;

    if (isTestMode) {
      // Simulate KYC verification in test mode
      console.log(`[verify-kyc] Test mode - simulating ${type.toUpperCase()} verification for ${number}`);
      firstName = 'Test';
      lastName = 'User';
    } else {
      // Call Paystack Identity Verification API
      const verifyUrl = type === 'bvn' 
        ? 'https://api.paystack.co/bvn/match'
        : 'https://api.paystack.co/identity/validate';

      let verifyResponse;
      
      if (type === 'bvn') {
        // BVN verification - requires account number and bank code
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('bank_account_number, bank_code')
          .eq('id', user.id)
          .single();

        if (!userProfile?.bank_account_number || !userProfile?.bank_code) {
          return new Response(JSON.stringify({ 
            error: 'Please add your bank account details before BVN verification' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        verifyResponse = await fetch(verifyUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bvn: number,
            account_number: userProfile.bank_account_number,
            bank_code: userProfile.bank_code,
          }),
        });
      } else {
        // NIN verification
        verifyResponse = await fetch(verifyUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'nin_phone',
            value: number,
            country: 'NG',
          }),
        });
      }

      const verifyData = await verifyResponse.json();
      console.log(`[verify-kyc] Paystack response:`, JSON.stringify(verifyData));

      if (!verifyResponse.ok || !verifyData.status) {
        return new Response(JSON.stringify({ 
          error: verifyData.message || `${type.toUpperCase()} verification failed` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract name from response
      if (type === 'bvn') {
        firstName = verifyData.data?.first_name || '';
        lastName = verifyData.data?.last_name || '';
      } else {
        firstName = verifyData.data?.first_name || '';
        lastName = verifyData.data?.last_name || '';
      }

      if (!firstName || !lastName) {
        return new Response(JSON.stringify({ 
          error: 'Could not retrieve name from verification. Please try again.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Update user profile with KYC info
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        kyc_verified: true,
        kyc_type: type,
        kyc_first_name: firstName,
        kyc_last_name: lastName,
        kyc_verified_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`[verify-kyc] User ${user.id} verified via ${type.toUpperCase()}: ${firstName} ${lastName}`);

    return new Response(JSON.stringify({ 
      success: true,
      first_name: firstName,
      last_name: lastName,
      message: `${type.toUpperCase()} verified successfully`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[verify-kyc] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
