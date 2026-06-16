import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SupervisorLayout from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Users, ArrowUpRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatLagos } from "@/lib/dateUtils";
import { formatCurrencyAmount, toNumber } from "@/lib/numberFormat";

interface Earning {
  id: string;
  student_id: string;
  amount: number;
  commission_rate: number;
  currency: string;
  created_at: string;
  student_name?: string;
}

export default function SupervisorRevenue() {
  const [wallet, setWallet] = useState<{ balance: number; total_earned: number; total_withdrawn: number; currency: string } | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/auth"); return; }
      fetchData(user.id);
    });
  }, [navigate]);

  const fetchData = async (userId: string) => {
    setLoading(true);

    // Fetch wallet
    const { data: walletData } = await supabase
      .from("supervisor_wallet")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (walletData) setWallet({
      ...walletData,
      balance: toNumber(walletData.balance),
      total_earned: toNumber(walletData.total_earned),
      total_withdrawn: toNumber(walletData.total_withdrawn),
    });
    else setWallet({ balance: 0, total_earned: 0, total_withdrawn: 0, currency: "NGN" });

    // Fetch earnings
    const { data: earningsData } = await supabase
      .from("commission_earnings")
      .select("*")
      .eq("beneficiary_id", userId)
      .eq("beneficiary_type", "supervisor")
      .order("created_at", { ascending: false })
      .limit(50);

    if (earningsData && earningsData.length > 0) {
      // Fetch student names
      const studentIds = [...new Set(earningsData.map(e => e.student_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentIds);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      setEarnings(earningsData.map(e => ({
        ...e,
        amount: toNumber(e.amount),
        student_name: nameMap.get(e.student_id) || "Unknown Student"
      })));
    }

    setLoading(false);
  };

  const formatCurrency = (amount: number) => formatCurrencyAmount(amount);

  if (loading) {
    return (
      <SupervisorLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
          <p className="text-muted-foreground">Track your earnings from student subscriptions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="rounded-2xl border-0 shadow-lg">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-medium text-muted-foreground">Available Balance</span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(wallet?.balance || 0)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-lg">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-medium text-muted-foreground">Total Earned</span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(wallet?.total_earned || 0)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-lg">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-medium text-muted-foreground">Total Withdrawn</span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                  <ArrowUpRight className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(wallet?.total_withdrawn || 0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Earnings History */}
        <Card className="rounded-2xl border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Earnings History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {earnings.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No earnings yet</p>
                <p className="text-sm text-muted-foreground">You'll earn commission when your students subscribe to a plan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {earnings.map((earning) => (
                  <div key={earning.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                    <div>
                      <p className="font-medium text-foreground">{earning.student_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {earning.commission_rate}% commission • {formatLagos(earning.created_at)}
                      </p>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-base font-bold">
                      +{formatCurrency(earning.amount)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SupervisorLayout>
  );
}
