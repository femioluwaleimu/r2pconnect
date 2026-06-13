import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Whitelist of allowed currency codes
const ALLOWED_CURRENCIES = ['USD', 'NGN', 'EUR', 'GBP'] as const;
type CurrencyCode = typeof ALLOWED_CURRENCIES[number];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    let { base } = body;
    
    // Default to USD if not provided
    if (!base) {
      base = 'USD';
    }

    // Validate base currency is in whitelist (prevents SSRF)
    if (typeof base !== 'string' || !ALLOWED_CURRENCIES.includes(base.toUpperCase() as CurrencyCode)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid base currency. Must be one of: ${ALLOWED_CURRENCIES.join(', ')}` 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Normalize to uppercase
    base = base.toUpperCase();
    
    console.log(`Fetching exchange rates for base: ${base}`);
    
    // Using exchangerate-api.com free tier
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${encodeURIComponent(base)}`
    );
    
    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract only the currencies we support
    const rates: Record<string, number> = {};
    
    for (const currency of ALLOWED_CURRENCIES) {
      if (data.rates[currency]) {
        rates[currency] = data.rates[currency];
      }
    }
    
    console.log('Exchange rates fetched successfully:', rates);
    
    return new Response(
      JSON.stringify({
        base: data.base,
        date: data.date,
        rates,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Return fallback rates if API fails
    return new Response(
      JSON.stringify({
        base: 'USD',
        date: new Date().toISOString().split('T')[0],
        rates: {
          USD: 1,
          NGN: 1550,
          EUR: 0.92,
          GBP: 0.79,
        },
        fallback: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
