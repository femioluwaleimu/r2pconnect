import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import InstitutionLayout from "@/components/layout/InstitutionLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import ReviewerAssignment from "@/components/ReviewerAssignment";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText,
  Eye,
  MessageSquare,
  Loader2,
  Download,
  Briefcase,
  UserCheck
} from "lucide-react";
import { formatLagos } from "@/lib/dateUtils";

interface Paper {
  id: string;
  title: string;
  abstract: string | null;
  status: string;
  created_at: string;
  file_url: string | null;
  file_name: string | null;
  author_id: string;
  reviewer_id: string | null;
  reviewer_comments: string | null;
  profiles?: { full_name: string; email: string };
  reviewer_name?: string | null;
}

export default function InstitutionReviews() {
  const [user, setUser] = useState<User | null>(null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [paperToAssign, setPaperToAssign] = useState<Paper | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchInstitution(user.id);
    });
  }, [navigate]);

  const fetchInstitution = async (userId: string) => {
    const { data: institution } = await supabase
      .from('institutions')
      .select('id')
      .eq('admin_user_id', userId)
      .maybeSingle();

    if (institution) {
      setInstitutionId(institution.id);
      fetchPapers(institution.id);
    } else {
      setLoading(false);
    }
  };

  const fetchPapers = async (instId: string) => {
    setLoading(true);
    
    // Fetch papers that belong to this institution OR have a supervisor from this institution
    // OR authored by students from this institution
    
    // First get supervisors from this institution
    const { data: supervisorData } = await supabase
      .from('supervisors')
      .select('user_id')
      .eq('institution_id', instId);
    
    const supervisorIds = supervisorData?.map(s => s.user_id) || [];
    
    // Get students (researchers) from this institution
    const { data: studentData } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('institution_id', instId);
    
    const studentIds = studentData?.map(s => s.user_id) || [];
    
    // Get papers where institution_id matches
    const { data: papersByInstitution } = await supabase
      .from('research_papers')
      .select('*')
      .eq('institution_id', instId)
      .in('status', ['under_review', 'revision_requested', 'approved', 'rejected', 'published']);
    
    // Get papers supervised by institution's supervisors
    const { data: papersBySupervisor } = supervisorIds.length > 0 
      ? await supabase
          .from('research_papers')
          .select('*')
          .in('supervisor_id', supervisorIds)
          .in('status', ['under_review', 'revision_requested', 'approved', 'rejected', 'published'])
      : { data: [] };
    
    // Get papers authored by students from this institution
    const { data: papersByStudents } = studentIds.length > 0
      ? await supabase
          .from('research_papers')
          .select('*')
          .in('author_id', studentIds)
          .in('status', ['under_review', 'revision_requested', 'approved', 'rejected', 'published'])
      : { data: [] };
    
    // Merge and deduplicate papers
    const allPapersMap = new Map();
    [...(papersByInstitution || []), ...(papersBySupervisor || []), ...(papersByStudents || [])].forEach(p => {
      allPapersMap.set(p.id, p);
    });
    const allPapers = Array.from(allPapersMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Fetch author and reviewer profiles separately using public_profiles view
    if (allPapers.length > 0) {
      const papersWithProfiles = await Promise.all(
        allPapers.map(async (paper) => {
          const { data: profile } = await supabase
            .from('public_profiles')
            .select('full_name')
            .eq('user_id', paper.author_id)
            .maybeSingle();
          
          // Fetch reviewer name if assigned
          let reviewerName = null;
          if (paper.reviewer_id) {
            const { data: reviewerProfile } = await supabase
              .from('public_profiles')
              .select('full_name')
              .eq('user_id', paper.reviewer_id)
              .maybeSingle();
            reviewerName = reviewerProfile?.full_name || null;
          }
          
          return { 
            ...paper, 
            profiles: profile ? { full_name: profile.full_name, email: '' } : null,
            reviewer_name: reviewerName
          };
        })
      );
      setPapers(papersWithProfiles as Paper[]);
    } else {
      setPapers([]);
    }
    setLoading(false);
  };

  const handleAssignReviewer = (paper: Paper) => {
    setPaperToAssign(paper);
    setAssignDialogOpen(true);
  };

  const handleReview = (paper: Paper) => {
    setSelectedPaper(paper);
    setReviewComments(paper.reviewer_comments || "");
    setReviewDialogOpen(true);
  };

  const submitReview = async (decision: 'approved' | 'revision_requested' | 'rejected') => {
    if (!selectedPaper || !user) return;

    setSubmitting(true);
    try {
      const updateData: any = {
        status: decision,
        reviewer_id: user.id,
        reviewer_comments: reviewComments
      };

      if (decision === 'approved') {
        updateData.published_at = new Date().toISOString();
        updateData.status = 'published';
      }

      const { error } = await supabase
        .from('research_papers')
        .update(updateData)
        .eq('id', selectedPaper.id);

      if (error) throw error;

      toast({ 
        title: "Review submitted", 
        description: `Paper has been ${decision === 'approved' ? 'approved and published' : decision === 'rejected' ? 'rejected' : 'sent for revision'}` 
      });

      setReviewDialogOpen(false);
      if (institutionId) fetchPapers(institutionId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const pendingPapers = papers.filter(p => p.status === 'under_review');
  const reviewedPapers = papers.filter(p => ['approved', 'rejected', 'revision_requested'].includes(p.status));

  const renderPaperCard = (paper: Paper, showAssignButton: boolean = false) => (
    <Card key={paper.id} className="hover:shadow-md transition-shadow rounded-xl">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="font-semibold text-lg text-foreground truncate">{paper.title}</h3>
              <Badge className={`rounded-full ${
                paper.status === 'under_review' ? 'bg-stat-yellow/20 text-stat-yellow' :
                paper.status === 'approved' || paper.status === 'published' ? 'bg-stat-green/20 text-stat-green' :
                paper.status === 'revision_requested' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                'bg-destructive/10 text-destructive'
              }`}>
                {paper.status.replace('_', ' ')}
              </Badge>
              {paper.reviewer_name && (
                <Badge variant="outline" className="rounded-full text-xs">
                  <UserCheck className="w-3 h-3 mr-1" />
                  {paper.reviewer_name}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              By: {paper.profiles?.full_name || 'Unknown'}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {paper.abstract || "No abstract provided"}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Submitted: {formatLagos(paper.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {paper.file_url && (
              <Button variant="outline" size="sm" className="rounded-xl" asChild>
                <a href={paper.file_url} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </a>
              </Button>
            )}
            {showAssignButton && (
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl border-stat-purple text-stat-purple hover:bg-stat-purple hover:text-white"
                onClick={() => handleAssignReviewer(paper)}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                {paper.reviewer_id ? 'Reassign' : 'Assign'}
              </Button>
            )}
            <Button size="sm" className="rounded-xl" onClick={() => handleReview(paper)}>
              <Eye className="w-4 h-4 mr-1" />
              Review
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <InstitutionLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Research Reviews</h1>
          <p className="text-muted-foreground">Review and approve research paper submissions</p>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-stat-purple rounded-lg flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Review Guidelines</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Read the abstract and download the full paper for review</li>
                  <li>• Provide constructive feedback in your comments</li>
                  <li>• Approved papers are automatically published</li>
                  <li>• Request revisions for papers that need improvement</li>
                  <li>• Reject papers that don't meet quality standards</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList className="rounded-xl">
            <TabsTrigger value="pending" className="gap-2 rounded-xl">
              <Clock className="w-4 h-4" />
              Pending ({pendingPapers.length})
            </TabsTrigger>
            <TabsTrigger value="reviewed" className="gap-2 rounded-xl">
              <CheckCircle className="w-4 h-4" />
              Reviewed ({reviewedPapers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading papers...</p>
              </div>
            ) : pendingPapers.length === 0 ? (
              <Card className="p-12 text-center rounded-xl">
                <CheckCircle className="w-16 h-16 mx-auto text-stat-green mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No papers pending review</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingPapers.map((paper) => renderPaperCard(paper, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviewed" className="mt-6">
            {reviewedPapers.length === 0 ? (
              <Card className="p-12 text-center rounded-xl">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No reviewed papers</h3>
                <p className="text-muted-foreground">Papers you've reviewed will appear here</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviewedPapers.map((paper) => renderPaperCard(paper, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="max-w-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle>Review Paper</DialogTitle>
              <DialogDescription>
                {selectedPaper?.title}
              </DialogDescription>
            </DialogHeader>
            
            {selectedPaper && (
              <div className="space-y-4 mt-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Abstract</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                    {selectedPaper.abstract || "No abstract provided"}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Review Comments
                  </h4>
                  <Textarea
                    placeholder="Add your review comments, feedback, or revision requests..."
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    rows={5}
                    className="rounded-xl"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    variant="outline"
                    className="flex-1 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white rounded-xl"
                    onClick={() => submitReview('revision_requested')}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Request Revision
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-xl"
                    onClick={() => submitReview('rejected')}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                    Reject
                  </Button>
                  <Button 
                    className="flex-1 bg-stat-green hover:bg-stat-green/90 rounded-xl"
                    onClick={() => submitReview('approved')}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Approve & Publish
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reviewer Assignment Dialog */}
        {paperToAssign && institutionId && (
          <ReviewerAssignment
            paperId={paperToAssign.id}
            paperTitle={paperToAssign.title}
            institutionId={institutionId}
            currentReviewerId={paperToAssign.reviewer_id}
            onAssigned={() => fetchPapers(institutionId)}
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
          />
        )}
      </div>
    </InstitutionLayout>
  );
}