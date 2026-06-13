import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import ReviewerLayout from "@/components/layout/ReviewerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { formatLagos } from "@/lib/dateUtils";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Calendar,
  ArrowRight,
  Star
} from "lucide-react";

interface PendingPaper {
  id: string;
  title: string;
  author_name: string;
  institution_name: string;
  created_at: string;
  status: string;
}

interface RecentActivity {
  action: string;
  paper_title: string;
  created_at: string;
  decision: string | null;
}

export default function ReviewerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [completedThisMonth, setCompletedThisMonth] = useState(0);
  const [avgReviewDays, setAvgReviewDays] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [pendingPapers, setPendingPapers] = useState<PendingPaper[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch pending papers assigned to this reviewer
      const { data: pending, error: pendingError } = await supabase
        .from('research_papers')
        .select(`
          id,
          title,
          created_at,
          status,
          author_id,
          institution_id
        `)
        .eq('reviewer_id', user.id)
        .eq('status', 'under_review')
        .order('created_at', { ascending: false })
        .limit(3);

      if (pendingError) throw pendingError;

      // Fetch author and institution details for pending papers
      const enrichedPending: PendingPaper[] = [];
      for (const paper of pending || []) {
        const { data: authorProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', paper.author_id)
          .maybeSingle();

        let institutionName = "Unknown Institution";
        if (paper.institution_id) {
          const { data: inst } = await supabase
            .from('institutions')
            .select('name')
            .eq('id', paper.institution_id)
            .maybeSingle();
          institutionName = inst?.name || "Unknown Institution";
        }

        enrichedPending.push({
          id: paper.id,
          title: paper.title,
          author_name: authorProfile?.full_name || "Unknown Author",
          institution_name: institutionName,
          created_at: paper.created_at,
          status: paper.status
        });
      }
      setPendingPapers(enrichedPending);

      // Count all pending papers
      const { count: pendingTotal } = await supabase
        .from('research_papers')
        .select('id', { count: 'exact', head: true })
        .eq('reviewer_id', user.id)
        .eq('status', 'under_review');

      setPendingCount(pendingTotal || 0);

      // Fetch completed reviews this month
      const monthStart = startOfMonth(new Date()).toISOString();
      const monthEnd = endOfMonth(new Date()).toISOString();

      const { data: reviewsThisMonth, count: monthlyCount } = await supabase
        .from('paper_reviews')
        .select('id, created_at', { count: 'exact' })
        .eq('reviewer_id', user.id)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      setCompletedThisMonth(monthlyCount || 0);

      // Fetch all reviews for total count and avg time calculation
      const { data: allReviews, count: totalCount } = await supabase
        .from('paper_reviews')
        .select('id, paper_id, created_at', { count: 'exact' })
        .eq('reviewer_id', user.id);

      setTotalReviews(totalCount || 0);

      // Calculate average review time (time between paper submission and review completion)
      if (allReviews && allReviews.length > 0) {
        let totalDays = 0;
        let validCount = 0;

        for (const review of allReviews.slice(0, 10)) { // Sample last 10 reviews
          const { data: paper } = await supabase
            .from('research_papers')
            .select('created_at')
            .eq('id', review.paper_id)
            .maybeSingle();

          if (paper) {
            const days = differenceInDays(new Date(review.created_at), new Date(paper.created_at));
            if (days >= 0) {
              totalDays += days;
              validCount++;
            }
          }
        }

        if (validCount > 0) {
          setAvgReviewDays(Math.round((totalDays / validCount) * 10) / 10);
        }
      }

      // Fetch recent activity (recent reviews by this reviewer)
      const { data: recentReviews } = await supabase
        .from('paper_reviews')
        .select('id, paper_id, created_at, decision')
        .eq('reviewer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      const activityItems: RecentActivity[] = [];
      for (const review of recentReviews || []) {
        const { data: paper } = await supabase
          .from('research_papers')
          .select('title')
          .eq('id', review.paper_id)
          .maybeSingle();

        let action = "Completed";
        if (review.decision === 'approve') action = "Approved";
        else if (review.decision === 'reject') action = "Rejected";
        else if (review.decision === 'revision') action = "Requested Revision";

        activityItems.push({
          action,
          paper_title: paper?.title || "Unknown Paper",
          created_at: review.created_at,
          decision: review.decision
        });
      }
      setRecentActivity(activityItems);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { 
      label: "Pending Reviews", 
      value: loading ? "-" : pendingCount.toString(), 
      icon: Clock, 
      color: "bg-stat-yellow", 
      trend: pendingCount > 0 ? `${pendingCount} awaiting` : "All clear" 
    },
    { 
      label: "Completed This Month", 
      value: loading ? "-" : completedThisMonth.toString(), 
      icon: CheckCircle, 
      color: "bg-stat-green", 
      trend: formatLagos(new Date(), "monthYear")
    },
    { 
      label: "Avg. Review Time", 
      value: loading ? "-" : avgReviewDays ? `${avgReviewDays} days` : "N/A", 
      icon: TrendingUp, 
      color: "bg-stat-blue", 
      trend: "Based on recent reviews" 
    },
    { 
      label: "Total Reviews", 
      value: loading ? "-" : totalReviews.toString(), 
      icon: FileText, 
      color: "bg-stat-purple", 
      trend: "All time" 
    },
  ];

  const getPriorityFromDate = (createdAt: string) => {
    const days = differenceInDays(new Date(), new Date(createdAt));
    if (days >= 7) return "high";
    if (days >= 3) return "medium";
    return "low";
  };

  return (
    <ReviewerLayout>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    {loading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                    )}
                    <p className="text-xs text-stat-green mt-1">{stat.trend}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Reviews */}
          <div className="lg:col-span-2">
            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">Pending Reviews</CardTitle>
                <Link to="/reviewer/pending">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <>
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </>
                ) : pendingPapers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-stat-green" />
                    <p>No pending reviews</p>
                    <p className="text-sm">You're all caught up!</p>
                  </div>
                ) : (
                  pendingPapers.map((paper) => {
                    const priority = getPriorityFromDate(paper.created_at);
                    return (
                      <div key={paper.id} className="p-4 rounded-xl bg-accent/50 hover:bg-accent transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-foreground line-clamp-1">{paper.title}</h4>
                              <Badge 
                                variant={priority === 'high' ? 'destructive' : priority === 'medium' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{paper.author_name} • {paper.institution_name}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Submitted {formatDistanceToNow(new Date(paper.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <Link to={`/reviewer/pending?paper=${paper.id}`}>
                            <Button size="sm">Review</Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-foreground">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No recent activity
                  </div>
                ) : (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        activity.action === 'Approved' ? 'bg-stat-green/10 text-stat-green' :
                        activity.action === 'Rejected' ? 'bg-destructive/10 text-destructive' :
                        activity.action === 'Requested Revision' ? 'bg-stat-yellow/10 text-stat-yellow' :
                        'bg-stat-blue/10 text-stat-blue'
                      }`}>
                        {activity.action === 'Approved' ? <CheckCircle className="w-4 h-4" /> :
                         activity.action === 'Rejected' ? <AlertCircle className="w-4 h-4" /> :
                         activity.action === 'Requested Revision' ? <AlertCircle className="w-4 h-4" /> :
                         <FileText className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{activity.action}</p>
                        <p className="text-xs text-muted-foreground truncate">{activity.paper_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30">
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-stat-green rounded-lg flex items-center justify-center flex-shrink-0">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Review Guidelines</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Evaluate methodology and results</li>
                      <li>• Check for originality and citations</li>
                      <li>• Provide constructive feedback</li>
                      <li>• Complete reviews within deadline</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ReviewerLayout>
  );
}
