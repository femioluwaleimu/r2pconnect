import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Gift, Copy, Check, Users, Loader2, Share2, Link2, Sparkles, Info, TrendingUp } from "lucide-react";

interface ReferralCode {
  id: string;
  code: string;
  total_referrals: number;
}

export default function ReferralCard() {
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [commissionRate, setCommissionRate] = useState<string>("5");
  const { toast } = useToast();

  useEffect(() => {
    fetchReferralCode();
    fetchCommissionRate();
  }, []);

  const fetchReferralCode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("referral_codes")
        .select("id, code, total_referrals")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      setReferralCode(data);
    } catch (error: any) {
      console.error("Error fetching referral code:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissionRate = async () => {
    try {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "referrer_commission_rate")
        .maybeSingle();
      if (data?.value) setCommissionRate(data.value);
    } catch (e) {
      // fallback to default
    }
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "REF";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createReferralCode = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const code = generateCode();
      const { data, error } = await supabase
        .from("referral_codes")
        .insert({ user_id: user.id, code })
        .select("id, code, total_referrals")
        .single();

      if (error) throw error;
      setReferralCode(data);
      toast({ title: "Referral code created!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Code copied!" });
    }
  };

  const referralLink = referralCode
    ? `${window.location.origin}/auth?ref=${referralCode.code}&mode=signup`
    : "";

  const copyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({ title: "Link copied!" });
    }
  };

  const shareCode = () => {
    if (referralCode && navigator.share) {
      navigator.share({
        title: "Join R2P Connect",
        text: `Join R2P Connect using my referral link! You'll get great research tools and I'll earn commission when you subscribe.`,
        url: referralLink,
      });
    } else {
      copyLink();
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-lg border-border/50">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-lg border-border/50 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Invite & Earn</CardTitle>
            <CardDescription>Earn {commissionRate}% commission monthly</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <Sparkles className="w-4 h-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Earn monthly commission!</strong> When someone signs up with your link and subscribes,
            you earn <strong>{commissionRate}%</strong> of their subscription fee every month as long as they remain subscribed.
          </AlertDescription>
        </Alert>

        {referralCode ? (
          <>
            {/* Referral Link */}
            <div className="space-y-2">
              <ReferralLabel icon={<Link2 className="w-3 h-3" />} text="Your Referral Link" />
              <div className="flex gap-2">
                <Input value={referralLink} readOnly className="rounded-xl text-xs font-mono bg-background/80" />
                <Button variant="outline" size="icon" onClick={copyLink} className="shrink-0 rounded-xl">
                  {copiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Referral Code */}
            <div className="space-y-2">
              <ReferralLabel text="Your Referral Code" />
              <div className="flex gap-2">
                <Input value={referralCode.code} readOnly className="rounded-xl font-mono text-center text-lg font-bold tracking-wider" />
                <Button variant="outline" size="icon" onClick={copyCode} className="shrink-0 rounded-xl">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={copyLink} className="flex-1 rounded-xl">
                <Link2 className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button onClick={shareCode} className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-background/80 border border-border/50 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xl font-bold text-foreground">{referralCode.total_referrals}</span>
                </div>
                <p className="text-xs text-muted-foreground">Referrals</p>
              </div>
              <div className="p-3 rounded-xl bg-background/80 border border-border/50 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-xl font-bold text-foreground">{commissionRate}%</span>
                </div>
                <p className="text-xs text-muted-foreground">Commission Rate</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              <Info className="w-3 h-3 inline mr-1" />
              You earn {commissionRate}% of your referee's subscription every month they stay subscribed.
            </p>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Generate your referral code and earn monthly commission from your referrals' subscriptions.
            </p>
            <Button onClick={createReferralCode} disabled={generating} className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
              {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate Referral Code
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReferralLabel({ children, icon, text, className }: { children?: React.ReactNode; icon?: React.ReactNode; text: string; className?: string }) {
  return (
    <p className={`text-xs font-medium text-muted-foreground flex items-center gap-1 ${className || ""}`}>
      {icon}
      {text}
      {children}
    </p>
  );
}
