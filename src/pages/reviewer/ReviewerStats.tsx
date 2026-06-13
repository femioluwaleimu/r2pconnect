import { useState, useEffect } from "react";
import ReviewerLayout from "@/components/layout/ReviewerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  FileText,
  Award,
  Calendar,
  Target
} from "lucide-react";

interface ReviewStats {
  totalReviews: number;
  pendingReviews: number;
  approvedCount: number;
  rejectedCount: number;
  averageRating: number;
  monthlyReviews: { month: string; reviews: number }[];
}

export default function ReviewerStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    pendingReviews: 0,
    approvedCount: 0,
    rejectedCount: 0,
    averageRating: 0,
    monthlyReviews: [],
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all reviews by this reviewer
      const { data: reviews, error } = await supabase
        .from("paper_reviews")
        .select("*")
        .eq("reviewer_id", user.id);

      if (error) throw error;

      // Fetch all papers assigned to this reviewer
      const { data: assignedPapers } = await supabase
        .from("research_papers")
        .select("id, status, created_at")
        .eq("reviewer_id", user.id);

      const totalReviews = reviews?.length || 0;
      const pendingReviews = assignedPapers?.filter(p => p.status === "under_review").length || 0;
      const approvedCount = reviews?.filter(r => r.decision === "approved" || r.decision === "accept").length || 0;
      const rejectedCount = reviews?.filter(r => r.decision === "rejected" || r.decision === "reject").length || 0;
      
      // Calculate average rating
      const ratings = reviews?.map(r => r.overall_rating).filter(r => r !== null) || [];
      const averageRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + (b || 0), 0) / ratings.length 
        : 0;

      // Calculate monthly reviews for last 6 months
      const monthlyData: { [key: string]: number } = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toLocaleString('default', { month: 'short' });
        monthlyData[monthKey] = 0;
      }

      reviews?.forEach(review => {
        const reviewDate = new Date(review.created_at || "");
        const monthKey = reviewDate.toLocaleString('default', { month: 'short' });
        if (monthlyData[monthKey] !== undefined) {
          monthlyData[monthKey]++;
        }
      });

      const monthlyReviews = Object.entries(monthlyData).map(([month, reviews]) => ({
        month,
        reviews,
      }));

      setStats({
        totalReviews,
        pendingReviews,
        approvedCount,
        rejectedCount,
        averageRating: Math.round(averageRating * 10) / 10,
        monthlyReviews,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const maxReviews = Math.max(...stats.monthlyReviews.map(s => s.reviews), 1);

  const statCards = [
    { label: "Total Reviews", value: stats.totalReviews.toString(), icon: FileText, color: "bg-stat-blue" },
    { label: "Pending", value: stats.pendingReviews.toString(), icon: Clock, color: "bg-stat-yellow" },
    { label: "Approved", value: stats.approvedCount.toString(), icon: CheckCircle, color: "bg-stat-green" },
    { label: "Avg Rating", value: `${stats.averageRating}/5`, icon: Award, color: "bg-stat-purple" },
  ];

  const approvalRate = stats.totalReviews > 0 
    ? Math.round((stats.approvedCount / stats.totalReviews) * 100) 
    : 0;

  const performanceMetrics = [
    { label: "Approval Rate", value: approvalRate, target: 70 },
    { label: "Reviews Completed", value: Math.min(stats.totalReviews * 5, 100), target: 80 },
    { label: "Response Time", value: 85, target: 90 },
    { label: "Quality Score", value: Math.round(stats.averageRating * 20), target: 80 },
  ];

  if (loading) {
    return (
      <ReviewerLayout>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </ReviewerLayout>
    );
  }

  return (
    <ReviewerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Review Statistics</h2>
          <p className="text-muted-foreground">Track your performance and achievements</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index} className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Chart */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BarChart3 className="w-5 h-5" />
                Monthly Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2 h-48">
                {stats.monthlyReviews.map((stat, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full bg-stat-blue rounded-t-lg transition-all hover:opacity-80"
                      style={{ height: `${(stat.reviews / maxReviews) * 100}%`, minHeight: stat.reviews > 0 ? '8px' : '2px' }}
                    />
                    <span className="text-xs text-muted-foreground">{stat.month}</span>
                    <span className="text-sm font-medium text-foreground">{stat.reviews}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Target className="w-5 h-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {performanceMetrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground">{metric.label}</span>
                    <span className={`text-sm font-medium ${metric.value >= metric.target ? 'text-stat-green' : 'text-stat-yellow'}`}>
                      {metric.value}% / {metric.target}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${metric.value >= metric.target ? 'bg-stat-green' : 'bg-stat-yellow'}`}
                      style={{ width: `${Math.min(metric.value, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Summary Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-stat-blue rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Performance Summary</h4>
                <p className="text-sm text-muted-foreground">
                  You have completed {stats.totalReviews} reviews with an approval rate of {approvalRate}%. 
                  {stats.pendingReviews > 0 
                    ? ` You have ${stats.pendingReviews} pending reviews to complete.`
                    : " Great job staying on top of your assignments!"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ReviewerLayout>
  );
}
