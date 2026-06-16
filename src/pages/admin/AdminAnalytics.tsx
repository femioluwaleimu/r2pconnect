import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, FileText, DollarSign, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { formatLagos } from "@/lib/dateUtils";
import { formatCurrencyAmount, toNumber } from "@/lib/numberFormat";

interface MonthlyData {
  month: string;
  count: number;
}

const chartConfig: ChartConfig = {
  count: { label: "Count", color: "hsl(var(--primary))" },
  revenue: { label: "Revenue", color: "hsl(142 76% 36%)" },
};

export default function AdminAnalytics() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersThisMonth, setUsersThisMonth] = useState(0);
  const [usersLastMonth, setUsersLastMonth] = useState(0);
  const [totalResearch, setTotalResearch] = useState(0);
  const [researchThisMonth, setResearchThisMonth] = useState(0);
  const [totalInstitutions, setTotalInstitutions] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [userGrowthData, setUserGrowthData] = useState<MonthlyData[]>([]);
  const [researchData, setResearchData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const now = new Date();
      const thisMonthStart = startOfMonth(now).toISOString();
      const thisMonthEnd = endOfMonth(now).toISOString();
      const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
      const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();

      // Fetch all stats in parallel
      const [
        profilesRes,
        profilesThisMonthRes,
        profilesLastMonthRes,
        researchRes,
        researchThisMonthRes,
        institutionsRes,
        paymentsRes,
        paymentsThisMonthRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", thisMonthStart).lte("created_at", thisMonthEnd),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", lastMonthStart).lte("created_at", lastMonthEnd),
        supabase.from("research_papers").select("id", { count: "exact", head: true }),
        supabase.from("research_papers").select("id", { count: "exact", head: true }).gte("created_at", thisMonthStart).lte("created_at", thisMonthEnd),
        supabase.from("institutions").select("id", { count: "exact", head: true }),
        supabase.from("payment_history").select("amount").eq("status", "success"),
        supabase.from("payment_history").select("amount").eq("status", "success").gte("created_at", thisMonthStart).lte("created_at", thisMonthEnd),
      ]);

      setTotalUsers(profilesRes.count || 0);
      setUsersThisMonth(profilesThisMonthRes.count || 0);
      setUsersLastMonth(profilesLastMonthRes.count || 0);
      setTotalResearch(researchRes.count || 0);
      setResearchThisMonth(researchThisMonthRes.count || 0);
      setTotalInstitutions(institutionsRes.count || 0);

      const totalRev = (paymentsRes.data || []).reduce((sum, p) => sum + toNumber(p.amount), 0);
      const monthRev = (paymentsThisMonthRes.data || []).reduce((sum, p) => sum + toNumber(p.amount), 0);
      setTotalRevenue(totalRev);
      setRevenueThisMonth(monthRev);

      // Fetch monthly growth data (last 6 months)
      const monthlyUserData: MonthlyData[] = [];
      const monthlyResearchData: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const mStart = startOfMonth(subMonths(now, i)).toISOString();
        const mEnd = endOfMonth(subMonths(now, i)).toISOString();
        const label = format(subMonths(now, i), "MMM yy");

        const [uRes, rRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", mStart).lte("created_at", mEnd),
          supabase.from("research_papers").select("id", { count: "exact", head: true }).gte("created_at", mStart).lte("created_at", mEnd),
        ]);
        monthlyUserData.push({ month: label, count: uRes.count || 0 });
        monthlyResearchData.push({ month: label, count: rRes.count || 0 });
      }
      setUserGrowthData(monthlyUserData);
      setResearchData(monthlyResearchData);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const userGrowthPercent = usersLastMonth > 0
    ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100)
    : usersThisMonth > 0 ? 100 : 0;

  const analyticsCards = [
    { icon: Users, label: "Total Users", value: totalUsers.toLocaleString(), subtitle: `+${usersThisMonth} this month`, color: "bg-blue-500/10", textColor: "text-blue-500" },
    { icon: FileText, label: "Research Papers", value: totalResearch.toLocaleString(), subtitle: `+${researchThisMonth} this month`, color: "bg-emerald-500/10", textColor: "text-emerald-500" },
    { icon: Building2, label: "Institutions", value: totalInstitutions.toLocaleString(), subtitle: "registered", color: "bg-amber-500/10", textColor: "text-amber-500" },
    { icon: DollarSign, label: "Total Revenue", value: formatCurrencyAmount(totalRevenue), subtitle: `${formatCurrencyAmount(revenueThisMonth)} this month`, color: "bg-violet-500/10", textColor: "text-violet-500" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Analytics</h1>
          <p className="text-muted-foreground">Real-time platform performance and metrics</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {analyticsCards.map((stat) => (
            <Card key={stat.label} className={`${stat.color} border-none shadow-card rounded-2xl`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-foreground/70">{stat.label}</span>
                  <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{loading ? "..." : stat.value}</p>
                <p className="text-xs text-muted-foreground">{loading ? "" : stat.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                User Registrations (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userGrowthData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis allowDecimals={false} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  {loading ? "Loading..." : "No data available"}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Research Activity (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {researchData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <LineChart data={researchData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis allowDecimals={false} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="count" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  {loading ? "Loading..." : "No data available"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
