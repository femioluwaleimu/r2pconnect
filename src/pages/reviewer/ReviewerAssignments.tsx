import ReviewerLayout from "@/components/layout/ReviewerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import PaperReviewForm from "@/components/PaperReviewForm";
import { 
  Search,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Eye
} from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  author_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  file_url: string | null;
  abstract: string | null;
  reviewer_comments: string | null;
}

export default function ReviewerAssignments() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaper, setSelectedPaper] = useState<Assignment | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch all papers assigned to this reviewer
      const { data: papers, error } = await supabase
        .from('research_papers')
        .select(`
          id,
          title,
          author_id,
          status,
          created_at,
          updated_at,
          file_url,
          abstract,
          reviewer_comments
        `)
        .eq('reviewer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with author names
      const enrichedAssignments: Assignment[] = [];
      for (const paper of papers || []) {
        const { data: authorProfile } = await supabase
          .from('public_profiles')
          .select('full_name')
          .eq('user_id', paper.author_id)
          .maybeSingle();

        enrichedAssignments.push({
          ...paper,
          author_name: authorProfile?.full_name || "Unknown Author"
        });
      }

      setAssignments(enrichedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'under_review':
        return <Badge variant="secondary" className="bg-stat-yellow/10 text-stat-yellow"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
      case 'published':
        return <Badge variant="secondary" className="bg-stat-green/10 text-stat-green"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'revision_requested':
        return <Badge variant="secondary" className="bg-stat-purple/10 text-stat-purple"><AlertTriangle className="w-3 h-3 mr-1" />Revision Requested</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-destructive/10 text-destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filterByStatus = (status: string) => {
    if (status === 'all') return assignments;
    if (status === 'pending') return assignments.filter(a => a.status === 'under_review');
    if (status === 'in_progress') return assignments.filter(a => a.status === 'under_review');
    if (status === 'completed') return assignments.filter(a => ['approved', 'published', 'rejected', 'revision_requested'].includes(a.status));
    return assignments.filter(a => a.status === status);
  };

  const filteredAssignments = assignments.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.author_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = assignments.filter(a => a.status === 'under_review').length;
  const completedCount = assignments.filter(a => ['approved', 'published', 'rejected', 'revision_requested'].includes(a.status)).length;

  const handleReview = (paper: Assignment) => {
    setSelectedPaper(paper);
    setReviewDialogOpen(true);
  };

  const handleReviewComplete = () => {
    setReviewDialogOpen(false);
    setSelectedPaper(null);
    fetchAssignments();
  };

  return (
    <ReviewerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">All Assignments</h2>
            <p className="text-muted-foreground">View all your review assignments</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search assignments..." 
                className="pl-9 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">All ({assignments.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
          </TabsList>

          {['all', 'pending', 'completed'].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="border-none shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <Skeleton className="h-5 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-1/2 mb-2" />
                            <Skeleton className="h-3 w-1/3" />
                          </div>
                          <Skeleton className="h-9 w-20" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filterByStatus(tab).filter(a => 
                a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.author_name.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 ? (
                <Card className="p-12 text-center rounded-xl">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {tab === 'pending' ? 'No pending reviews' : 
                     tab === 'completed' ? 'No completed reviews' : 
                     'No assignments'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No assignments match your search' : 'Assignments will appear here when you are assigned papers to review'}
                  </p>
                </Card>
              ) : (
                filterByStatus(tab).filter(a => 
                  a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  a.author_name.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((assignment) => (
                  <Card key={assignment.id} className="border-none shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-semibold text-foreground truncate">{assignment.title}</h4>
                            {getStatusBadge(assignment.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{assignment.author_name}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Assigned: {formatDistanceToNow(new Date(assignment.created_at), { addSuffix: true })}</span>
                            {assignment.status !== 'under_review' && (
                              <span className="text-stat-green">
                                Reviewed: {formatDistanceToNow(new Date(assignment.updated_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {assignment.file_url && (
                            <Button variant="outline" size="sm" className="rounded-xl" asChild>
                              <a href={assignment.file_url} target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4 mr-1" />
                                <span className="hidden sm:inline">Download</span>
                              </a>
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant={assignment.status === 'under_review' ? 'default' : 'outline'}
                            className="rounded-xl"
                            onClick={() => handleReview(assignment)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            {assignment.status === 'under_review' ? 'Review' : 'View'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="sr-only">Review Paper</DialogTitle>
            </DialogHeader>
            {selectedPaper && (
              <PaperReviewForm
                paperId={selectedPaper.id}
                paperTitle={selectedPaper.title}
                onComplete={handleReviewComplete}
                onCancel={() => setReviewDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ReviewerLayout>
  );
}
