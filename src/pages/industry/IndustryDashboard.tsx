import { useState, useEffect } from "react";
import IndustryLayout from "@/components/layout/IndustryLayout";
import ProfileReminderPopup from "@/components/ProfileReminderPopup";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, FileText, Users, TrendingUp, Plus, ArrowRight, Briefcase, Loader2, Zap, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatLagos } from "@/lib/dateUtils";

interface DashboardStats {
  activeChallenges: number;
  totalSubmissions: number;
  interestedResearchers: number;
  successRate: number;
  aiMatcherUsed: number;
  aiMatcherRemaining: number;
  aiMatcherLimit: number;
  totalUploads: number;
}

export default function IndustryDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeChallenges: 0,
    totalSubmissions: 0,
    interestedResearchers: 0,
    successRate: 0,
    aiMatcherUsed: 0,
    aiMatcherRemaining: 0,
    aiMatcherLimit: 0,
    totalUploads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [showJobPopup, setShowJobPopup] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        challengesResult,
        submissionsResult,
        hiredResult,
        subscriptionResult
      ] = await Promise.all([
        supabase
          .from("challenges")
          .select("id", { count: "exact" })
          .eq("industry_id", user.id)
          .eq("is_active", true),
        supabase
          .from("challenges")
          .select("id")
          .eq("industry_id", user.id),
        supabase
          .from("hired_students")
          .select("id", { count: "exact" })
          .eq("industry_id", user.id),
        supabase
          .from("subscriptions")
          .select("ai_matchers_remaining, ai_matches_per_challenge")
          .eq("user_id", user.id)
          .maybeSingle()
      ]);

      const activeChallenges = challengesResult.count || 0;
      const totalUploads = activeChallenges; // Challenges count as uploads
      
      let totalSubmissions = 0;
      let interestedResearchers = 0;
      
      if (submissionsResult.data && submissionsResult.data.length > 0) {
        const challengeIds = submissionsResult.data.map(c => c.id);
        
        const [subsResult, matchResult] = await Promise.all([
          supabase
            .from("challenge_submissions")
            .select("id", { count: "exact" })
            .in("challenge_id", challengeIds),
          supabase
            .from("challenge_matches")
            .select("id", { count: "exact" })
            .in("challenge_id", challengeIds)
        ]);
        
        totalSubmissions = subsResult.count || 0;
        interestedResearchers = matchResult.count || 0;
      }

      const hiredCount = hiredResult.count || 0;
      const successRate = totalSubmissions > 0 
        ? Math.round((hiredCount / totalSubmissions) * 100) 
        : 0;

      const aiMatcherLimit = subscriptionResult.data?.ai_matches_per_challenge || 3;
      const aiMatcherRemaining = subscriptionResult.data?.ai_matchers_remaining ?? aiMatcherLimit;
      const aiMatcherUsed = aiMatcherLimit - aiMatcherRemaining;

      setStats({
        activeChallenges,
        totalSubmissions,
        interestedResearchers,
        successRate,
        aiMatcherUsed: Math.max(0, aiMatcherUsed),
        aiMatcherRemaining: Math.max(0, aiMatcherRemaining),
        aiMatcherLimit,
        totalUploads,
      });

      if (submissionsResult.data && submissionsResult.data.length > 0) {
        const challengeIds = submissionsResult.data.map(c => c.id);
        const { data: recentSubs } = await supabase
          .from("challenge_submissions")
          .select("id, status, created_at, challenge_id, challenges(title)")
          .in("challenge_id", challengeIds)
          .order("created_at", { ascending: false })
          .limit(5);
        
        setRecentActivity(recentSubs || []);
      }

      // Check if industry has any active jobs - show popup if not
      const { count: activeJobCount } = await supabase
        .from("job_postings")
        .select("id", { count: "exact", head: true })
        .eq("industry_id", user.id)
        .eq("is_active", true);

      const popupDismissed = localStorage.getItem(`job_popup_dismissed_${user.id}`);
      const lastDismissed = popupDismissed ? new Date(popupDismissed) : null;
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      if ((activeJobCount === 0 || activeJobCount === null) && (!lastDismissed || lastDismissed < oneDayAgo)) {
        setShowJobPopup(true);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { 
      icon: Trophy, 
      label: "Active Challenges", 
      value: stats.activeChallenges.toString(), 
      gradient: "from-blue-500 to-indigo-600" 
    },
    { 
      icon: FileText, 
      label: "Submissions", 
      value: stats.totalSubmissions.toString(), 
      gradient: "from-emerald-500 to-teal-600" 
    },
    { 
      icon: Users, 
      label: "AI Matches", 
      value: stats.interestedResearchers.toString(), 
      gradient: "from-amber-500 to-orange-600" 
    },
    { 
      icon: TrendingUp, 
      label: "Success Rate", 
      value: `${stats.successRate}%`, 
      gradient: "from-purple-500 to-violet-600" 
    },
  ];

  return (
    <IndustryLayout>
      <ProfileReminderPopup role="industry" />
      <SubscriptionBanner />
      <div className="space-y-4">
        {/* Welcome Banner */}
        <div className="gradient-hero rounded-xl p-4 sm:p-6 text-primary-foreground">
          <h1 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">Welcome to Industry Portal 👋</h1>
          <p className="text-primary-foreground/80 text-sm mb-3 sm:mb-4">
            Connect with researchers and solve real-world problems.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/industry/challenges">
              <Button className="bg-background text-primary hover:bg-background/90 rounded-lg text-xs sm:text-sm h-8 sm:h-10">
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                Post a Challenge
              </Button>
            </Link>
            <Link to="/industry/job-postings">
              <Button className="bg-background/20 text-primary-foreground border border-primary-foreground/30 hover:bg-background/30 rounded-lg text-xs sm:text-sm h-8 sm:h-10">
                <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                Post a Job
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 border-none animate-pulse">
                <CardContent className="p-3 sm:p-4 h-16 sm:h-20" />
              </Card>
            ))
          ) : (
            statsCards.map((stat) => (
              <Card key={stat.label} className={`bg-gradient-to-br ${stat.gradient} text-white border-none shadow-lg`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-1 sm:mb-2">
                    <span className="text-[10px] sm:text-sm font-medium text-white/80">{stat.label}</span>
                    <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white/80" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-white">{stat.value}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* AI Matcher & Uploads Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <Card className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-none shadow-lg">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-white/80">AI Matcher</p>
                  <p className="text-lg sm:text-2xl font-bold">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `${stats.aiMatcherUsed}/${stats.aiMatcherLimit}`}
                  </p>
                </div>
              </div>
              <div className="text-[10px] sm:text-xs text-white/70">
                {stats.aiMatcherRemaining} remaining
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-none shadow-lg">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-white/80">Total Uploads</p>
                  <p className="text-lg sm:text-2xl font-bold">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : stats.totalUploads}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-md bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">How It Works</h4>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  <li>• Post challenges with rewards</li>
                  <li>• Researchers submit proposals</li>
                  <li>• Review and select best solutions</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Recent Activity */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Quick Actions */}
          <Card className="shadow-card rounded-xl border-border/50">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              <Link to="/industry/challenges" className="block">
                <Button variant="outline" className="w-full justify-between rounded-lg hover:bg-accent/50 h-10 text-xs">
                  <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    Create Challenge
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
              <Link to="/industry/submissions" className="block">
                <Button variant="outline" className="w-full justify-between rounded-lg hover:bg-accent/50 h-10 text-xs">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    View Submissions
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
              <Link to="/industry/researchers" className="block">
                <Button variant="outline" className="w-full justify-between rounded-lg hover:bg-accent/50 h-10 text-xs">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Browse Researchers
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-card rounded-xl border-border/50">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">No recent activity</p>
                  <p className="text-[10px] text-muted-foreground">Post your first challenge</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-2.5 p-2.5 bg-muted/50 rounded-lg">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {(activity.challenges as any)?.title || "Challenge"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatLagos(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* No Jobs Popup */}
      <Dialog open={showJobPopup} onOpenChange={(open) => {
        setShowJobPopup(open);
        if (!open) {
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) localStorage.setItem(`job_popup_dismissed_${user.id}`, new Date().toISOString());
          });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">🎓 Hire Top Students Today!</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Thousands of students are actively looking for opportunities. Do you need students for any of these?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "SIWES Training", icon: "🏭" },
                { label: "Internship", icon: "💼" },
                { label: "Part-time Job", icon: "⏰" },
                { label: "Industrial Training", icon: "🔧" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Post a job to connect with talented students from various institutions across the country.
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 text-xs h-9 rounded-lg" onClick={() => {
                setShowJobPopup(false);
                supabase.auth.getUser().then(({ data: { user } }) => {
                  if (user) localStorage.setItem(`job_popup_dismissed_${user.id}`, new Date().toISOString());
                });
              }}>
                Maybe Later
              </Button>
              <Link to="/industry/job-postings" className="flex-1">
                <Button className="w-full text-xs h-9 rounded-lg gradient-hero" onClick={() => setShowJobPopup(false)}>
                  <Briefcase className="w-3.5 h-3.5 mr-1" />
                  Post a Job
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </IndustryLayout>
  );
}