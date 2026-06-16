import { useState, useEffect } from "react";
import IPNLayout from "@/components/layout/IPNLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Building2, Briefcase, Users, Wallet, TrendingUp, FileCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatLagos } from "@/lib/dateUtils";
import { formatCurrencyAmount, toNumber } from "@/lib/numberFormat";

interface AnalyticsData {
  totalCompanies: number;
  activeCompanies: number;
  totalOpportunities: number;
  publishedOpportunities: number;
  totalApplications: number;
  statusBreakdown: { pending: number; shortlisted: number; rejected: number };
  totalRevenue: number;
  recentPayments: any[];
  topOpportunities: any[];
}

export default function IPNAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [companiesRes, oppsRes, appsRes, walletRes, paymentsRes] = await Promise.all([
      supabase.from("ipn_companies").select("id, is_active").eq("ipn_user_id", user.id),
      supabase.from("ipn_opportunities").select("id, title, is_published, slots_available, slots_filled").eq("ipn_user_id", user.id),
      supabase.from("ipn_applications").select("id, status, opportunity_id, created_at"),
      supabase.from("ipn_wallet").select("balance, total_earned, total_withdrawn").eq("user_id", user.id).maybeSingle(),
      supabase.from("ipn_payments").select("id, amount_ngn, ipn_share_ngn, created_at, opportunity_id, ipn_opportunities(title)").eq("status", "success").order("created_at", { ascending: false }).limit(10),
    ]);

    const companies = companiesRes.data || [];
    const opps = oppsRes.data || [];
    const apps = appsRes.data || [];

    const statusBreakdown = {
      pending: apps.filter(a => a.status === "pending").length,
      shortlisted: apps.filter(a => a.status === "shortlisted").length,
      rejected: apps.filter(a => a.status === "rejected").length,
    };

    // Top opportunities by application count
    const oppAppCounts: Record<string, { title: string; count: number }> = {};
    for (const opp of opps) {
      const count = apps.filter(a => a.opportunity_id === opp.id).length;
      oppAppCounts[opp.id] = { title: opp.title, count };
    }
    const topOpportunities = Object.values(oppAppCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setData({
      totalCompanies: companies.length,
      activeCompanies: companies.filter(c => c.is_active).length,
      totalOpportunities: opps.length,
      publishedOpportunities: opps.filter(o => o.is_published).length,
      totalApplications: apps.length,
      statusBreakdown,
      totalRevenue: toNumber(walletRes.data?.total_earned),
      recentPayments: (paymentsRes.data || []).map((payment) => ({
        ...payment,
        amount_ngn: toNumber(payment.amount_ngn),
        ipn_share_ngn: toNumber(payment.ipn_share_ngn),
      })),
      topOpportunities,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <IPNLayout>
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </IPNLayout>
    );
  }

  if (!data) return null;

  const statCards = [
    { icon: Building2, label: "Total Companies", value: data.totalCompanies, sub: `${data.activeCompanies} active`, color: "text-blue-500" },
    { icon: Briefcase, label: "Opportunities", value: data.totalOpportunities, sub: `${data.publishedOpportunities} published`, color: "text-green-500" },
    { icon: Users, label: "Applications", value: data.totalApplications, sub: `${data.statusBreakdown.pending} pending`, color: "text-orange-500" },
    { icon: Wallet, label: "Total Revenue", value: formatCurrencyAmount(data.totalRevenue), sub: "All time", color: "text-primary" },
  ];

  return (
    <IPNLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Track performance across your network</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.label} className="shadow-card rounded-2xl">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                  <span className="text-xs sm:text-sm text-muted-foreground">{card.label}</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Application Status Breakdown */}
          <Card className="shadow-card rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck className="w-5 h-5 text-primary" />
                Application Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Pending", value: data.statusBreakdown.pending, color: "bg-yellow-500" },
                { label: "Shortlisted", value: data.statusBreakdown.shortlisted, color: "bg-green-500" },
                { label: "Rejected", value: data.statusBreakdown.rejected, color: "bg-red-500" },
              ].map((item) => {
                const total = data.totalApplications || 1;
                const pct = Math.round((item.value / total) * 100);
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground">{item.value} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Top Opportunities */}
          <Card className="shadow-card rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-primary" />
                Top Opportunities by Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.topOpportunities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {data.topOpportunities.map((opp, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                      <span className="text-sm font-medium text-foreground truncate flex-1 mr-3">{opp.title}</span>
                      <Badge variant="secondary" className="shrink-0">{opp.count} apps</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Payments */}
        <Card className="shadow-card rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="w-5 h-5 text-primary" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No payments yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 font-medium">Opportunity</th>
                      <th className="text-right py-2 font-medium">Amount</th>
                      <th className="text-right py-2 font-medium">Your Share</th>
                      <th className="text-right py-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPayments.map((p: any) => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-2.5 text-foreground truncate max-w-[200px]">
                          {(p.ipn_opportunities as any)?.title || "—"}
                        </td>
                        <td className="py-2.5 text-right text-foreground">{formatCurrencyAmount(p.amount_ngn)}</td>
                        <td className="py-2.5 text-right font-medium text-green-600">{formatCurrencyAmount(p.ipn_share_ngn)}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{formatLagos(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </IPNLayout>
  );
}
