import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import IndustryLayout from "@/components/layout/IndustryLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check, Crown, Zap, Loader2, Star, CreditCard, Globe, Trophy, Users, Upload, Receipt } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatLagos } from "@/lib/dateUtils";
import { normalizeSubscriptionPlan } from "@/lib/subscriptionPlans";

interface SubscriptionPlan {
  id: string;
  plan_id: string;
  name: string;
  description: string | null;
  amount_ngn: number;
  period: string;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  max_challenges: number;
  ai_matches_per_challenge: number;
}

interface SubscriptionDetails {
  tier: string;
  current_period_end: string | null;
  current_period_start: string | null;
  max_challenges_per_month: number | null;
  ai_matches_per_challenge: number | null;
  ai_matchers_remaining: number | null;
}

export default function IndustrySubscriptions() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [totalUploads, setTotalUploads] = useState(0);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currency, saveCurrencyPreference, formatCurrency, loading: ratesLoading } = useCurrency();

  const availableCurrencies = ['USD', 'NGN', 'EUR', 'GBP'];
  
  const tierOrder = ['free', 'basic', 'pro', 'enterprise'];
  const currentTierIndex = tierOrder.indexOf(currentPlan);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchSubscription(user.id);
      fetchUploads(user.id);
    });
    fetchPlans();
  }, [navigate]);

  useEffect(() => {
    if (searchParams.get('verify') === 'true' && searchParams.get('reference')) {
      verifyPayment(searchParams.get('reference')!);
    }
  }, [searchParams]);

  const fetchPlans = async () => {
    setPlansLoading(true);
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('user_type', 'industry')
      .eq('is_active', true)
      .order('sort_order');

    if (!error && data) {
      const parsedPlans = data.map(normalizeSubscriptionPlan);
      setPlans(parsedPlans);
    }
    setPlansLoading(false);
  };

  const fetchSubscription = async (userId: string) => {
    const { data } = await supabase
      .from('subscriptions')
      .select('tier, current_period_end, current_period_start, max_challenges_per_month, ai_matches_per_challenge, ai_matchers_remaining')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setCurrentPlan(data.tier);
      setSubscriptionDetails(data);
    }
  };

  const fetchUploads = async (userId: string) => {
    const { count } = await supabase
      .from('challenges')
      .select('id', { count: 'exact' })
      .eq('industry_id', userId);
    setTotalUploads(count || 0);
  };

  const verifyPayment = async (reference: string) => {
    setLoading('verifying');
    try {
      const { data, error } = await supabase.functions.invoke('paystack', {
        body: { action: 'verify', reference }
      });

      if (error) throw error;

      if (data.success) {
        toast({ title: "Payment successful!", description: `You are now on the ${data.tier} plan` });
        setCurrentPlan(data.tier);
        if (user) {
          await fetchSubscription(user.id);
        }
        navigate('/industry/subscriptions', { replace: true });
      } else {
        toast({ title: "Payment failed", description: data.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) return;

    // Navigate to summary page for non-free plans
    const tier = planId.replace('industry_', '');
    if (tier !== 'free') {
      navigate(`/industry/subscription-summary?plan=${planId}`);
      return;
    }

    setLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke('paystack', {
        body: { 
          action: 'initialize', 
          planId: planId.replace('industry_', ''),
          userType: 'industry'
        }
      });

      if (error) throw error;

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(null);
    }
  };

  const getPlanTierFromId = (planId: string) => {
    return planId.replace('industry_', '');
  };
  
  const isLowerPlan = (planTier: string) => {
    const planIndex = tierOrder.indexOf(planTier);
    return planIndex < currentTierIndex;
  };
  
  const getDaysUntilExpiry = () => {
    if (!subscriptionDetails?.current_period_end) return null;
    const endDate = new Date(subscriptionDetails.current_period_end);
    const now = new Date();
    const diff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };
  
  const aiMatcherLimit = subscriptionDetails?.ai_matches_per_challenge || 3;
  const aiMatcherRemaining = subscriptionDetails?.ai_matchers_remaining ?? aiMatcherLimit;
  const aiMatcherUsed = Math.max(0, aiMatcherLimit - aiMatcherRemaining);

  if (plansLoading) {
    return (
      <IndustryLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </IndustryLayout>
    );
  }

  return (
    <IndustryLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-foreground mb-2">Industry Plans</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Unlock more challenges and AI-powered researcher matching
          </p>
        </div>

        {/* Currency Selector */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2 sm:gap-3 bg-card border border-border rounded-xl p-2 sm:p-3">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            <span className="text-xs sm:text-sm text-muted-foreground">View prices in:</span>
            <Select value={currency} onValueChange={saveCurrencyPreference}>
              <SelectTrigger className="w-20 sm:w-24 rounded-lg text-xs sm:text-sm h-8 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map((curr) => (
                  <SelectItem key={curr} value={curr}>
                    {curr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ratesLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </div>

        {/* Current Plan Banner with Details */}
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none shadow-lg rounded-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8" />
              <div>
                <p className="text-base sm:text-lg font-bold">You're on the {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan</p>
                {subscriptionDetails?.current_period_end && getDaysUntilExpiry() !== null && (
                  <p className="text-xs sm:text-sm opacity-80">
                    {getDaysUntilExpiry()} days until renewal • Expires {formatLagos(subscriptionDetails.current_period_end)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-white/10 rounded-lg p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs opacity-70">AI Matcher Used</p>
                <p className="text-lg sm:text-2xl font-bold">{aiMatcherUsed}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs opacity-70">AI Matcher Left</p>
                <p className="text-lg sm:text-2xl font-bold">{aiMatcherRemaining}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs opacity-70">Challenges/Month</p>
                <p className="text-lg sm:text-2xl font-bold">{subscriptionDetails?.max_challenges_per_month || 1}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs opacity-70">Total Uploads</p>
                <p className="text-lg sm:text-2xl font-bold">{totalUploads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-sm sm:text-base">Industry Subscription Benefits</h4>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                    Post more challenges to find solutions
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                    AI-powered researcher matching
                  </li>
                  <li>• Priority support and dedicated account manager</li>
                  <li>• Cancel anytime with no hidden fees</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plans Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {plans.map((plan) => {
            const planTier = getPlanTierFromId(plan.plan_id);
            const isCurrentPlan = currentPlan === planTier;
            const displayPrice = formatCurrency(plan.amount_ngn, 'NGN');
            
            return (
              <Card 
                key={plan.id} 
                className={`relative rounded-xl ${plan.is_popular ? 'ring-2 ring-amber-500 shadow-xl' : ''} ${isCurrentPlan ? 'bg-amber-500/5' : ''}`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-2 sm:px-4 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-sm font-medium flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" />
                    Popular
                  </div>
                )}
                
                <CardHeader className="text-center pb-2 sm:pb-4 px-2 sm:px-6">
                  <CardTitle className="text-sm sm:text-xl">{plan.name}</CardTitle>
                  <div className="mt-1 sm:mt-2">
                    <span className="text-xl sm:text-4xl font-bold text-foreground">{displayPrice}</span>
                    <span className="text-muted-foreground text-xs sm:text-base">/{plan.period}</span>
                  </div>
                  <CardDescription className="mt-1 sm:mt-2 text-[10px] sm:text-sm line-clamp-2">{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3 sm:space-y-4 px-2 sm:px-6">
                  {/* Key Limits */}
                  <div className="bg-muted/50 rounded-lg p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                    <div className="flex items-center justify-between text-[10px] sm:text-sm">
                      <span className="text-muted-foreground">Challenges/month</span>
                      <span className="font-semibold text-foreground">{plan.max_challenges === 999 ? '∞' : plan.max_challenges}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-sm">
                      <span className="text-muted-foreground">AI matches</span>
                      <span className="font-semibold text-foreground">{plan.ai_matches_per_challenge === 100 ? '∞' : plan.ai_matches_per_challenge}</span>
                    </div>
                  </div>

                  <ul className="space-y-1.5 sm:space-y-3">
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-stat-green flex-shrink-0" />
                        <span className="text-foreground line-clamp-1">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    className="w-full rounded-lg sm:rounded-xl text-[10px] sm:text-sm h-8 sm:h-10"
                    variant={plan.is_popular ? "default" : "outline"}
                    disabled={isCurrentPlan || loading === plan.plan_id || isLowerPlan(planTier)}
                    onClick={() => handleSubscribe(plan.plan_id)}
                  >
                    {loading === plan.plan_id ? (
                      <>
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : plan.amount_ngn === 0 ? (
                      "Free Plan"
                    ) : isLowerPlan(planTier) ? (
                      "After expiry"
                    ) : (
                      <>
                        {plan.is_popular && <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />}
                        Upgrade
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Payment History Link */}
        <div className="flex justify-center">
          <Link to="/industry/payment-history">
            <Button variant="outline" className="rounded-xl gap-2">
              <Receipt className="w-4 h-4" />
              View Payment History
            </Button>
          </Link>
        </div>

        {/* FAQ */}
        <Card className="mt-6 sm:mt-8 rounded-xl">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-base sm:text-xl">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
            <div>
              <h4 className="font-medium text-foreground text-sm sm:text-base">What are challenges?</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">Challenges are real-world problems you post for researchers to solve. Each plan allows a different number of challenges per month.</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm sm:text-base">How does AI matching work?</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">Our AI analyzes your challenge against published research papers to find researchers with relevant expertise.</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm sm:text-base">Can I cancel anytime?</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </IndustryLayout>
  );
}