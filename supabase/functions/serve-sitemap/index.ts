import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'generated_sitemap')
      .maybeSingle();

    if (error || !data?.value) {
      return new Response('Sitemap not generated yet', { status: 404, headers: corsHeaders });
    }

    return new Response(data.value, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      }
    });
  } catch (error) {
    return new Response('Error fetching sitemap', { status: 500, headers: corsHeaders });
  }
});
