import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');

// Valid plan IDs
const ALLOWED_PLAN_IDS = ['basic', 'pro', 'enterprise'] as const;
type PlanId = typeof ALLOWED_PLAN_IDS[number];

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reference validation - alphanumeric and underscores only
const REFERENCE_REGEX = /^[a-zA-Z0-9_-]+$/;

// Get current USD to NGN rate
async function getExchangeRate(): Promise<number> {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();
    if (data.result === 'success' && data.rates?.NGN) {
      return data.rates.NGN;
    }
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
  }
  // Fallback rate
  return 1500;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (!PAYSTACK_SECRET_KEY && action !== 'activate_free_subscription') {
      throw new Error('Paystack is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // For actions that require authentication, verify JWT
    if (action === 'initialize_wallet') {
      // Wallet funding - requires authentication
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await authClient.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { amount, callback_url } = body;
      
      if (!amount || amount < 100) {
        return new Response(
          JSON.stringify({ error: 'Minimum amount is ₦100' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const amountKobo = Math.round(amount * 100);
      const reference = `wallet_${user.id}_${Date.now()}`;

      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          amount: amountKobo,
          currency: 'NGN',
          reference,
          callback_url: callback_url || `${req.headers.get('origin')}/industry/wallet`,
          metadata: {
            user_id: user.id,
            type: 'wallet_funding',
            amount_ngn: amount
          }
        }),
      });

      const data = await response.json();
      
      if (!data.status) {
        throw new Error(data.message || 'Failed to initialize payment');
      }

      console.log(`Wallet funding initialized for user ${user.id}, amount: ₦${amount}`);

      return new Response(
        JSON.stringify({ 
          authorization_url: data.data.authorization_url,
          reference: data.data.reference
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify_wallet') {
      const { reference } = body;

      if (!reference || typeof reference !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid reference' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      });

      const data = await response.json();

      if (!data.status || data.data.status !== 'success') {
        return new Response(
          JSON.stringify({ success: false, message: 'Payment verification failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const metadata = data.data.metadata;
      
      if (!metadata?.user_id || metadata?.type !== 'wallet_funding') {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid payment type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const amountNGN = data.data.amount / 100;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Update wallet balance
      const { data: wallet } = await supabase
        .from('industry_wallet')
        .select('balance, total_funded')
        .eq('user_id', metadata.user_id)
        .single();

      if (wallet) {
        await supabase
          .from('industry_wallet')
          .update({
            balance: (wallet.balance || 0) + amountNGN,
            total_funded: (wallet.total_funded || 0) + amountNGN
          })
          .eq('user_id', metadata.user_id);
      } else {
        await supabase
          .from('industry_wallet')
          .insert({
            user_id: metadata.user_id,
            balance: amountNGN,
            total_funded: amountNGN
          });
      }

      // Record transaction
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: metadata.user_id,
          transaction_type: 'funding',
          amount: amountNGN,
          description: 'Wallet funding via Paystack',
          reference,
          status: 'completed'
        });

      console.log(`Wallet funded for user ${metadata.user_id}, amount: ₦${amountNGN}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'success',
          amount: amountNGN
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== PAID JOB APPLICATION (Direct Industry) =====
    if (action === 'initialize_job_application') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const token = authHeader.replace('Bearer ', '');
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await authClient.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { job_id, amount, callback_url } = body;
      if (!job_id || !amount || amount < 100) {
        return new Response(JSON.stringify({ error: 'Invalid job_id or amount' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const amountKobo = Math.round(amount * 100);
      const reference = `job_app_${user.id}_${job_id.substring(0, 8)}_${Date.now()}`;

      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          amount: amountKobo,
          currency: 'NGN',
          reference,
          callback_url: callback_url || `${req.headers.get('origin')}/dashboard/jobs`,
          metadata: { user_id: user.id, job_id, type: 'job_application', amount_ngn: amount }
        }),
      });

      const rData = await response.json();
      if (!rData.status) throw new Error(rData.message || 'Failed to initialize payment');

      return new Response(JSON.stringify({ authorization_url: rData.data.authorization_url, reference: rData.data.reference }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'verify_job_application') {
      const { reference } = body;
      if (!reference || typeof reference !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid reference' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` },
      });
      const vData = await response.json();

      if (!vData.status || vData.data.status !== 'success') {
        return new Response(JSON.stringify({ success: false, message: 'Payment not confirmed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const metadata = vData.data.metadata;
      if (!metadata?.user_id || !metadata?.job_id || metadata?.type !== 'job_application') {
        return new Response(JSON.stringify({ success: false, message: 'Invalid payment type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const amountNGN = vData.data.amount / 100;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Get sharing formula from platform settings (uses same IPN share settings for consistency)
      const { data: settings } = await supabase.from('platform_settings').select('key, value').in('key', ['industry_job_share_percent', 'industry_job_platform_share_percent']);
      let industryPercent = 80, platformPercent = 20;
      settings?.forEach((s: any) => {
        if (s.key === 'industry_job_share_percent') industryPercent = parseFloat(s.value) || 80;
        if (s.key === 'industry_job_platform_share_percent') platformPercent = parseFloat(s.value) || 20;
      });

      const industryShare = Math.round(amountNGN * industryPercent / 100 * 100) / 100;
      const platformShare = Math.round(amountNGN * platformPercent / 100 * 100) / 100;

      // Record payment
      await supabase.from('industry_job_payments').insert({
        applicant_id: metadata.user_id,
        job_id: metadata.job_id,
        amount_ngn: amountNGN,
        industry_share_ngn: industryShare,
        platform_share_ngn: platformShare,
        paystack_reference: reference,
        status: 'success',
      });

      // Credit industry wallet
      const { data: job } = await supabase.from('job_postings').select('industry_id').eq('id', metadata.job_id).single();
      if (job) {
        const { data: wallet } = await supabase.from('industry_wallet').select('balance, total_funded').eq('user_id', job.industry_id).single();
        if (wallet) {
          await supabase.from('industry_wallet').update({
            balance: (wallet.balance || 0) + industryShare,
            total_funded: (wallet.total_funded || 0) + industryShare
          }).eq('user_id', job.industry_id);
        } else {
          await supabase.from('industry_wallet').insert({ user_id: job.industry_id, balance: industryShare, total_funded: industryShare });
        }
      }

      console.log(`Job application payment verified: user=${metadata.user_id}, job=${metadata.job_id}, amount=₦${amountNGN}`);

      return new Response(JSON.stringify({ success: true, status: 'success' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // IPN Activation Payment - one-time, no plan needed
    if (action === 'initialize_ipn_activation') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const token = authHeader.replace('Bearer ', '');
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await authClient.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { amount, callback_url } = body;
      if (!amount || amount < 100) {
        return new Response(
          JSON.stringify({ error: 'Invalid activation fee amount' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const amountKobo = Math.round(amount * 100);
      const reference = `ipn_activation_${user.id}_${Date.now()}`;

      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          amount: amountKobo,
          currency: 'NGN',
          reference,
          callback_url: callback_url || `${req.headers.get('origin')}/ipn/activate`,
          metadata: {
            user_id: user.id,
            type: 'ipn_activation',
            amount_ngn: amount / 100 // store in naira
          }
        }),
      });

      const rData = await response.json();
      if (!rData.status) throw new Error(rData.message || 'Failed to initialize payment');

      console.log(`IPN activation payment initialized for user ${user.id}, amount: ₦${amount}`);

      return new Response(
        JSON.stringify({
          authorization_url: rData.data.authorization_url,
          reference: rData.data.reference,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify IPN activation payment
    if (action === 'verify_ipn_activation') {
      const { reference } = body;
      if (!reference || typeof reference !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid reference' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` },
      });
      const vData = await response.json();

      if (!vData.status || vData.data.status !== 'success') {
        return new Response(
          JSON.stringify({ success: false, message: 'Payment not confirmed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const metadata = vData.data.metadata;
      if (!metadata?.user_id || metadata?.type !== 'ipn_activation') {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid payment type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const amountNGN = vData.data.amount / 100;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Update activation to pending_review (admin must accept/reject)
      await supabase
        .from('ipn_activations')
        .update({
          status: 'pending_review',
          payment_reference: reference,
          payment_amount: amountNGN,
        })
        .eq('user_id', metadata.user_id);

      console.log(`IPN activation payment verified for user ${metadata.user_id}, amount: ₦${amountNGN}`);

      return new Response(
        JSON.stringify({ success: true, status: 'success', data: { status: 'success' } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'activate_free_subscription') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized - missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const token = authHeader.replace('Bearer ', '');
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await authClient.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized - invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { planId, couponId, userType } = body;
      if (!planId || !ALLOWED_PLAN_IDS.includes(planId)) {
        return new Response(JSON.stringify({ error: `Invalid plan. Must be one of: ${ALLOWED_PLAN_IDS.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!couponId || typeof couponId !== 'string') {
        return new Response(JSON.stringify({ error: 'A 100% coupon is required for free activation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const planPrefix = userType === 'industry' ? 'industry' : 'researcher';
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('plan_id', `${planPrefix}_${planId}`)
        .eq('is_active', true)
        .single();

      if (planError || !planData) {
        return new Response(JSON.stringify({ error: 'Plan not found or inactive' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: coupon } = await supabase
        .from('coupon_codes')
        .select('*')
        .eq('id', couponId)
        .eq('is_active', true)
        .maybeSingle();

      const isExpired = coupon?.valid_until && new Date(coupon.valid_until) < new Date();
      const isMaxed = coupon?.max_uses && coupon.current_uses >= coupon.max_uses;
      if (!coupon || coupon.discount_percentage !== 100 || isExpired || isMaxed) {
        return new Response(JSON.stringify({ error: 'This coupon cannot be used for free activation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (coupon.plan_id && coupon.plan_id !== `${planPrefix}_${planId}`) {
        return new Response(JSON.stringify({ error: "This coupon doesn't apply to the selected plan" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id, email')
        .eq('user_id', user.id)
        .single();
      if (coupon.institution_id && profile?.institution_id !== coupon.institution_id) {
        return new Response(JSON.stringify({ error: 'This coupon is not valid for your institution' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const { count: monthlyUseCount } = await supabase
        .from('coupon_usages')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_id', user.id)
        .gte('used_at', monthStart.toISOString());

      if ((monthlyUseCount || 0) > 0) {
        return new Response(JSON.stringify({ error: 'You have already used this coupon this month' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const periodStart = new Date();
      const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
      const activationMonth = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 1));
      const aiCreditsPerMonth = parseInt(String(planData.ai_credits_per_day), 10) || 10;
      const maxUploads = parseInt(String(planData.max_research_uploads), 10) || 5;
      const maxChallenges = parseInt(String(planData.max_challenges), 10) || 5;
      const aiMatchesPerChallenge = parseInt(String(planData.ai_matches_per_challenge), 10) || 10;

      const { data: currentSub } = await supabase
        .from('subscriptions')
        .select('id, ai_credits_remaining')
        .eq('user_id', user.id)
        .maybeSingle();
      const newTotalCredits = aiCreditsPerMonth + (parseInt(String(currentSub?.ai_credits_remaining || 0), 10) || 0);
      const subscriptionPayload = {
        tier: planId,
        is_active: true,
        amount: 0,
        currency: 'NGN',
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        max_challenges_per_month: maxChallenges,
        ai_matches_per_challenge: aiMatchesPerChallenge,
        ai_credits_remaining: newTotalCredits
      };

      const subscriptionResult = currentSub?.id
        ? await supabase.from('subscriptions').update(subscriptionPayload).eq('id', currentSub.id).select('id').single()
        : await supabase.from('subscriptions').insert({ ...subscriptionPayload, user_id: user.id }).select('id').single();

      if (subscriptionResult.error) {
        console.error('Error activating free subscription:', subscriptionResult.error);
        throw new Error('Failed to activate subscription');
      }

      await supabase.from('coupon_usages').insert({
        coupon_id: coupon.id,
        user_id: user.id,
        subscription_id: subscriptionResult.data.id,
        original_amount: planData.amount_ngn || 0,
        discount_amount: planData.amount_ngn || 0,
        final_amount: 0,
        activation_month: activationMonth.toISOString().split('T')[0],
      });
      await supabase.from('coupon_codes').update({ current_uses: (coupon.current_uses || 0) + 1 }).eq('id', coupon.id);

      const currentMonth = new Date().toISOString().slice(0, 7);
      await supabase.from('ai_credits').upsert({
        user_id: user.id,
        credits_used: 0,
        credits_limit: aiCreditsPerMonth,
        reset_date: new Date().toISOString().split('T')[0],
        reset_month: currentMonth
      }, { onConflict: 'user_id' });

      await supabase.from('payment_history').insert({
        user_id: user.id,
        reference: `free_coupon_${coupon.code}_${Date.now()}`,
        amount: 0,
        currency: 'NGN',
        plan_name: planData.name || planId,
        tier: planId,
        status: 'success',
        payment_method: 'coupon',
        coupon_code: coupon.code,
        discount_amount: planData.amount_ngn || 0,
      });

      return new Response(JSON.stringify({ success: true, tier: planId, aiCredits: aiCreditsPerMonth, maxUploads, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'initialize') {
      // CRITICAL: Extract userId from JWT, not from request body
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        console.error('Missing authorization header');
        return new Response(
          JSON.stringify({ error: 'Unauthorized - missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await authClient.auth.getUser(token);
      
      if (authError || !user) {
        console.error('Authentication failed:', authError?.message);
        return new Response(
          JSON.stringify({ error: 'Unauthorized - invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // userId is now trusted from JWT
      const userId = user.id;
      console.log(`Authenticated user for payment: ${userId}`);

      const { planId, couponId } = body;

      // Validate planId
      if (!planId || !ALLOWED_PLAN_IDS.includes(planId)) {
        return new Response(
          JSON.stringify({ error: `Invalid plan. Must be one of: ${ALLOWED_PLAN_IDS.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user type from request or try both prefixes
      const { userType } = body;
      const planPrefix = userType === 'industry' ? 'industry' : 'researcher';
      
      // Get plan details from database
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('plan_id', `${planPrefix}_${planId}`)
        .eq('is_active', true)
        .single();

      if (planError || !planData) {
        console.error('Plan not found:', planError);
        return new Response(
          JSON.stringify({ error: 'Plan not found or inactive' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Apply coupon discount if provided
      let discountPercentage = 0;
      let couponData = null;
      if (couponId) {
        const { data: coupon } = await supabase
          .from('coupon_codes')
          .select('*')
          .eq('id', couponId)
          .eq('is_active', true)
          .maybeSingle();

        if (coupon) {
          // Validate coupon is still valid
          const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date();
          const isMaxed = coupon.max_uses && coupon.current_uses >= coupon.max_uses;
          
          if (!isExpired && !isMaxed) {
            discountPercentage = coupon.discount_percentage;
            couponData = coupon;
            console.log(`Coupon ${coupon.code} applied: ${discountPercentage}% discount`);
          }
        }
      }

      // Calculate discounted amount (prices are already in NGN)
      const discountedAmountNGN = planData.amount_ngn * (1 - discountPercentage / 100);

      // Amount is already in NGN, convert to kobo
      const amountNGN = Math.round(discountedAmountNGN);
      const amountKobo = amountNGN * 100;

      console.log(`Plan ${planId}: ₦${planData.amount_ngn} NGN, discount: ${discountPercentage}%, final: ₦${amountNGN} NGN`);

      // Get user's email and institution from their profile (trusted source)
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, institution_id')
        .eq('user_id', userId)
        .single();

      const email = profile?.email || user.email;
      
      if (!email || !EMAIL_REGEX.test(email)) {
        return new Response(
          JSON.stringify({ error: 'Valid email is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Determine callback URL based on user type
      const callbackPath = userType === 'industry' ? '/industry/subscriptions' : '/dashboard/subscriptions';
      const callbackUrl = `${req.headers.get('origin')}${callbackPath}?verify=true`;

      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          currency: 'NGN',
          callback_url: callbackUrl,
          metadata: {
            user_id: userId, // Trusted from JWT
            plan_id: planId,
            plan_name: planData.name,
            plan_db_id: planData.id,
            institution_id: profile?.institution_id || null,
            amount_ngn: planData.amount_ngn,
            discounted_amount_ngn: discountedAmountNGN,
            coupon_id: couponData?.id || null,
            coupon_code: couponData?.code || null,
            discount_percentage: discountPercentage,
            ai_credits_per_month: planData.ai_credits_per_day, // Using existing column for monthly credits
            max_research_uploads: planData.max_research_uploads,
            max_challenges: planData.max_challenges,
            ai_matches_per_challenge: planData.ai_matches_per_challenge
          }
        }),
      });

      const data = await response.json();
      
      if (!data.status) {
        throw new Error(data.message || 'Failed to initialize payment');
      }

      console.log(`Payment initialized for user ${userId}, plan: ${planId}, amount: ₦${amountNGN}`);

      return new Response(
        JSON.stringify({ 
          authorization_url: data.data.authorization_url,
          reference: data.data.reference,
          amount_ngn: amountNGN
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      const { reference } = body;

      // Validate reference format
      if (!reference || typeof reference !== 'string' || !REFERENCE_REGEX.test(reference)) {
        return new Response(
          JSON.stringify({ error: 'Invalid reference format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Limit reference length
      if (reference.length > 100) {
        return new Response(
          JSON.stringify({ error: 'Reference too long' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      });

      const data = await response.json();

      if (!data.status || data.data.status !== 'success') {
        return new Response(
          JSON.stringify({ success: false, message: 'Payment verification failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const metadata = data.data.metadata;
      
      // Validate metadata has required fields
      if (!metadata?.user_id || !metadata?.plan_id) {
        console.error('Invalid payment metadata:', metadata);
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid payment metadata' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tier = metadata.plan_id;

      // Validate tier is a valid plan
      if (!ALLOWED_PLAN_IDS.includes(tier)) {
        console.error('Invalid plan in metadata:', tier);
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid plan in payment' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const amountNGN = data.data.amount / 100;

      // Get AI credits from metadata (monthly credits) - use exact admin-set value, no multiplication
      const aiCreditsPerMonth = parseInt(String(metadata.ai_credits_per_month), 10) || 10;
      const maxUploads = parseInt(String(metadata.max_research_uploads), 10) || 5;
      const maxChallenges = parseInt(String(metadata.max_challenges), 10) || 5;
      const aiMatchesPerChallenge = parseInt(String(metadata.ai_matches_per_challenge), 10) || 10;

      // Rollover: add remaining credits from previous subscription period
      const { data: currentSub } = await supabase
        .from('subscriptions')
        .select('ai_credits_remaining, tier, current_period_end')
        .eq('user_id', metadata.user_id)
        .maybeSingle();

      const previousRemaining = parseInt(String(currentSub?.ai_credits_remaining || 0), 10);
      const newTotalCredits = aiCreditsPerMonth + previousRemaining;
      
      console.log(`Setting credits for user ${metadata.user_id}: plan=${aiCreditsPerMonth} + rollover=${previousRemaining} = ${newTotalCredits}`);

      // Update subscription - metadata.user_id was set by us during initialize (from JWT)
      const { data: subscriptionData, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          tier,
          is_active: true,
          amount: amountNGN,
          currency: 'NGN',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          paystack_customer_id: data.data.customer.customer_code,
          max_challenges_per_month: maxChallenges,
          ai_matches_per_challenge: aiMatchesPerChallenge,
          ai_credits_remaining: newTotalCredits
        })
        .eq('user_id', metadata.user_id)
        .select('id')
        .single();

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        throw new Error('Failed to update subscription');
      }

      // Record coupon usage if a coupon was applied
      if (metadata.coupon_id && subscriptionData?.id) {
        try {
          // Record usage
          await supabase.from('coupon_usages').insert({
            coupon_id: metadata.coupon_id,
            user_id: metadata.user_id,
            subscription_id: subscriptionData.id,
            original_amount: metadata.amount_ngn || 0,
            discount_amount: (metadata.amount_ngn || 0) - (metadata.discounted_amount_ngn || 0),
            final_amount: metadata.discounted_amount_ngn || 0,
          });

          // Increment coupon usage count
          const { data: couponRow } = await supabase
            .from('coupon_codes')
            .select('current_uses')
            .eq('id', metadata.coupon_id)
            .maybeSingle();

          if (couponRow) {
            await supabase
              .from('coupon_codes')
              .update({ current_uses: (couponRow.current_uses || 0) + 1 })
              .eq('id', metadata.coupon_id);
          }

          console.log(`Coupon ${metadata.coupon_code} usage recorded for user ${metadata.user_id}`);
        } catch (couponError) {
          console.error('Error recording coupon usage:', couponError);
        }
      }

      // Update AI credits in ai_credits table for backwards compatibility
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

      const { error: creditsError } = await supabase
        .from('ai_credits')
        .upsert({
          user_id: metadata.user_id,
          credits_used: 0,
          credits_limit: aiCreditsPerMonth, // Use exact admin-set value
          reset_date: new Date().toISOString().split('T')[0],
          reset_month: currentMonth
        }, { onConflict: 'user_id' });

      if (creditsError) {
        console.error('Error updating AI credits:', creditsError);
      }

      // Fetch commission rates from platform_settings
      const { data: rateSettings } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['supervisor_commission_rate', 'referrer_commission_rate', 'institution_commission_rate']);

      const rateMap: Record<string, number> = {};
      rateSettings?.forEach(r => { rateMap[r.key] = parseFloat(r.value || '0'); });
      const supervisorRate = (rateMap['supervisor_commission_rate'] || 5) / 100;
      const referrerRate = (rateMap['referrer_commission_rate'] || 5) / 100;
      const institutionRate = (rateMap['institution_commission_rate'] || 10) / 100;

      // Process institution commission
      if (metadata.institution_id) {
        const commissionAmount = amountNGN * institutionRate;
        
        await supabase.from('institution_commissions').insert({
          institution_id: metadata.institution_id,
          researcher_id: metadata.user_id,
          subscription_id: subscriptionData?.id,
          amount: commissionAmount,
          currency: 'NGN',
          commission_rate: institutionRate,
          status: 'credited'
        });

        await supabase.from('commission_earnings').insert({
          beneficiary_id: metadata.institution_id,
          beneficiary_type: 'institution',
          student_id: metadata.user_id,
          subscription_id: subscriptionData?.id,
          amount: commissionAmount,
          commission_rate: institutionRate * 100,
          currency: 'NGN',
        });

        const { data: institution } = await supabase
          .from('institutions')
          .select('total_commission, available_balance')
          .eq('id', metadata.institution_id)
          .single();

        if (institution) {
          await supabase.from('institutions').update({
            total_commission: (institution.total_commission || 0) + commissionAmount,
            available_balance: (institution.available_balance || 0) + commissionAmount
          }).eq('id', metadata.institution_id);
        }

        console.log(`Institution commission: ₦${commissionAmount} (${institutionRate * 100}%)`);
      }

      // Process supervisor commission
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('assigned_supervisor_id')
        .eq('user_id', metadata.user_id)
        .maybeSingle();

      if (studentProfile?.assigned_supervisor_id) {
        const supCommission = amountNGN * supervisorRate;

        await supabase.from('commission_earnings').insert({
          beneficiary_id: studentProfile.assigned_supervisor_id,
          beneficiary_type: 'supervisor',
          student_id: metadata.user_id,
          subscription_id: subscriptionData?.id,
          amount: supCommission,
          commission_rate: supervisorRate * 100,
          currency: 'NGN',
        });

        // Update or create supervisor wallet
        const { data: supWallet } = await supabase
          .from('supervisor_wallet')
          .select('balance, total_earned')
          .eq('user_id', studentProfile.assigned_supervisor_id)
          .maybeSingle();

        if (supWallet) {
          await supabase.from('supervisor_wallet').update({
            balance: (supWallet.balance || 0) + supCommission,
            total_earned: (supWallet.total_earned || 0) + supCommission,
          }).eq('user_id', studentProfile.assigned_supervisor_id);
        } else {
          await supabase.from('supervisor_wallet').insert({
            user_id: studentProfile.assigned_supervisor_id,
            balance: supCommission,
            total_earned: supCommission,
          });
        }

        // Notify supervisor
        await supabase.from('notifications').insert({
          user_id: studentProfile.assigned_supervisor_id,
          title: 'Commission Earned!',
          message: `You earned ₦${supCommission.toLocaleString()} (${supervisorRate * 100}%) from a student subscription.`,
          type: 'success',
        });

        console.log(`Supervisor commission: ₦${supCommission} (${supervisorRate * 100}%)`);
      }

      // Process referrer commission
      const { data: referralUsage } = await supabase
        .from('referral_usages')
        .select('referrer_id')
        .eq('referred_user_id', metadata.user_id)
        .maybeSingle();

      if (referralUsage?.referrer_id) {
        const refCommission = amountNGN * referrerRate;

        await supabase.from('commission_earnings').insert({
          beneficiary_id: referralUsage.referrer_id,
          beneficiary_type: 'referrer',
          student_id: metadata.user_id,
          subscription_id: subscriptionData?.id,
          amount: refCommission,
          commission_rate: referrerRate * 100,
          currency: 'NGN',
        });

        // Add to referrer's student wallet
        const { data: refWallet } = await supabase
          .from('student_wallet')
          .select('balance, total_earned')
          .eq('user_id', referralUsage.referrer_id)
          .maybeSingle();

        if (refWallet) {
          await supabase.from('student_wallet').update({
            balance: (refWallet.balance || 0) + refCommission,
            total_earned: (refWallet.total_earned || 0) + refCommission,
          }).eq('user_id', referralUsage.referrer_id);
        } else {
          await supabase.from('student_wallet').insert({
            user_id: referralUsage.referrer_id,
            balance: refCommission,
            total_earned: refCommission,
          });
        }

        // Notify referrer
        await supabase.from('notifications').insert({
          user_id: referralUsage.referrer_id,
          title: 'Referral Commission!',
          message: `You earned ₦${refCommission.toLocaleString()} (${referrerRate * 100}%) from your referral's subscription.`,
          type: 'success',
        });

        console.log(`Referrer commission: ₦${refCommission} (${referrerRate * 100}%)`);
      }

      // Record payment history
      try {
        await supabase.from('payment_history').insert({
          user_id: metadata.user_id,
          reference,
          amount: amountNGN,
          currency: 'NGN',
          plan_name: metadata.plan_name || tier,
          tier,
          status: 'success',
          payment_method: data.data.channel || 'card',
          coupon_code: metadata.coupon_code || null,
          discount_amount: metadata.coupon_id ? ((metadata.amount_ngn || 0) - (metadata.discounted_amount_ngn || 0)) : 0,
        });
        console.log('Payment history recorded');
      } catch (historyError) {
        console.error('Error recording payment history:', historyError);
      }

      // Send confirmation email via send-email function
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'subscription_activated',
            to: data.data.customer.email,
            data: {
              planName: metadata.plan_name || tier,
              amount: amountNGN,
              aiCredits: aiCreditsPerMonth
            }
          }
        });
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
      }

      console.log(`Subscription activated for user ${metadata.user_id}, tier: ${tier}, AI credits: ${aiCreditsPerMonth}/month`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          tier,
          aiCredits: aiCreditsPerMonth,
          maxUploads
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'initialize_topup') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const token = authHeader.replace('Bearer ', '');
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await authClient.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { package_id, callback_url } = body;
      if (!package_id) {
        return new Response(JSON.stringify({ error: 'Package ID is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Verify user has active subscription
      const { data: sub } = await supabase.from('subscriptions').select('tier, is_active, current_period_end').eq('user_id', user.id).maybeSingle();
      if (!sub || !sub.is_active || new Date(sub.current_period_end) < new Date()) {
        return new Response(JSON.stringify({ error: 'You need an active subscription to top up credits' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get package details
      const { data: pkg, error: pkgError } = await supabase.from('credit_topup_packages').select('*').eq('id', package_id).eq('is_active', true).single();
      if (pkgError || !pkg) {
        return new Response(JSON.stringify({ error: 'Package not found or inactive' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Amount is already in NGN, convert to kobo
      const amountNGN = Math.round(pkg.amount_ngn);
      const amountKobo = amountNGN * 100;
      const reference = `topup_${user.id}_${Date.now()}`;

      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          amount: amountKobo,
          currency: 'NGN',
          reference,
          callback_url: callback_url || `${req.headers.get('origin')}/dashboard/ai-assistant`,
          metadata: { user_id: user.id, type: 'credit_topup', package_id: pkg.id, credits: pkg.credits, amount_ngn: pkg.amount_ngn }
        }),
      });

      const data = await response.json();
      if (!data.status) throw new Error(data.message || 'Failed to initialize payment');

      console.log(`Credit top-up initialized for user ${user.id}, package: ${pkg.name}, credits: ${pkg.credits}`);

      return new Response(JSON.stringify({ authorization_url: data.data.authorization_url, reference: data.data.reference }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'verify_topup') {
      const { reference } = body;
      if (!reference || typeof reference !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid reference' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` },
      });

      const data = await response.json();
      if (!data.status || data.data.status !== 'success') {
        return new Response(JSON.stringify({ success: false, message: 'Payment verification failed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const metadata = data.data.metadata;
      if (!metadata?.user_id || metadata?.type !== 'credit_topup') {
        return new Response(JSON.stringify({ success: false, message: 'Invalid payment type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const creditsToAdd = parseInt(String(metadata.credits || 0), 10);
      const amountNGN = data.data.amount / 100;

      // Add credits to subscription
      const { data: currentSub } = await supabase.from('subscriptions').select('ai_credits_remaining').eq('user_id', metadata.user_id).maybeSingle();
      const newCredits = parseInt(String(currentSub?.ai_credits_remaining || 0), 10) + creditsToAdd;

      await supabase.from('subscriptions').update({ ai_credits_remaining: newCredits }).eq('user_id', metadata.user_id);

      // Record purchase
      await supabase.from('credit_topup_purchases').insert({
        user_id: metadata.user_id,
        package_id: metadata.package_id,
        credits: creditsToAdd,
        amount: amountNGN,
        currency: 'NGN',
        reference,
        status: 'completed'
      });

      // Record in payment history
      await supabase.from('payment_history').insert({
        user_id: metadata.user_id,
        reference,
        amount: amountNGN,
        currency: 'NGN',
        plan_name: `Credit Top-Up (${creditsToAdd} credits)`,
        tier: 'topup',
        status: 'success',
        payment_method: data.data.channel || 'card',
      });

      // Notify user
      await supabase.from('notifications').insert({
        user_id: metadata.user_id,
        title: 'Credits Added!',
        message: `${creditsToAdd} AI credits have been added to your account.`,
        type: 'success',
      });

      console.log(`Credit top-up completed for user ${metadata.user_id}, credits: ${creditsToAdd}`);

      // Send confirmation email
      try {
        const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('user_id', metadata.user_id).maybeSingle();
        if (profile?.email) {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              type: 'credit_topup',
              to: profile.email,
              data: {
                name: profile.full_name,
                credits: creditsToAdd,
                amount: amountNGN,
                reference,
              },
            }),
          });
          console.log(`Top-up confirmation email sent to ${profile.email}`);
        }
      } catch (emailError) {
        console.error('Failed to send top-up email:', emailError);
      }

      return new Response(JSON.stringify({ success: true, credits: creditsToAdd }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'get_plans') {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: plans, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('user_type', 'researcher')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        throw new Error('Failed to fetch plans');
      }

      return new Response(
        JSON.stringify({ plans }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in paystack function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});