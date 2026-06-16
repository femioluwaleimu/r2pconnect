import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SupervisorInfoCard from "@/components/dashboard/SupervisorInfoCard";
import FAQHelpModal from "@/components/faq/FAQHelpModal";
import ProfileReminderPopup from "@/components/ProfileReminderPopup";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import { useAICredits } from "@/hooks/useAICredits";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/CurrencyContext";
import { formatLagos } from "@/lib/dateUtils";
import { AI_CREDIT_EXHAUSTED_MESSAGE, friendlyErrorMessage } from "@/lib/errorMessage";
import { formatAmount, toNumber } from "@/lib/numberFormat";
import {
  FileText,
  Eye,
  DollarSign,
  Users,
  Plus,
  Lightbulb,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Trophy,
  Calendar,
  Loader2,
  Clock,
  CheckCircle,
  Briefcase,
} from "lucide-react";

interface ResearchPaper {
  id: string;
  title: string;
  status: string;
  views_count: number;
  created_at: string;
}

interface Challenge {
  id: string;
  title: string;
  reward_amount: number | null;
  reward_currency: string | null;
  deadline: string | null;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  under_review: "bg-amber-500/20 text-amber-600",
  published: "bg-emerald-500/20 text-emerald-600",
  approved: "bg-emerald-500/20 text-emerald-600",
  rejected: "bg-red-500/20 text-red-600",
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [gapQuery, setGapQuery] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [recentResearch, setRecentResearch] = useState<ResearchPaper[]>([]);
  const [trendingChallenges, setTrendingChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState({ papers: 0, views: 0, credits: 0 });
  const { creditsRemaining, aiCredits, refresh: refreshCredits } = useAICredits();
  const { toast } = useToast();
  const { currency, formatCurrency } = useCurrency();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchDashboardData(user.id);
      }
    });
  }, []);

  const fetchDashboardData = async (userId: string) => {
    // Fetch user's research papers
    const { data: papers } = await supabase
      .from("research_papers")
      .select("id, title, status, views_count, created_at")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);

    if (papers) {
      setRecentResearch(papers);
      const totalViews = papers.reduce((sum, p) => sum + (p.views_count || 0), 0);
      setStats((prev) => ({ ...prev, papers: papers.length, views: totalViews }));
    }

    // Fetch student wallet balance (balance is already in Naira - no conversion needed for display)
    const { data: wallet } = await supabase
      .from("student_wallet")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (wallet) {
      // Store the raw balance - it's already in Naira
      setStats((prev) => ({ ...prev, credits: toNumber(wallet.balance) }));
    }

    // Fetch trending challenges (active, not expired, sorted by reward)
    const { data: challenges } = await supabase
      .from("challenges")
      .select("id, title, reward_amount, reward_currency, deadline")
      .eq("is_active", true)
      .gte("deadline", new Date().toISOString()) // Only fetch challenges with future deadlines
      .order("reward_amount", { ascending: false })
      .limit(3);

    if (challenges) {
      setTrendingChallenges(challenges.map((challenge) => ({
        ...challenge,
        reward_amount: challenge.reward_amount == null ? null : toNumber(challenge.reward_amount),
      })));
    }
  };

  const handleQuickAnalysis = async () => {
    if (!gapQuery.trim()) return;

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-research", {
        body: { type: "gap_analysis", content: gapQuery },
      });

      if (error) {
        const errorMsg = error.message || "An error occurred";
        toast({ title: "Error", description: errorMsg, variant: "destructive" });
        return;
      }

      if (data.error) {
        // Handle AI credits exhaustion
        if (data.error === "AI_CREDITS_EXHAUSTED") {
          toast({
            title: "No AI Credits",
            description: AI_CREDIT_EXHAUSTED_MESSAGE,
            variant: "destructive",
          });
          return;
        }
        toast({ title: "AI Error", description: friendlyErrorMessage(data.message || data.error), variant: "destructive" });
        return;
      }

      // Navigate to gap detector with result
      navigate("/dashboard/gap-detector", { state: { result: data.result, query: gapQuery } });
      refreshCredits();
    } catch (error: any) {
      // Handle edge function errors
      const errorMessage = error.message || "An unexpected error occurred";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  const statsCards = [
    {
      label: "My Research",
      value: stats.papers.toString(),
      subtitle: "Active projects",
      icon: FileText,
      iconColor: "text-primary",
      bgColor: "stat-blue",
    },
    {
      label: "Total Views",
      value: stats.views.toString(),
      subtitle: "Research impressions",
      icon: Eye,
      iconColor: "text-accent",
      bgColor: "stat-mint",
    },
    {
      label: "Earned",
      value: formatCurrency(stats.credits, "NGN"),
      subtitle: `Balance`,
      icon: DollarSign,
      iconColor: "text-warning",
      bgColor: "stat-yellow",
    },
    {
      label: "AI Credits",
      value: `${creditsRemaining}/${aiCredits.credits_limit}`,
      subtitle: "Monthly remaining",
      icon: Sparkles,
      iconColor: "text-success",
      bgColor: "stat-green",
    },
  ];

  const quickActions = [
    {
      title: "Start/Upload Research",
      description: "Start or submit research",
      href: "/dashboard/research",
      icon: Plus,
      color: "bg-primary",
    },
    {
      title: "AI Assistant",
      description: "Get help with your research",
      href: "/dashboard/ai-assistant",
      icon: Sparkles,
      color: "bg-pink-500",
    },
    {
      title: "Find Collaborators",
      description: "Connect with researchers",
      href: "/dashboard/collab",
      icon: Users,
      color: "bg-success",
    },
    {
      title: "View Challenges",
      description: "Solve industry problems",
      href: "/dashboard/challenges",
      icon: TrendingUp,
      color: "bg-warning",
    },
    {
      title: "My Job Board",
      description: "Track job applications",
      href: "/dashboard/job-board",
      icon: Briefcase,
      color: "bg-violet-500",
    },
  ];

  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days; // Can be negative for expired
  };

  const getChallengeDeadlineText = (daysRemaining: number | null) => {
    if (daysRemaining === null) return null;
    if (daysRemaining < 0) return "Ended";
    if (daysRemaining === 0) return "Ends today";
    return `${daysRemaining} days left`;
  };

  return (
    <DashboardLayout>
      <ProfileReminderPopup role="researcher" />
      <SubscriptionBanner />
      {/* Welcome Banner */}
      <div className="gradient-card rounded-2xl p-6 lg:p-8 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-primary-foreground mb-2">
              Welcome back, {userName}! 👋
            </h2>
            <p className="text-primary-foreground/80">Continue your groundbreaking research journey</p>
          </div>
          <Link to="/dashboard/research">
            <Button variant="hero" size="lg" className="group">
              <Plus className="w-5 h-5" />
              New/Upload Research
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards with Solid Gradient Backgrounds */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className={`${stat.bgColor} rounded-2xl p-5 lg:p-6 animate-fade-in shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-white/90">{stat.label}</span>
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-white mb-1 truncate">{stat.value}</p>
            <p className="text-xs text-white/70 font-medium">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Quick Gap Analysis */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6 shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-foreground">Quick Gap Analysis</h3>
        </div>
        <div className="flex gap-3">
          <Input
            placeholder="Enter your research topic or idea for AI gap analysis..."
            value={gapQuery}
            onChange={(e) => setGapQuery(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleQuickAnalysis()}
          />
          <Button onClick={handleQuickAnalysis} disabled={!gapQuery.trim() || analyzing}>
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
            {!analyzing && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Uses 1 AI credit • You have {creditsRemaining} credits remaining this month
        </p>
      </div>

      {/* Quick Actions with Bold Icons */}
      <div className="mb-6">
        <h3 className="font-bold text-lg text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.href}
              className="bg-card rounded-2xl border border-border p-5 shadow-tick shadow-tick-hover transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mb-4 shadow-lg`}>
                <action.icon className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <h4 className="font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                {action.title}
              </h4>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Supervisor Info (shown if student has an assigned supervisor) */}
      {user && <SupervisorInfoCard userId={user.id} />}

      {/* Recent Activity - Mobile Optimized Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Research */}
        <Card className="bg-card rounded-2xl border border-border overflow-hidden shadow-soft">
          <div className="p-4 sm:p-6 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-foreground">Recent Research</h3>
              </div>
              <Link to="/dashboard/research" className="text-sm text-primary hover:underline font-medium">
                View All
              </Link>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {recentResearch.length > 0 ? (
              <div className="space-y-3">
                {recentResearch.map((paper) => (
                  <Link
                    key={paper.id}
                    to={`/dashboard/research/${paper.id}`}
                    className="block p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 hover:from-primary/10 hover:to-accent/10 transition-all duration-300 border border-transparent hover:border-primary/20"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground line-clamp-2 mb-2">{paper.title}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`${statusColors[paper.status] || statusColors.draft} text-xs rounded-full`}>
                            {paper.status === "published" && <CheckCircle className="w-3 h-3 mr-1" />}
                            {paper.status === "under_review" && <Clock className="w-3 h-3 mr-1" />}
                            {paper.status.replace("_", " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {paper.views_count}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatLagos(paper.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground mb-4 font-medium">No research uploaded yet</p>
                <Link to="/dashboard/research/upload">
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Your First Research
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>

        {/* Trending Challenges */}
        <Card className="bg-card rounded-2xl border border-border overflow-hidden shadow-soft">
          <div className="p-4 sm:p-6 border-b border-border bg-gradient-to-r from-amber-500/10 to-orange-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-foreground">Trending Challenges</h3>
              </div>
              <Link to="/dashboard/challenges" className="text-sm text-primary hover:underline font-medium">
                View All
              </Link>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {trendingChallenges.length > 0 ? (
              <div className="space-y-3">
                {trendingChallenges.map((challenge) => {
                  const daysRemaining = getDaysRemaining(challenge.deadline);
                  return (
                    <Link
                      key={challenge.id}
                      to={`/dashboard/challenges/${challenge.id}`}
                      className="block p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 hover:from-amber-500/10 hover:to-orange-500/10 transition-all duration-300 border border-transparent hover:border-amber-500/20"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <Trophy className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground line-clamp-2 mb-2">{challenge.title}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-emerald-500/20 text-emerald-600 text-xs rounded-full font-bold">
                              {challenge.reward_currency === "NGN" ? "₦" : "$"}
                              {formatAmount(challenge.reward_amount)}
                            </Badge>
                            {daysRemaining !== null && (
                              <span
                                className={`text-xs flex items-center gap-1 ${daysRemaining < 0 ? "text-muted-foreground" : daysRemaining <= 7 ? "text-red-500" : "text-muted-foreground"}`}
                              >
                                <Calendar className="w-3 h-3" />
                                {getChallengeDeadlineText(daysRemaining)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <TrendingUp className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground mb-4 font-medium">No challenges available</p>
                <Link to="/dashboard/challenges">
                  <Button variant="outline" size="sm" className="rounded-xl">
                    Browse All Challenges
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Help Button */}
      <div className="flex justify-end mt-6">
        <FAQHelpModal category="students" buttonLabel="Need Help?" />
      </div>
    </DashboardLayout>
  );
}
