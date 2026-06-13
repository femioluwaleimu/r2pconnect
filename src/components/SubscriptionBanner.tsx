import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Crown, AlertTriangle, XCircle, Clock, Sparkles } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

interface SubscriptionData {
  tier: string;
  is_active: boolean;
  current_period_end: string | null;
  ai_credits_remaining: number | null;
  ai_matchers_remaining: number | null;
}

export default function SubscriptionBanner() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleData) {
        setUserRole(roleData.role);
      }

      // Fetch subscription
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("tier, is_active, current_period_end, ai_credits_remaining, ai_matchers_remaining")
        .eq("user_id", user.id)
        .single();

      if (subData) {
        setSubscription(subData);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !subscription) return null;

  const getDaysUntilExpiry = (): number | null => {
    if (!subscription.current_period_end) return null;
    return differenceInDays(parseISO(subscription.current_period_end), new Date());
  };

  const daysLeft = getDaysUntilExpiry();
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
  const isFree = subscription.tier === "free";

  // Get credits based on role
  const getCreditsDisplay = () => {
    if (userRole === "industry") {
      return `${subscription.ai_matchers_remaining ?? 0} AI Matchers remaining`;
    }
    return `${subscription.ai_credits_remaining ?? 0} AI Credits remaining`;
  };

  const getUpgradeLink = () => {
    if (userRole === "industry") return "/industry/subscriptions";
    return "/dashboard/subscriptions";
  };

  // Determine banner style and content
  if (isExpired && !isFree) {
    return (
      <Alert className="border-destructive/50 bg-destructive/10 mb-4">
        <XCircle className="h-4 w-4 text-destructive" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-destructive font-medium">
            Your {subscription.tier} subscription has expired. Renew now to continue using premium features.
          </span>
          <Link to={getUpgradeLink()}>
            <Button size="sm" variant="destructive" className="rounded-xl">
              <Crown className="w-4 h-4 mr-1" />
              Renew Now
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (isExpiringSoon && !isFree) {
    return (
      <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 mb-4">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-amber-700 dark:text-amber-400 font-medium">
            Your {subscription.tier} plan expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}. {getCreditsDisplay()}.
          </span>
          <Link to={getUpgradeLink()}>
            <Button size="sm" className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white">
              <Clock className="w-4 h-4 mr-1" />
              Renew Plan
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (isFree) {
    return (
      <Alert className="border-primary/30 bg-primary/5 mb-4">
        <Sparkles className="h-4 w-4 text-primary" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-foreground">
            <span className="font-medium">Free Plan</span> — {getCreditsDisplay()}. Upgrade for more features!
          </span>
          <Link to={getUpgradeLink()}>
            <Button size="sm" className="rounded-xl">
              <Crown className="w-4 h-4 mr-1" />
              Upgrade
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Active paid subscription
  return (
    <Alert className="border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 mb-4">
      <Crown className="h-4 w-4 text-emerald-600" />
      <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-emerald-700 dark:text-emerald-400">
          <span className="font-medium capitalize">{subscription.tier} Plan</span> — {getCreditsDisplay()}
          {daysLeft !== null && ` • Renews in ${daysLeft} days`}
        </span>
        <Link to={getUpgradeLink()}>
          <Button size="sm" variant="outline" className="rounded-xl border-emerald-500/50 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-950/50">
            Manage Plan
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}
