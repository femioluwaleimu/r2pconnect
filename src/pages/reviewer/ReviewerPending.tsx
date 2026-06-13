import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReviewerLayout from "@/components/layout/ReviewerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import { formatLagos } from "@/lib/dateUtils";
import { 
  Clock, 
  Search,
  Calendar,
  User,
  Building2,
  FileText,
  Download,
  Eye,
  CheckCircle
} from "lucide-react";

interface PendingPaper {
  id: string;
  title: string;
  author_id: string;
  author_name: string;
  institution_id: string | null;
  institution_name: string;
  created_at: string;
  abstract: string | null;
  file_url: string | null;
  file_name: string | null;
  research_field: string | null;
}

export default function ReviewerPending() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [papers, setPapers] = useState<PendingPaper[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPendingPapers();
  }, []);

  const fetchPendingPapers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch papers assigned to this reviewer that are under review
      const { data: papers, error } = await supabase
        .from('research_papers')
        .select(`
          id,
          title,
          author_id,
          institution_id,
          created_at,
          abstract,
          file_url,
          file_name,
          research_field
        `)
        .eq('reviewer_id', user.id)
        .eq('status', 'under_review')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Enrich with author and institution names
      const enrichedPapers: PendingPaper[] = [];
      for (const paper of papers || []) {
        // Get author profile
        const { data: authorProfile } = await supabase
          .from('public_profiles')
          .select('full_name')
          .eq('user_id', paper.author_id)
          .maybeSingle();

        // Get institution name
        let institutionName = "Unknown Institution";
        if (paper.institution_id) {
          const { data: inst } = await supabase
            .from('institutions')
            .select('name')
            .eq('id', paper.institution_id)
            .maybeSingle();
          institutionName = inst?.name || "Unknown Institution";
        }

        enrichedPapers.push({
          ...paper,
          author_name: authorProfile?.full_name || "Unknown Author",
          institution_name: institutionName
        });
      }

      setPapers(enrichedPapers);
    } catch (error) {
      console.error('Error fetching pending papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityFromDays = (createdAt: string) => {
    const days = differenceInDays(new Date(), new Date(createdAt));
    if (days >= 7) return 'high';
    if (days >= 3) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-stat-yellow text-white';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getDaysWaiting = (createdAt: string) => {
    return differenceInDays(new Date(), new Date(createdAt));
  };

  const filteredPapers = papers.filter(paper =>
    paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    paper.author_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    paper.institution_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartReview = (paperId: string) => {
    // Navigate to paper detail or open review dialog
    navigate(`/reviewer/assignments?paper=${paperId}`);
  };

  return (
    <ReviewerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Pending Reviews</h2>
            <p className="text-muted-foreground">Papers awaiting your review</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search papers..." 
              className="pl-9 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Pending Papers List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex-1">
                      <Skeleton className="h-6 w-3/4 mb-3" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-16 w-full mb-3" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPapers.length === 0 ? (
          <Card className="p-12 text-center rounded-xl">
            <CheckCircle className="w-16 h-16 mx-auto text-stat-green mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">All caught up!</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "No papers match your search" : "No papers pending your review"}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPapers.map((paper) => {
              const priority = getPriorityFromDays(paper.created_at);
              const daysWaiting = getDaysWaiting(paper.created_at);
              
              return (
                <Card key={paper.id} className="border-none shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-semibold text-lg text-foreground">{paper.title}</h3>
                              <Badge className={getPriorityColor(priority)}>
                                {priority} priority
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {paper.author_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Building2 className="w-4 h-4" />
                                {paper.institution_name}
                              </span>
                              {paper.research_field && (
                                <span className="flex items-center gap-1">
                                  <FileText className="w-4 h-4" />
                                  {paper.research_field}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {paper.abstract && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {paper.abstract}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            Submitted: {formatLagos(paper.created_at)}
                          </span>
                          <span className={`flex items-center gap-1 ${
                            daysWaiting >= 7 ? 'text-destructive' : 
                            daysWaiting >= 3 ? 'text-stat-yellow' : 
                            'text-muted-foreground'
                          }`}>
                            <Calendar className="w-4 h-4" />
                            {daysWaiting === 0 ? 'Submitted today' : `${daysWaiting} days waiting`}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-row lg:flex-col gap-2">
                        {paper.file_url && (
                          <Button variant="outline" size="sm" className="flex-1 lg:flex-none rounded-xl" asChild>
                            <a href={paper.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          className="flex-1 lg:flex-none rounded-xl"
                          onClick={() => handleStartReview(paper.id)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Start Review
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-stat-green rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Review Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• High priority papers (7+ days waiting) should be reviewed first</li>
                  <li>• Papers waiting 3+ days are highlighted in yellow</li>
                  <li>• Download papers to review offline if needed</li>
                  <li>• Provide constructive feedback to help researchers improve</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ReviewerLayout>
  );
}
