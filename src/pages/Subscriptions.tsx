import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { handleEdgeFunctionResponse } from "@/lib/edgeFunctionError";
import { Check, Crown, Zap, Loader2, Star, CreditCard, Globe, Sparkles, Calendar, Receipt } from "lucide-react";
import CreditTopupDialog from "@/components/CreditTopupDialog";
import { useCurrency } from "@/context/CurrencyContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatLagos } from "@/lib/dateUtils";

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
  ai_credits_per_day: number;
}

interface Subscription {
  id: string;
  tier: string;
  amount: number | null;
  currency: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  is_active: boolean | null;
  ai_credits_remaining: number | null;
  ai_matches_per_challenge: number | null;
  max_challenges_per_month: number | null;
}

const PLAN_ORDER = ['free', 'basic', 'pro', 'enterprise'];

export default function Subscriptions() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loading, setLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [creditsLimit, setCreditsLimit] = useState<number>(3);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currency, setCurrency, formatCurrency, loading: ratesLoading } = useCurrency();

  const availableCurrencies = ['USD', 'NGN', 'EUR', 'GBP'];

  const fetchSubscription = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setCurrentPlan(data.tier);
      setSubscription(data);
      
      // Fetch credits limit from subscription_plans
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('ai_credits_per_day')
        .eq('plan_id', `researcher_${data.tier}`)
        .maybeSingle();
      
      // Fetch topup credits purchased during current subscription period
      let topupCredits = 0;
      const startAt = data.current_period_start ? new Date(data.current_period_start).toISOString() : null;
      const endAt = data.current_period_end ? new Date(data.current_period_end).toISOString() : null;

      let topupQuery = supabase
        .from('credit_topup_purchases')
        .select('credits')
        .eq('user_id', userId)
        .in('status', ['completed', 'success']);

      if (startAt) topupQuery = topupQuery.gte('created_at', startAt);
      if (endAt) topupQuery = topupQuery.lte('created_at', endAt);

      const { data: topups } = await topupQuery;
      topupCredits = (topups || []).reduce((sum, t) => sum + Number(t.credits || 0), 0);
      
      const baseCredits = Number(planData?.ai_credits_per_day || 3);
      setCreditsLimit(baseCredits + topupCredits);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('user_type', 'researcher')
      .eq('is_active', true)
      .order('sort_order');

    if (!error && data) {
      const parsedPlans = data.map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features as string[] : []
      }));
      setPlans(parsedPlans);
    }
    setPlansLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchSubscription(user.id);
    });
    fetchPlans();
  }, [navigate, fetchSubscription, fetchPlans]);

  useEffect(() => {
    if (searchParams.get('verify') === 'true' && searchParams.get('reference')) {
      verifyPayment(searchParams.get('reference')!);
    }
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    setLoading('verifying');
    try {
      const { data, error } = await supabase.functions.invoke('paystack', {
        body: { action: 'verify', reference }
      });

      const [result, errorMsg] = handleEdgeFunctionResponse(data, error);
      if (errorMsg) throw new Error(errorMsg);

      if (result?.success) {
        toast({ title: "Payment successful!", description: `You are now on the ${result.tier} plan with ${result.aiCredits} monthly AI credits` });
        setCurrentPlan(result.tier);
        
        if (user) {
          await fetchSubscription(user.id);
        }
        
        navigate('/dashboard/subscriptions', { replace: true });
      } else {
        toast({ title: "Payment failed", description: result?.message || "Unknown error", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Payment Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) return;

    // Navigate to summary page for non-free plans
    const tier = planId.replace('researcher_', '');
    if (tier !== 'free') {
      navigate(`/dashboard/subscription-summary?plan=${planId}`);
      return;
    }

    setLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke('paystack', {
        body: { 
          action: 'initialize', 
          planId: tier
        }
      });

      const [result, errorMsg] = handleEdgeFunctionResponse(data, error);
      if (errorMsg) throw new Error(errorMsg);

      if (result?.authorization_url) {
        window.location.href = result.authorization_url;
      }
    } catch (error: any) {
      toast({ title: "Subscription Error", description: error.message, variant: "destructive" });
      setLoading(null);
    }
  };

  const getPlanTierFromId = (planId: string) => {
    return planId.replace('researcher_', '');
  };

  const isLowerPlan = (planTier: string) => {
    const currentIndex = PLAN_ORDER.indexOf(currentPlan);
    const planIndex = PLAN_ORDER.indexOf(planTier);
    return planIndex < currentIndex;
  };

  const isSubscriptionActive = () => {
    if (!subscription || !subscription.current_period_end) return false;
    return new Date(subscription.current_period_end) > new Date();
  };

  const getExpiryDate = () => {
    if (!subscription?.current_period_end) return null;
    return new Date(subscription.current_period_end);
  };

  const getDaysUntilExpiry = () => {
    const expiry = getExpiryDate();
    if (!expiry) return null;
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const creditsRemaining = subscription?.ai_credits_remaining ?? 0;
  const creditsUsed = creditsLimit - creditsRemaining;

  if (plansLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-foreground mb-2">Choose Your Plan</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Unlock more AI credits and features with our premium plans
          </p>
        </div>

        {/* AI Credits Status */}
        <Card className="bg-gradient-to-r from-violet-500 to-purple-600 text-primary-foreground rounded-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="text-base sm:text-xl font-bold">AI Credits</p>
                  <p className="text-xs sm:text-sm opacity-80">Monthly allocation</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                <div className="bg-primary-foreground/20 rounded-lg p-2 sm:p-3">
                  <p className="text-xl sm:text-3xl font-bold">{creditsUsed}</p>
                  <p className="text-[10px] sm:text-xs opacity-80">Used</p>
                </div>
                <div className="bg-primary-foreground/20 rounded-lg p-2 sm:p-3">
                  <p className="text-xl sm:text-3xl font-bold">{creditsRemaining}</p>
                  <p className="text-[10px] sm:text-xs opacity-80">Remaining</p>
                </div>
                <div className="bg-primary-foreground/20 rounded-lg p-2 sm:p-3">
                  <p className="text-xl sm:text-3xl font-bold">{creditsLimit}</p>
                  <p className="text-[10px] sm:text-xs opacity-80">Total</p>
                </div>
              </div>
            </div>
            {subscription?.current_period_end && (
              <div className="mt-4 pt-4 border-t border-primary-foreground/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs sm:text-sm opacity-80">
                  Resets on: <span className="font-semibold">{formatLagos(subscription.current_period_end)}</span>
                </p>
                {subscription?.is_active && (
                  <CreditTopupDialog
                    onSuccess={() => user && fetchSubscription(user.id)}
                    trigger={
                      <Button size="sm" className="rounded-xl bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 text-xs sm:text-sm">
                        <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        Top Up Credits
                      </Button>
                    }
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History Button */}
        <div className="flex justify-end">
          <Link to="/dashboard/payment-history">
            <Button variant="outline" className="rounded-xl">
              <Receipt className="w-4 h-4 mr-2" />
              Payment History
            </Button>
          </Link>
        </div>

        {subscription && (
          <Card className="rounded-xl border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Subscription Status</CardTitle>
              <CardDescription>Current monthly activation period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="font-semibold capitalize text-foreground">{currentPlan}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Starts</p>
                  <p className="font-semibold text-foreground">
                    {subscription.current_period_start ? formatLagos(subscription.current_period_start) : "Not active"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Ends</p>
                  <p className="font-semibold text-foreground">
                    {subscription.current_period_end ? formatLagos(subscription.current_period_end) : "Not active"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Currency Selector */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2 sm:gap-3 bg-card border border-border rounded-xl p-2 sm:p-3">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            <span className="text-xs sm:text-sm text-muted-foreground">View prices in:</span>
            <Select value={currency} onValueChange={setCurrency}>
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

        {/* Current Plan Banner */}
        {currentPlan !== 'free' && subscription && isSubscriptionActive() && (
          <Card className="bg-gradient-to-r from-emerald-500 to-teal-500 text-primary-foreground rounded-xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Crown className="w-6 h-6 sm:w-8 sm:h-8" />
                  <div>
                    <p className="text-base sm:text-xl font-bold">You're on the {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan</p>
                    <p className="text-xs sm:text-sm opacity-80">Thank you for supporting R2PConnect!</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="bg-primary-foreground/20 rounded-lg p-2 sm:p-3">
                    <p className="opacity-80">Amount</p>
                    <p className="font-bold">{formatCurrency(subscription.amount || 0, subscription.currency || 'NGN')}</p>
                  </div>
                  <div className="bg-primary-foreground/20 rounded-lg p-2 sm:p-3">
                    <div className="flex items-center gap-1 opacity-80">
                      <Calendar className="w-3 h-3" />
                      <p>Expires</p>
                    </div>
                    <p className="font-bold">{getExpiryDate() ? formatLagos(getExpiryDate()!) : 'N/A'}</p>
                  </div>
                  <div className="bg-primary-foreground/20 rounded-lg p-2 sm:p-3">
                    <p className="opacity-80">Days Left</p>
                    <p className="font-bold">{getDaysUntilExpiry() || 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-primary-foreground rounded-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-foreground/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h4 className="font-semibold mb-1 text-sm sm:text-base">Subscription Benefits</h4>
                <ul className="text-xs sm:text-sm opacity-90 space-y-1">
                  <li>• More AI credits for research analysis and summaries (monthly)</li>
                  <li>• Priority review for faster publication</li>
                  <li>• Industry matching to connect with partners</li>
                  <li>• Cancel anytime with no hidden fees</li>
                  <li>• Secure payment via Paystack</li>
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
            const isLower = isLowerPlan(planTier);
            const canDowngrade = isLower && isSubscriptionActive();
            
            return (
              <Card 
                key={plan.id} 
                className={`relative rounded-xl ${plan.is_popular ? 'ring-2 ring-primary shadow-xl' : ''} ${isCurrentPlan ? 'bg-gradient-to-br from-primary/10 to-accent/10' : 'bg-gradient-to-br from-card to-muted/30'}`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 sm:px-4 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-sm font-medium flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" />
                    Popular
                  </div>
                )}
                
                <CardHeader className="text-center pb-2 sm:pb-4 px-2 sm:px-6">
                  <CardTitle className="text-sm sm:text-xl text-foreground">{plan.name}</CardTitle>
                  <div className="mt-1 sm:mt-2">
                    <span className="text-xl sm:text-4xl font-bold text-foreground">{displayPrice}</span>
                    <span className="text-muted-foreground text-xs sm:text-base">/{plan.period}</span>
                  </div>
                  <CardDescription className="mt-1 sm:mt-2 text-[10px] sm:text-sm line-clamp-2 text-muted-foreground">{plan.description}</CardDescription>
                  {plan.ai_credits_per_day > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-sm font-medium">
                      <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      {plan.ai_credits_per_day} AI Credits/month
                    </div>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-3 sm:space-y-4 px-2 sm:px-6">
                  <ul className="space-y-1.5 sm:space-y-3">
                    {plan.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-stat-green flex-shrink-0" />
                        <span className="text-foreground dark:text-foreground line-clamp-1">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    className="w-full rounded-lg sm:rounded-xl text-[10px] sm:text-sm h-8 sm:h-10"
                    variant={plan.is_popular ? "default" : "outline"}
                    disabled={(isCurrentPlan && isSubscriptionActive()) || loading === plan.plan_id || canDowngrade}
                    onClick={() => handleSubscribe(plan.plan_id)}
                  >
                    {loading === plan.plan_id ? (
                      <>
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan && isSubscriptionActive() ? (
                      "Current Plan"
                    ) : isCurrentPlan && !isSubscriptionActive() ? (
                      "Reactivate"
                    ) : plan.amount_ngn === 0 ? (
                      "Free Plan"
                    ) : canDowngrade ? (
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

        {/* FAQ */}
        <Card className="mt-6 sm:mt-8 rounded-xl">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-base sm:text-xl">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
            <div>
              <h4 className="font-medium text-foreground text-sm sm:text-base">What are AI credits?</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">AI credits are used for AI-powered research analysis, abstract generation, and other AI features. Credits reset monthly.</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm sm:text-base">Can I cancel anytime?</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm sm:text-base">What payment methods are accepted?</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">We accept all major Nigerian bank cards, USSD, and bank transfers via Paystack.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}