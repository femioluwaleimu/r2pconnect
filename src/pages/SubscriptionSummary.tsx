import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { handleEdgeFunctionResponse } from "@/lib/edgeFunctionError";
import { useCurrency } from "@/context/CurrencyContext";
import { normalizeSubscriptionPlan } from "@/lib/subscriptionPlans";
import { 
  ArrowLeft, Check, Loader2, Tag, Sparkles, CreditCard, 
  Percent, Shield, Clock, Zap, X, CheckCircle2
} from "lucide-react";

interface SubscriptionPlan {
  id: string;
  plan_id: string;
  name: string;
  description: string | null;
  amount_ngn: number;
  period: string;
  features: string[];
  ai_credits_per_day: number;
}

interface CouponCode {
  id: string;
  code: string;
  discount_percentage: number;
  description: string | null;
}

export default function SubscriptionSummary() {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponCode | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { formatCurrency, convert } = useCurrency();

  const planId = searchParams.get("plan");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);

      if (!planId) {
        navigate("/dashboard/subscriptions");
        return;
      }

      // Fetch plan details
      const { data: planData, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("plan_id", planId)
        .maybeSingle();

      if (error || !planData) {
        toast({ title: "Plan not found", variant: "destructive" });
        navigate("/dashboard/subscriptions");
        return;
      }

      setPlan(normalizeSubscriptionPlan(planData));
      setLoading(false);
    };

    init();
  }, [planId, navigate, toast]);

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;

    setValidatingCoupon(true);
    setCouponError("");

    try {
      // Check if coupon exists and is valid
      const { data: coupon, error } = await supabase
        .from("coupon_codes")
        .select("*")
        .eq("code", couponCode.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (!coupon) {
        setCouponError("Invalid coupon code");
        return;
      }

      // Check if valid period
      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        setCouponError("This coupon has expired");
        return;
      }

      // Check max uses
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        setCouponError("This coupon has reached its usage limit");
        return;
      }

      // Check plan restriction
      if (coupon.plan_id && coupon.plan_id !== planId) {
        setCouponError("This coupon doesn't apply to the selected plan");
        return;
      }

      // Check institution restriction
      if (coupon.institution_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("institution_id")
          .eq("user_id", user?.id)
          .maybeSingle();
        if (profile?.institution_id !== coupon.institution_id) {
          setCouponError("This coupon is not valid for your institution");
          return;
        }
      }

      // Check per-user usage limit
      const { count: userUsageCount } = await supabase
        .from("coupon_usages")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", coupon.id)
        .eq("user_id", user?.id);

      const perUserLimit = coupon.max_uses_per_user ?? 1;
      if (coupon.discount_percentage < 100 && (userUsageCount ?? 0) >= perUserLimit) {
        setCouponError(
          perUserLimit === 1
            ? "You have already used this coupon"
            : `You have reached the usage limit (${perUserLimit}) for this coupon`
        );
        return;
      }

      if (coupon.discount_percentage === 100) {
        const monthStart = new Date();
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);
        const { count: monthlyUsageCount } = await supabase
          .from("coupon_usages")
          .select("id", { count: "exact", head: true })
          .eq("coupon_id", coupon.id)
          .eq("user_id", user?.id)
          .gte("used_at", monthStart.toISOString());

        if ((monthlyUsageCount ?? 0) > 0) {
          setCouponError("You have already used this coupon this month");
          return;
        }
      }

      setAppliedCoupon(coupon);
      toast({ title: "Coupon applied!", description: `${coupon.discount_percentage}% discount applied` });
    } catch (error: any) {
      setCouponError(error.message || "Failed to validate coupon");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const handleProceedToPayment = async () => {
    if (!user || !plan) return;

    setProcessing(true);
    try {
      const isFreeActivation = appliedCoupon?.discount_percentage === 100;
      const { data, error } = await supabase.functions.invoke("paystack", {
        body: {
          action: isFreeActivation ? "activate_free_subscription" : "initialize",
          planId: plan.plan_id.replace("researcher_", ""),
          couponId: appliedCoupon?.id || null,
          couponCode: appliedCoupon?.code || null,
        }
      });

      const [result, errorMsg] = handleEdgeFunctionResponse(data, error);
      if (errorMsg) throw new Error(errorMsg);

      if (result?.success && isFreeActivation) {
        toast({ title: "Subscription activated", description: "Your plan has been activated for the month." });
        navigate("/dashboard/subscriptions");
        return;
      }

      if (result?.authorization_url) {
        window.location.href = result.authorization_url;
      }
    } catch (error: any) {
      toast({ title: "Payment Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!plan) return null;

  const originalAmount = plan.amount_ngn;
  const discountAmount = appliedCoupon 
    ? (originalAmount * appliedCoupon.discount_percentage) / 100 
    : 0;
  const finalAmount = originalAmount - discountAmount;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/subscriptions")}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Order Summary</h1>
            <p className="text-muted-foreground">Review your subscription before payment</p>
          </div>
        </div>

        {/* Plan Details Card */}
        <Card className="rounded-2xl shadow-lg border-primary/20 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{plan.name} Plan</CardTitle>
                <CardDescription className="mt-1">{plan.description}</CardDescription>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-lg px-4 py-2">
                {plan.period}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Features */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">What's Included:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {plan.features.slice(0, 6).map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-stat-green flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Credits Badge */}
            {plan.ai_credits_per_day > 0 && (
              <div className="flex items-center gap-3 p-3 bg-violet-500/10 rounded-xl">
                <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="font-semibold text-violet-700 dark:text-violet-400">
                    {plan.ai_credits_per_day} AI Credits / Month
                  </p>
                  <p className="text-xs text-muted-foreground">For research analysis & summaries</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coupon Code Card */}
        <Card className="rounded-2xl shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Have a Coupon Code?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-4 bg-stat-green/10 rounded-xl border border-stat-green/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-stat-green" />
                  <div>
                    <p className="font-semibold text-stat-green">{appliedCoupon.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {appliedCoupon.discount_percentage}% discount applied
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeCoupon}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError("");
                  }}
                  className="rounded-xl uppercase"
                />
                <Button
                  onClick={validateCoupon}
                  disabled={!couponCode.trim() || validatingCoupon}
                  className="rounded-xl"
                >
                  {validatingCoupon ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
            )}
            {couponError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <X className="w-3 h-3" />
                {couponError}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payment Summary Card */}
        <Card className="rounded-2xl shadow-lg border-2 border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(originalAmount, 'NGN')}</span>
              </div>
              
              {appliedCoupon && (
                <div className="flex justify-between text-stat-green">
                  <span className="flex items-center gap-1">
                    <Percent className="w-4 h-4" />
                    Discount ({appliedCoupon.discount_percentage}%)
                  </span>
                  <span className="font-medium">-{formatCurrency(discountAmount, 'NGN')}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary">{formatCurrency(finalAmount, 'NGN')}</span>
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
                  <span>{finalAmount <= 0 ? "No payment required for this activation" : "Secure payment via Paystack"}</span>
            </div>

            <Button
              onClick={handleProceedToPayment}
              disabled={processing}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-lg font-semibold"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  {finalAmount <= 0 ? "Activate Plan" : `Pay ${formatCurrency(finalAmount, 'NGN')}`}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By proceeding, you agree to our Terms of Service
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
