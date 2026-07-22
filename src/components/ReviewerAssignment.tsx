import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createAppNotification } from "@/lib/notifications";

interface Reviewer {
  user_id: string;
  full_name: string;
  email: string;
  papers_reviewed: number;
  avatar_url?: string | null;
}

interface ReviewerAssignmentProps {
  paperId: string;
  paperTitle: string;
  institutionId: string;
  currentReviewerId?: string | null;
  onAssigned: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReviewerAssignment({
  paperId,
  paperTitle,
  institutionId,
  currentReviewerId,
  onAssigned,
  open,
  onOpenChange
}: ReviewerAssignmentProps) {
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchReviewers();
      setSelectedReviewer(currentReviewerId || "");
    }
  }, [open, institutionId, currentReviewerId]);

  const fetchReviewers = async () => {
    setLoading(true);
    try {
      const allReviewers: Reviewer[] = [];
      const addedUserIds = new Set<string>();

      // Fetch reviewers from profiles with institution_id matching
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .eq('institution_id', institutionId);

      if (profiles && profiles.length > 0) {
        // Filter to only reviewers by checking user_roles
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', profiles.map(p => p.user_id))
          .eq('role', 'reviewer');

        const reviewerUserIds = new Set(roles?.map(r => r.user_id) || []);

        // Get review counts
        const { data: reviews } = await supabase
          .from('paper_reviews')
          .select('reviewer_id');

        const reviewCounts = reviews?.reduce((acc, r) => {
          acc[r.reviewer_id] = (acc[r.reviewer_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        profiles
          .filter(p => reviewerUserIds.has(p.user_id))
          .forEach(r => {
            if (!addedUserIds.has(r.user_id)) {
              allReviewers.push({
                user_id: r.user_id,
                full_name: r.full_name || 'Unknown',
                email: r.email || '',
                papers_reviewed: reviewCounts[r.user_id] || 0,
                avatar_url: r.avatar_url
              });
              addedUserIds.add(r.user_id);
            }
          });
      }

      // Also fetch accepted reviewer invites
      const { data: acceptedInvites } = await supabase
        .from('reviewer_invites')
        .select('email, full_name')
        .eq('institution_id', institutionId)
        .eq('status', 'accepted');

      if (acceptedInvites && acceptedInvites.length > 0) {
        const { data: inviteProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, avatar_url')
          .in('email', acceptedInvites.map(i => i.email));

        const { data: reviews } = await supabase
          .from('paper_reviews')
          .select('reviewer_id');

        const reviewCounts = reviews?.reduce((acc, r) => {
          acc[r.reviewer_id] = (acc[r.reviewer_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        inviteProfiles?.forEach(p => {
          if (!addedUserIds.has(p.user_id)) {
            allReviewers.push({
              user_id: p.user_id,
              full_name: p.full_name || 'Unknown',
              email: p.email || '',
              papers_reviewed: reviewCounts[p.user_id] || 0,
              avatar_url: p.avatar_url
            });
            addedUserIds.add(p.user_id);
          }
        });
      }

      setReviewers(allReviewers);
    } catch (error) {
      console.error('Error fetching reviewers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedReviewer) {
      toast({ title: "Please select a reviewer", variant: "destructive" });
      return;
    }

    setAssigning(true);
    try {
      // Update the research paper with the reviewer_id
      const { error: updateError } = await supabase
        .from('research_papers')
        .update({ reviewer_id: selectedReviewer })
        .eq('id', paperId);

      if (updateError) throw updateError;

      // Get reviewer name for notification
      const reviewer = reviewers.find(r => r.user_id === selectedReviewer);
      const reviewerName = reviewer?.full_name || 'Unknown';

      // Create notification for the reviewer
      const { error: notifyError } = await createAppNotification({
        userId: selectedReviewer,
        title: 'New Research Assignment',
        message: `You have been assigned to review: "${paperTitle}"`,
        type: 'info',
        link: '/reviewer/pending'
      });

      if (notifyError) {
        console.error('Notification error:', notifyError);
      }

      toast({
        title: "Reviewer Assigned",
        description: `${reviewerName} has been assigned to review this paper`
      });

      onAssigned();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error assigning reviewer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign reviewer",
        variant: "destructive"
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-stat-green" />
            Assign Reviewer
          </DialogTitle>
          <DialogDescription>
            Select a reviewer to evaluate this research paper
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Paper:</p>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg line-clamp-2">
              {paperTitle}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviewers.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No reviewers available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Invite reviewers to your institution first
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Select Reviewer:</p>
              <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose a reviewer..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {reviewers.map((reviewer) => (
                    <SelectItem key={reviewer.user_id} value={reviewer.user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={reviewer.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-stat-purple text-white">
                            {reviewer.full_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{reviewer.full_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {reviewer.papers_reviewed} reviews completed
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl bg-stat-green hover:bg-stat-green/90"
              onClick={handleAssign}
              disabled={assigning || !selectedReviewer || reviewers.length === 0}
            >
              {assigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Assign Reviewer
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
