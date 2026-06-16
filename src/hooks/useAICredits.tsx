import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AICredits {
  credits_remaining: number;
  credits_limit: number;
  period_end: string;
  tier: string;
  is_expired: boolean;
}

export function useAICredits() {
  const [aiCredits, setAiCredits] = useState<AICredits>({ 
    credits_remaining: 0, 
    credits_limit: 3, 
    period_end: '',
    tier: 'free',
    is_expired: false
  });
  const [loading, setLoading] = useState(true);

  const fetchAICredits = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch from subscriptions table
      const { data, error } = await supabase
        .from('subscriptions')
        .select('ai_credits_remaining, current_period_end, tier')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const tier = data.tier || 'free';
        let creditsRemaining = data.ai_credits_remaining ?? 0;

        if (tier === 'free' && creditsRemaining < 3) {
          const { data: repaired } = await supabase.functions.invoke("ensure-free-ai-credits", {
            body: { userId: user.id },
          });
          creditsRemaining = repaired?.credits_remaining ?? creditsRemaining;
        }
        
        // Fetch the actual credit limit from subscription_plans based on tier
        const planId = `researcher_${tier}`;
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('ai_credits_per_day')
          .eq('plan_id', planId)
          .eq('is_active', true)
          .maybeSingle();
        
        // Use admin-set value from subscription_plans, fallback to 3
        const creditsLimit = planData?.ai_credits_per_day || 3;
        
        // Check if period expired
        const periodEnd = new Date(data.current_period_end);
        const now = new Date();
        const isExpired = periodEnd < now && tier !== 'free';
        
        if (periodEnd < now && tier === 'free') {
          // Free tier - show reset credits
          setAiCredits({
            credits_remaining: creditsLimit,
            credits_limit: creditsLimit,
            period_end: data.current_period_end || '',
            tier,
            is_expired: false
          });
        } else if (isExpired) {
          // Paid subscription expired - show 0 credits
          setAiCredits({
            credits_remaining: 0,
            credits_limit: creditsLimit,
            period_end: data.current_period_end || '',
            tier,
            is_expired: true
          });
        } else {
          setAiCredits({
            credits_remaining: creditsRemaining,
            credits_limit: creditsLimit,
            period_end: data.current_period_end || '',
            tier,
            is_expired: false
          });
        }
      }
    } catch (error) {
      console.error('Error fetching AI credits:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAICredits();
  }, [fetchAICredits]);

  return {
    aiCredits,
    creditsRemaining: aiCredits.credits_remaining,
    creditsLimit: aiCredits.credits_limit,
    tier: aiCredits.tier,
    periodEnd: aiCredits.period_end,
    isExpired: aiCredits.is_expired,
    loading,
    refresh: fetchAICredits
  };
}
