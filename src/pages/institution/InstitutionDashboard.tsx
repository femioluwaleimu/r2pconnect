import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import InstitutionLayout from "@/components/layout/InstitutionLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  UserPlus,
  ArrowRight,
  Building2,
  DollarSign,
  Eye
} from "lucide-react";

interface Stats {
  totalResearchers: number;
  totalPapers: number;
  pendingReviews: number;
  publishedPapers: number;
  totalViews: number;
  totalCommissions: number;
}

const gradientCards = [
  {
    gradient: "bg-gradient-to-br from-blue-500 to-blue-700",
    iconBg: "bg-white/20",
    textColor: "text-white",
    labelColor: "text-white/80"
  },
  {
    gradient: "bg-gradient-to-br from-purple-500 to-purple-700",
    iconBg: "bg-white/20",
    textColor: "text-white",
    labelColor: "text-white/80"
  },
  {
    gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
    iconBg: "bg-white/20",
    textColor: "text-white",
    labelColor: "text-white/80"
  },
  {
    gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
    iconBg: "bg-white/20",
    textColor: "text-white",
    labelColor: "text-white/80"
  },
  {
    gradient: "bg-gradient-to-br from-pink-500 to-rose-600",
    iconBg: "bg-white/20",
    textColor: "text-white",
    labelColor: "text-white/80"
  },
];

export default function InstitutionDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalResearchers: 0,
    totalPapers: 0,
    pendingReviews: 0,
    publishedPapers: 0,
    totalViews: 0,
    totalCommissions: 0
  });
  const [recentPapers, setRecentPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchDashboardData(user.id);
    });
  }, [navigate, searchParams]);

  const getInstitutionForAccess = async (userId: string) => {
    const requestedInstitutionId = searchParams.get("institution_id");
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (role?.role === "admin" && requestedInstitutionId) {
      const { data: institution } = await supabase
        .from("institutions")
        .select("id, total_commission")
        .eq("id", requestedInstitutionId)
        .maybeSingle();
      return institution;
    }

    const { data: institution } = await supabase
      .from('institutions')
      .select('id, total_commission')
      .eq('admin_user_id', userId)
      .maybeSingle();
    return institution;
  };

  const fetchDashboardData = async (userId: string) => {
    setLoading(true);
    const institution = await getInstitutionForAccess(userId);

    if (!institution) {
      setRecentPapers([]);
      setLoading(false);
      return;
    }

    await Promise.all([
      fetchStats(institution),
      fetchRecentPapers(institution.id),
    ]);
  };

  const fetchStats = async (institution: { id: string; total_commission: number | null }) => {
    const { count: researcherCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institution.id);

    const { data: papers } = await supabase
      .from('research_papers')
      .select('status, views_count')
      .eq('institution_id', institution.id);

    const totalPapers = papers?.length || 0;
    const pendingReviews = papers?.filter(p => p.status === 'under_review').length || 0;
    const publishedPapers = papers?.filter(p => p.status === 'published').length || 0;
    const totalViews = papers?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;

    setStats({
      totalResearchers: researcherCount || 0,
      totalPapers,
      pendingReviews,
      publishedPapers,
      totalViews,
      totalCommissions: institution.total_commission || 0
    });
    setLoading(false);
  };

  const fetchRecentPapers = async (institutionId: string) => {
    // Fetch papers pending review: status = 'under_review' AND research_stage = 'completed'
    const { data: papers } = await supabase
      .from('research_papers')
      .select('id, title, status, research_stage, created_at, author_id')
      .eq('institution_id', institutionId)
      .eq('status', 'under_review')
      .eq('research_stage', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!papers || papers.length === 0) {
      setRecentPapers([]);
      return;
    }

    // Fetch author profiles separately
    const authorIds = [...new Set(papers.map(p => p.author_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', authorIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    const papersWithAuthors = papers.map(paper => ({
      ...paper,
      profiles: { full_name: profileMap.get(paper.author_id) || 'Unknown' }
    }));

    setRecentPapers(papersWithAuthors);
  };

  const statsCards = [
    {
      label: "Total Researchers",
      value: stats.totalResearchers,
      icon: Users,
      ...gradientCards[0],
    },
    {
      label: "Total Papers",
      value: stats.totalPapers,
      icon: FileText,
      ...gradientCards[1],
    },
    {
      label: "Pending Reviews",
      value: stats.pendingReviews,
      icon: Clock,
      ...gradientCards[2],
    },
    {
      label: "Published",
      value: stats.publishedPapers,
      icon: CheckCircle,
      ...gradientCards[3],
    },
    {
      label: "Total Views",
      value: stats.totalViews,
      icon: Eye,
      ...gradientCards[4],
    },
  ];

  return (
    <InstitutionLayout>
      {/* Welcome Banner */}
      <div className="gradient-hero rounded-2xl p-6 lg:p-8 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              Institution Overview
            </h2>
            <p className="text-white/80">
              Manage your researchers and review research submissions
            </p>
          </div>
          <Link to="/institution/reviewers">
            <Button variant="hero" size="lg" className="group rounded-xl">
              <UserPlus className="w-5 h-5" />
              Add Reviewer
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards with Gradient Backgrounds */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {statsCards.map((stat, index) => (
          <Card
            key={index}
            className={`${stat.gradient} border-none shadow-lg rounded-2xl overflow-hidden animate-fade-in`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.textColor}`} strokeWidth={2.5} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
              <p className={`text-sm font-medium ${stat.labelColor} mt-1`}>{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mb-6">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="font-bold text-white mb-2 text-lg">Institution Management</h4>
              <ul className="text-white/90 space-y-1 text-sm">
                <li>• Review and approve research submissions from your researchers</li>
                <li>• Add reviewers to help with the review process</li>
                <li>• Track analytics and performance metrics</li>
                <li>• Share your institution code for researcher registration</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions & Recent Papers */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="rounded-2xl shadow-lg border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks for managing your institution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/institution/reviews" className="block">
              <Button variant="outline" className="w-full justify-between rounded-xl h-12 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800 hover:from-amber-500/20 hover:to-orange-500/20">
                <span className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium">Review Pending Papers</span>
                </span>
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  {stats.pendingReviews}
                </span>
              </Button>
            </Link>
            <Link to="/institution/researchers" className="block">
              <Button variant="outline" className="w-full justify-start rounded-xl h-12 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800 hover:from-blue-500/20 hover:to-cyan-500/20">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mr-3">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium">Manage Researchers</span>
              </Button>
            </Link>
            <Link to="/institution/reviewers" className="block">
              <Button variant="outline" className="w-full justify-start rounded-xl h-12 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800 hover:from-purple-500/20 hover:to-pink-500/20">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mr-3">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium">Manage Reviewers</span>
              </Button>
            </Link>
            <Link to="/institution/analytics" className="block">
              <Button variant="outline" className="w-full justify-start rounded-xl h-12 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-200 dark:border-emerald-800 hover:from-emerald-500/20 hover:to-teal-500/20">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mr-3">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium">View Analytics</span>
              </Button>
            </Link>
            <Link to="/institution/commissions" className="block">
              <Button variant="outline" className="w-full justify-start rounded-xl h-12 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800 hover:from-green-500/20 hover:to-emerald-500/20">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mr-3">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium">View Commissions</span>
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Papers */}
        <Card className="rounded-2xl shadow-lg border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Submissions</CardTitle>
              <CardDescription>Latest research papers from your researchers</CardDescription>
            </div>
            <Link to="/institution/papers">
              <Button variant="ghost" size="sm" className="rounded-xl">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentPapers.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-purple-500" />
                </div>
                <p className="text-muted-foreground">No papers submitted yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPapers.map((paper) => (
                  <div key={paper.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted/70 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{paper.title}</p>
                      <p className="text-sm text-muted-foreground">
                        by {paper.profiles?.full_name || 'Unknown'}
                      </p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                      paper.status === 'published' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' :
                      paper.status === 'under_review' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' :
                      paper.status === 'approved' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {paper.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </InstitutionLayout>
  );
}
