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

    // Fetch all published research papers
    const { data: papers, error } = await supabase
      .from('research_papers')
      .select('id, published_at, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) throw error;

    const baseUrl = 'https://r2pconnect.com';

    // Static pages
    const staticPages = [
      { loc: '/', changefreq: 'weekly', priority: '1.0' },
      { loc: '/about-us', changefreq: 'monthly', priority: '0.8' },
      { loc: '/how-it-works', changefreq: 'monthly', priority: '0.8' },
      { loc: '/contact', changefreq: 'monthly', priority: '0.7' },
      { loc: '/research', changefreq: 'daily', priority: '0.9' },
      { loc: '/documentaries', changefreq: 'weekly', priority: '0.8' },
      { loc: '/jobs', changefreq: 'daily', priority: '0.8' },
      { loc: '/faq', changefreq: 'monthly', priority: '0.6' },
      { loc: '/privacy-policy', changefreq: 'yearly', priority: '0.3' },
      { loc: '/terms-of-use', changefreq: 'yearly', priority: '0.3' },
      { loc: '/auth', changefreq: 'monthly', priority: '0.6' },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Add static pages
    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${page.loc}</loc>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Add published research papers
    if (papers) {
      for (const paper of papers) {
        const lastmod = paper.published_at || paper.updated_at;
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/research/${paper.id}</loc>\n`;
        if (lastmod) {
          xml += `    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>\n`;
        }
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    xml += `</urlset>`;

    // Store the generated sitemap in platform_settings for reference
    await supabase
      .from('platform_settings')
      .upsert({
        key: 'generated_sitemap',
        value: xml,
        type: 'xml',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    // Also store last generation time
    await supabase
      .from('platform_settings')
      .upsert({
        key: 'sitemap_last_generated',
        value: new Date().toISOString(),
        type: 'text',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    return new Response(
      JSON.stringify({ 
        success: true, 
        papers_count: papers?.length || 0,
        total_urls: staticPages.length + (papers?.length || 0),
        message: 'Sitemap generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sitemap generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
