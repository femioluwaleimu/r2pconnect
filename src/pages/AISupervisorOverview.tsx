import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bot, BookOpen, CheckCircle, AlertCircle, Star, FileText, 
  ArrowRight, Sparkles, GraduationCap, Target, BarChart3,
  Clock, Award, TrendingUp
} from "lucide-react";
import { useAICredits } from "@/hooks/useAICredits";
import EthicsBanner from "@/components/ai-supervisor/EthicsBanner";

interface ResearchWithReviews {
  id: string;
  title: string;
  status: string;
  research_stage: string | null;
  supervision_type: string | null;
  created_at: string;
  total_reviews: number;
  avg_rating: number | null;
  supervisor_ready_count: number;
}

export default function AISupervisorOverview() {
  const [researches, setResearches] = useState<ResearchWithReviews[]>([]);
  const [loading, setLoading] = useState(true);
  const { creditsRemaining, creditsLimit, refresh: refetchCredits } = useAICredits();

  useEffect(() => {
    fetchAISupervisedResearches();
  }, []);

  const fetchAISupervisedResearches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch research papers with AI supervision
      const { data: papers, error } = await supabase
        .from("research_papers")
        .select("id, title, status, research_stage, supervision_type, created_at")
        .eq("author_id", user.id)
        .eq("supervision_type", "ai")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!papers || papers.length === 0) {
        setResearches([]);
        setLoading(false);
        return;
      }

      // Fetch chapter reviews for these papers
      const paperIds = papers.map(p => p.id);
      const { data: reviews } = await supabase
        .from("research_chapter_reviews")
        .select("research_id, rating, examiner_readiness")
        .in("research_id", paperIds);

      // Aggregate review data per research
      const researchWithReviews: ResearchWithReviews[] = papers.map(paper => {
        const paperReviews = reviews?.filter(r => r.research_id === paper.id) || [];
        const avgRating = paperReviews.length > 0
          ? paperReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / paperReviews.length
          : null;
        const supervisorReadyCount = paperReviews.filter(r => r.examiner_readiness === "supervisor_ready").length;

        return {
          ...paper,
          total_reviews: paperReviews.length,
          avg_rating: avgRating,
          supervisor_ready_count: supervisorReadyCount,
        };
      });

      setResearches(researchWithReviews);
    } catch (error) {
      console.error("Error fetching AI supervised researches:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalReviews = researches.reduce((sum, r) => sum + r.total_reviews, 0);
  const totalSupervisorReady = researches.reduce((sum, r) => sum + r.supervisor_ready_count, 0);
  const overallAvgRating = researches.length > 0 && researches.some(r => r.avg_rating !== null)
    ? researches.filter(r => r.avg_rating !== null).reduce((sum, r) => sum + (r.avg_rating || 0), 0) / researches.filter(r => r.avg_rating !== null).length
    : null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "ongoing":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Ongoing</Badge>;
      case "under_review":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Under Review</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bot className="w-7 h-7 text-primary" />
              AI Supervisor Overview
            </h1>
            <p className="text-muted-foreground">Track your AI-supervised research progress</p>
          </div>
          <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm py-1.5 px-3">
            <Sparkles className="w-4 h-4 mr-1" />
            {creditsRemaining || 0} / {creditsLimit || 0} Credits
          </Badge>
          </div>
        </div>

        {/* Ethics Banner */}
        <EthicsBanner variant="default" />

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-border/50 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">AI Research Projects</p>
                  <p className="text-2xl font-bold">{researches.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Chapters Reviewed</p>
                  <p className="text-2xl font-bold">{totalReviews}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Supervisor-Ready</p>
                  <p className="text-2xl font-bold">{totalSupervisorReady}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                  <p className="text-2xl font-bold">
                    {overallAvgRating ? overallAvgRating.toFixed(1) : "-"}/5
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Research List */}
        <Card className="rounded-2xl border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Your AI-Supervised Research
            </CardTitle>
            <CardDescription>
              Click on a research to view chapter reviews and continue your work
            </CardDescription>
          </CardHeader>
          <CardContent>
            {researches.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">No AI-Supervised Research Yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Start a new research project with AI supervision to get personalized chapter reviews.
                </p>
                <Link to="/dashboard/research/new">
                  <Button className="rounded-xl">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start New Research
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {researches.map((research) => (
                  <Link
                    key={research.id}
                    to={`/dashboard/research/${research.id}`}
                    className="block"
                  >
                    <Card className="rounded-xl border-border/50 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground truncate">{research.title}</h3>
                              {getStatusBadge(research.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5" />
                                {research.total_reviews} chapters reviewed
                              </span>
                              {research.avg_rating && (
                                <span className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                  {research.avg_rating.toFixed(1)}/5
                                </span>
                              )}
                              {research.supervisor_ready_count > 0 && (
                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  {research.supervisor_ready_count} ready
                                </span>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground" />
                        </div>

                        {research.total_reviews > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>Review Progress</span>
                              <span>{research.supervisor_ready_count}/{research.total_reviews} supervisor-ready</span>
                            </div>
                            <Progress 
                              value={(research.supervisor_ready_count / Math.max(research.total_reviews, 1)) * 100} 
                              className="h-1.5"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card className="rounded-2xl border-border/50 shadow-card bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Tips for AI-Supervised Research</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Scan each chapter after significant revisions to track improvement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Use "Learning Mode" for detailed explanations and academic context</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Address "Required Fixes" before optional improvements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Download review reports to share with your institution supervisor</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
