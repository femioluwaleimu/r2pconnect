import { useState, useEffect } from "react";
import IndustryLayout from "@/components/layout/IndustryLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Users, Trophy, Info, FileText, Loader2, Sparkles } from "lucide-react";
import { formatRating } from "@/lib/numberFormat";

interface AnalyticsData {
  totalChallenges: number;
  activeChallenges: number;
  totalSubmissions: number;
  uniqueResearchers: number;
  aiMatches: number;
  successRate: number;
}

export default function IndustryAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalChallenges: 0,
    activeChallenges: 0,
    totalSubmissions: 0,
    uniqueResearchers: 0,
    aiMatches: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get challenges
      const { data: challenges } = await supabase
        .from("challenges")
        .select("id, is_active")
        .eq("industry_id", user.id);

      const totalChallenges = challenges?.length || 0;
      const activeChallenges = challenges?.filter(c => c.is_active).length || 0;

      if (!challenges || challenges.length === 0) {
        setAnalytics({
          totalChallenges: 0,
          activeChallenges: 0,
          totalSubmissions: 0,
          uniqueResearchers: 0,
          aiMatches: 0,
          successRate: 0,
        });
        setLoading(false);
        return;
      }

      const challengeIds = challenges.map(c => c.id);

      // Get submissions and matches
      const [submissionsResult, matchesResult] = await Promise.all([
        supabase
          .from("challenge_submissions")
          .select("id, researcher_id, status")
          .in("challenge_id", challengeIds),
        supabase
          .from("challenge_matches")
          .select("id")
          .in("challenge_id", challengeIds)
      ]);

      const submissions = submissionsResult.data || [];
      const uniqueResearchers = new Set(submissions.map(s => s.researcher_id)).size;
      const approvedSubmissions = submissions.filter(s => s.status === "approved").length;
      const successRate = submissions.length > 0 
        ? Math.round((approvedSubmissions / submissions.length) * 100) 
        : 0;

      setAnalytics({
        totalChallenges,
        activeChallenges,
        totalSubmissions: submissions.length,
        uniqueResearchers,
        aiMatches: matchesResult.data?.length || 0,
        successRate,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { 
      icon: Trophy, 
      label: "Total Challenges", 
      value: analytics.totalChallenges.toString(),
      subtext: `${analytics.activeChallenges} active`,
      gradient: "from-blue-500 to-indigo-600" 
    },
    { 
      icon: FileText, 
      label: "Total Submissions", 
      value: analytics.totalSubmissions.toString(),
      subtext: "from researchers",
      gradient: "from-emerald-500 to-teal-600" 
    },
    { 
      icon: Users, 
      label: "Unique Researchers", 
      value: analytics.uniqueResearchers.toString(),
      subtext: "engaged with your challenges",
      gradient: "from-amber-500 to-orange-600" 
    },
    { 
      icon: TrendingUp, 
      label: "Success Rate", 
      value: `${analytics.successRate}%`,
      subtext: "submissions approved",
      gradient: "from-purple-500 to-violet-600" 
    },
  ];

  return (
    <IndustryLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Track your challenge performance and engagement</p>
        </div>

        {/* Stats Cards with Gradients */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 border-none animate-pulse">
                <CardContent className="p-4 h-24" />
              </Card>
            ))
          ) : (
            statsCards.map((stat) => (
              <Card key={stat.label} className={`bg-gradient-to-br ${stat.gradient} text-white border-none shadow-lg`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-white/80">{stat.label}</span>
                    <stat.icon className="w-5 h-5 text-white/80" />
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/70 mt-1">{stat.subtext}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* AI Matches Card */}
        <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/80">AI-Matched Researchers</p>
                  <p className="text-3xl font-bold">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : analytics.aiMatches}
                  </p>
                </div>
              </div>
              <p className="text-white/70 text-sm max-w-xs">
                Researchers matched to your challenges using AI analysis
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Understanding Your Analytics</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Track how many researchers engage with your challenges</li>
                  <li>• Monitor submission quality and completion rates</li>
                  <li>• Identify trends in researcher interest areas</li>
                  <li>• Use insights to improve future challenges</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Placeholder */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Challenge Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : analytics.totalChallenges === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <BarChart3 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No data available yet</p>
                  <p className="text-sm text-muted-foreground">Post challenges to see analytics</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <span className="text-sm text-muted-foreground">Active Challenges</span>
                    <span className="font-semibold">{analytics.activeChallenges}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <span className="text-sm text-muted-foreground">Inactive Challenges</span>
                    <span className="font-semibold">{analytics.totalChallenges - analytics.activeChallenges}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <span className="text-sm text-muted-foreground">Avg Submissions/Challenge</span>
                    <span className="font-semibold">
                      {analytics.totalChallenges > 0 
                        ? formatRating(analytics.totalSubmissions / analytics.totalChallenges) 
                        : 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Researcher Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : analytics.uniqueResearchers === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No engagement data</p>
                  <p className="text-sm text-muted-foreground">Data will appear as researchers engage</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <span className="text-sm text-muted-foreground">Unique Researchers</span>
                    <span className="font-semibold">{analytics.uniqueResearchers}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <span className="text-sm text-muted-foreground">AI Matched</span>
                    <span className="font-semibold">{analytics.aiMatches}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="font-semibold">{analytics.successRate}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </IndustryLayout>
  );
}
