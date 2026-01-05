import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Nigerian banks list (commonly used, can be fetched from Paystack API in production)
const nigerianBanks = [
  { code: '044', name: 'Access Bank' },
  { code: '063', name: 'Access Bank (Diamond)' },
  { code: '035A', name: 'ALAT by WEMA' },
  { code: '401', name: 'ASO Savings and Loans' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '084', name: 'Enterprise Bank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '526', name: 'Parallex Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank For Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '999992', name: 'Opay' },
  { code: '999991', name: 'PalmPay' },
  { code: '999993', name: 'Kuda Bank' },
  { code: '999994', name: 'Moniepoint' },
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check platform test mode
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: settings } = await supabase
      .from('platform_settings')
      .select('test_mode')
      .single();

    const isTestMode = settings?.test_mode ?? true;

    if (isTestMode) {
      // Return static list in test mode
      return new Response(
        JSON.stringify({
          success: true,
          banks: nigerianBanks,
          test_mode: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // In live mode, fetch from Paystack API
    const paystackSecretKey = Deno.env.get('PAYSTACK_LIVE_SECRET_KEY');
    
    if (!paystackSecretKey) {
      // Fallback to static list
      return new Response(
        JSON.stringify({
          success: true,
          banks: nigerianBanks,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://api.paystack.co/bank?country=nigeria', {
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
      },
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error('Failed to fetch banks');
    }

    const banks = data.data.map((bank: { code: string; name: string }) => ({
      code: bank.code,
      name: bank.name,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        banks,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get banks error:', error);
    
    // Return static list as fallback
    return new Response(
      JSON.stringify({
        success: true,
        banks: nigerianBanks,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
