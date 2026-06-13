import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referralCode, newUserId } = await req.json();

    if (!referralCode || !newUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing referralCode or newUserId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the referral code
    const { data: refCodeData, error: refError } = await supabase
      .from('referral_codes')
      .select('id, user_id, total_referrals')
      .eq('code', referralCode.toUpperCase())
      .maybeSingle();

    if (refError || !refCodeData) {
      return new Response(
        JSON.stringify({ error: 'Invalid referral code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-referral
    if (refCodeData.user_id === newUserId) {
      return new Response(
        JSON.stringify({ error: 'Cannot refer yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already referred
    const { data: existingUsage } = await supabase
      .from('referral_usages')
      .select('id')
      .eq('referred_user_id', newUserId)
      .maybeSingle();

    if (existingUsage) {
      return new Response(
        JSON.stringify({ message: 'Already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record the referral usage (no credits - commission is earned on subscription)
    await supabase.from('referral_usages').insert({
      referrer_id: refCodeData.user_id,
      referred_user_id: newUserId,
      referral_code_id: refCodeData.id,
      credits_awarded: 0,
      referred_credits_awarded: 0,
    });

    // Update referral count
    await supabase
      .from('referral_codes')
      .update({
        total_referrals: (refCodeData.total_referrals || 0) + 1,
      })
      .eq('id', refCodeData.id);

    // Create notification for referrer
    await supabase.from('notifications').insert({
      user_id: refCodeData.user_id,
      title: 'New Referral!',
      message: 'Someone signed up with your referral code. You will earn commission when they subscribe!',
      type: 'success',
    });

    console.log(`Referral recorded: referrer=${refCodeData.user_id}, new_user=${newUserId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing referral:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
