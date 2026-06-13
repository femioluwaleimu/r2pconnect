import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import InstitutionLayout from "@/components/layout/InstitutionLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  FileText, 
  Eye,
  Download,
  BarChart3
} from "lucide-react";

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

interface MonthlyData {
  month: string;
  papers: number;
  views: number;
}

export default function InstitutionAnalytics() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    totalResearchers: 0,
    totalPapers: 0,
    totalViews: 0,
    totalDownloads: 0
  });
  const [statusData, setStatusData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchAnalytics(user.id);
    });
  }, [navigate]);

  const fetchAnalytics = async (userId: string) => {
    const { data: institution } = await supabase
      .from('institutions')
      .select('id')
      .eq('admin_user_id', userId)
      .maybeSingle();

    if (!institution) return;

    const { count: researcherCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institution.id);

    const { data: papers } = await supabase
      .from('research_papers')
      .select('status, views_count, downloads_count, created_at')
      .eq('institution_id', institution.id);

    const totalViews = papers?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;
    const totalDownloads = papers?.reduce((sum, p) => sum + (p.downloads_count || 0), 0) || 0;

    setStats({
      totalResearchers: researcherCount || 0,
      totalPapers: papers?.length || 0,
      totalViews,
      totalDownloads
    });

    // Calculate status distribution from actual data
    const statusCounts: Record<string, number> = {};
    papers?.forEach(p => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });

    setStatusData(Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace('_', ' ').charAt(0).toUpperCase() + name.replace('_', ' ').slice(1),
      value
    })));

    // Calculate monthly data from actual papers
    const monthlyPaperCounts: Record<string, { papers: number; views: number }> = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      monthlyPaperCounts[monthKey] = { papers: 0, views: 0 };
    }

    // Fill in actual data
    papers?.forEach(paper => {
      const paperDate = new Date(paper.created_at);
      const monthKey = paperDate.toLocaleString('default', { month: 'short' });
      
      // Only count if within the last 6 months
      const monthsDiff = (now.getFullYear() - paperDate.getFullYear()) * 12 + (now.getMonth() - paperDate.getMonth());
      if (monthsDiff >= 0 && monthsDiff < 6) {
        if (monthlyPaperCounts[monthKey]) {
          monthlyPaperCounts[monthKey].papers += 1;
          monthlyPaperCounts[monthKey].views += paper.views_count || 0;
        }
      }
    });

    setMonthlyData(Object.entries(monthlyPaperCounts).map(([month, data]) => ({
      month,
      papers: data.papers,
      views: data.views
    })));
  };

  const statCards = [
    { label: "Total Researchers", value: stats.totalResearchers, icon: Users, gradient: "from-blue-500 to-blue-600" },
    { label: "Total Papers", value: stats.totalPapers, icon: FileText, gradient: "from-purple-500 to-purple-600" },
    { label: "Total Views", value: stats.totalViews, icon: Eye, gradient: "from-emerald-500 to-emerald-600" },
    { label: "Total Downloads", value: stats.totalDownloads, icon: Download, gradient: "from-orange-500 to-orange-600" },
  ];

  return (
    <InstitutionLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Track your institution's research performance</p>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div className="text-white">
                <h4 className="font-bold text-lg mb-1">Analytics Overview</h4>
                <ul className="text-sm text-white/80 space-y-1">
                  <li>• Track researcher output and engagement metrics</li>
                  <li>• Monitor paper submissions and publication rates</li>
                  <li>• Analyze views and downloads over time</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index} className={`rounded-2xl border-none shadow-lg bg-gradient-to-br ${stat.gradient} text-white`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/80">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Paper Status Distribution */}
          <Card className="rounded-2xl border-none shadow-lg">
            <CardHeader>
              <CardTitle>Paper Status Distribution</CardTitle>
              <CardDescription>Breakdown of research papers by status</CardDescription>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Submissions */}
          <Card className="rounded-2xl border-none shadow-lg">
            <CardHeader>
              <CardTitle>Monthly Submissions</CardTitle>
              <CardDescription>Papers submitted per month (last 6 months)</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px'
                      }} 
                    />
                    <Bar dataKey="papers" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Views Trend */}
        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Views Trend
            </CardTitle>
            <CardDescription>Research paper views over time (last 6 months)</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </InstitutionLayout>
  );
}
