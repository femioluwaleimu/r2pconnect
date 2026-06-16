import { useState, useEffect } from "react";
import IPNLayout from "@/components/layout/IPNLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Briefcase, Users, Wallet, Plus, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { formatCurrencyAmount, toNumber } from "@/lib/numberFormat";

export default function IPNDashboard() {
  const [stats, setStats] = useState({ companies: 0, opportunities: 0, applicants: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [companiesRes, oppsRes, appsRes, walletRes] = await Promise.all([
        supabase.from("ipn_companies").select("id", { count: "exact", head: true }).eq("ipn_user_id", user.id),
        supabase.from("ipn_opportunities").select("id", { count: "exact", head: true }).eq("ipn_user_id", user.id),
        supabase.from("ipn_applications").select("id, opportunity_id", { count: "exact", head: true }),
        supabase.from("ipn_wallet").select("balance, total_earned").eq("user_id", user.id).maybeSingle(),
      ]);

      setStats({
        companies: companiesRes.count || 0,
        opportunities: oppsRes.count || 0,
        applicants: appsRes.count || 0,
        revenue: toNumber(walletRes.data?.total_earned),
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: "Companies", value: stats.companies, icon: Building2, color: "from-blue-500 to-indigo-600", href: "/ipn/companies" },
    { label: "Opportunities", value: stats.opportunities, icon: Briefcase, color: "from-emerald-500 to-teal-600", href: "/ipn/opportunities" },
    { label: "Applicants", value: stats.applicants, icon: Users, color: "from-purple-500 to-violet-600", href: "/ipn/applicants" },
    { label: "Total Revenue", value: formatCurrencyAmount(stats.revenue), icon: Wallet, color: "from-amber-500 to-orange-600", href: "/ipn/revenue" },
  ];

  return (
    <IPNLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">IPN Dashboard</h1>
            <p className="text-muted-foreground">Manage your companies and opportunities</p>
          </div>
          <div className="flex gap-2">
            <Link to="/ipn/companies">
              <Button className="rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Add Company
              </Button>
            </Link>
            <Link to="/ipn/opportunities">
              <Button variant="outline" className="rounded-xl gap-2">
                <Briefcase className="w-4 h-4" /> Post Opportunity
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Link key={stat.label} to={stat.href}>
              <Card className="shadow-card rounded-2xl border-border/50 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{loading ? "..." : stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link to="/ipn/companies">
                <Button variant="outline" className="w-full rounded-xl h-20 flex flex-col gap-1">
                  <Building2 className="w-5 h-5" />
                  <span className="text-sm">Manage Companies</span>
                </Button>
              </Link>
              <Link to="/ipn/opportunities">
                <Button variant="outline" className="w-full rounded-xl h-20 flex flex-col gap-1">
                  <Briefcase className="w-5 h-5" />
                  <span className="text-sm">Post Opportunity</span>
                </Button>
              </Link>
              <Link to="/ipn/revenue">
                <Button variant="outline" className="w-full rounded-xl h-20 flex flex-col gap-1">
                  <Wallet className="w-5 h-5" />
                  <span className="text-sm">View Revenue</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </IPNLayout>
  );
}
