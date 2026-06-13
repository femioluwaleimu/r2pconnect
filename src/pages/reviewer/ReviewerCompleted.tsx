import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReviewerLayout from "@/components/layout/ReviewerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { 
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Calendar,
  User,
  FileText,
  Download
} from "lucide-react";

interface CompletedReview {
  id: string;
  paper_id: string;
  title: string;
  author_name: string;
  decision: string | null;
  feedback: string;
  created_at: string;
  paper_created_at: string;
  file_url: string | null;
  overall_rating: number | null;
}

export default function ReviewerCompleted() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<CompletedReview[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCompletedReviews();
  }, []);

  const fetchCompletedReviews = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch completed reviews from paper_reviews table
      const { data: reviewsData, error } = await supabase
        .from('paper_reviews')
        .select(`
          id,
          paper_id,
          decision,
          feedback,
          created_at,
          overall_rating
        `)
        .eq('reviewer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with paper and author details
      const enrichedReviews: CompletedReview[] = [];
      for (const review of reviewsData || []) {
        // Get paper details
        const { data: paper } = await supabase
          .from('research_papers')
          .select('title, author_id, created_at, file_url')
          .eq('id', review.paper_id)
          .maybeSingle();

        if (paper) {
          // Get author profile
          const { data: authorProfile } = await supabase
            .from('public_profiles')
            .select('full_name')
            .eq('user_id', paper.author_id)
            .maybeSingle();

          enrichedReviews.push({
            ...review,
            title: paper.title,
            author_name: authorProfile?.full_name || "Unknown Author",
            paper_created_at: paper.created_at,
            file_url: paper.file_url
          });
        }
      }

      setReviews(enrichedReviews);
    } catch (error) {
      console.error('Error fetching completed reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDecisionBadge = (decision: string | null) => {
    switch (decision) {
      case 'approve':
      case 'approved':
        return <Badge className="bg-stat-green text-white"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'revision':
      case 'revision_requested':
        return <Badge className="bg-stat-yellow text-white"><AlertTriangle className="w-3 h-3 mr-1" />Revision Requested</Badge>;
      case 'reject':
      case 'rejected':
        return <Badge className="bg-destructive text-destructive-foreground"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">Reviewed</Badge>;
    }
  };

  const getReviewTime = (paperCreatedAt: string, reviewCreatedAt: string) => {
    const days = differenceInDays(new Date(reviewCreatedAt), new Date(paperCreatedAt));
    if (days === 0) return "Same day";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  const filteredReviews = reviews.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.author_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { label: "Total Completed", value: reviews.length },
    { label: "Approved", value: reviews.filter(r => r.decision === 'approve' || r.decision === 'approved').length },
    { label: "Revisions", value: reviews.filter(r => r.decision === 'revision' || r.decision === 'revision_requested').length },
    { label: "Rejected", value: reviews.filter(r => r.decision === 'reject' || r.decision === 'rejected').length },
  ];

  return (
    <ReviewerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Completed Reviews</h2>
            <p className="text-muted-foreground">Your review history and decisions</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search reviews..." 
              className="pl-9 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Quick Stats */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={index} className="border-none shadow-lg">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Completed Reviews List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-3" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                    <Skeleton className="h-9 w-28" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <Card className="p-12 text-center rounded-xl">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No completed reviews</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "No reviews match your search" : "Your completed reviews will appear here"}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card key={review.id} className="border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-foreground">{review.title}</h3>
                            {getDecisionBadge(review.decision)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {review.author_name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 mt-3 flex-wrap">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          Reviewed: {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Review time: {getReviewTime(review.paper_created_at, review.created_at)}
                        </div>
                        {review.overall_rating && (
                          <div className="text-sm text-muted-foreground">
                            Rating: {review.overall_rating}/5
                          </div>
                        )}
                      </div>

                      {review.feedback && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {review.feedback}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {review.file_url && (
                        <Button variant="outline" size="sm" className="rounded-xl" asChild>
                          <a href={review.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Download</span>
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="rounded-xl">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-stat-green rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Review Statistics</h4>
                <p className="text-sm text-muted-foreground">
                  You've completed {reviews.length} reviews in total with an approval rate of {
                    reviews.length > 0 
                      ? Math.round((reviews.filter(r => r.decision === 'approve' || r.decision === 'approved').length / reviews.length) * 100)
                      : 0
                  }%.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ReviewerLayout>
  );
}
