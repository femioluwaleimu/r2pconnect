import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import SupervisorLayout from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Clock, CheckCircle, AlertTriangle, X, FileText, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PendingResearch {
  id: string;
  title: string;
  abstract: string | null;
  research_field: string | null;
  created_at: string;
  author: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export default function SupervisorPending() {
  const [user, setUser] = useState<User | null>(null);
  const [pendingResearch, setPendingResearch] = useState<PendingResearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResearch, setSelectedResearch] = useState<PendingResearch | null>(null);
  const [actionType, setActionType] = useState<"approve" | "revision" | "reject" | null>(null);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchPendingResearch(user.id);
    });
  }, [navigate]);

  const fetchPendingResearch = async (userId: string) => {
    setLoading(true);

    const { data: papers } = await supabase
      .from("research_papers")
      .select("id, title, abstract, research_field, created_at, author_id")
      .eq("supervisor_id", userId)
      .eq("research_type", "student")
      .eq("supervisor_approval_status", "pending")
      .order("created_at", { ascending: true });

    if (papers) {
      const authorIds = [...new Set(papers.map((p) => p.author_id))];
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", authorIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      const researchWithAuthors = papers.map((paper) => ({
        ...paper,
        author: profileMap.get(paper.author_id) || {
          user_id: paper.author_id,
          full_name: "Unknown",
          avatar_url: null,
        },
      }));

      setPendingResearch(researchWithAuthors);
    }

    setLoading(false);
  };

  const handleAction = async () => {
    if (!selectedResearch || !actionType || !user) return;

    setSubmitting(true);
    try {
      // Get supervisor's institution_id
      const { data: supervisorData } = await supabase
        .from('supervisors')
        .select('institution_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const updateData: any = {
        supervisor_comments: comments || null,
        supervisor_reviewed_at: new Date().toISOString(),
      };

      if (actionType === "approve") {
        updateData.supervisor_approval_status = "approved";
        updateData.supervisor_approved_at = new Date().toISOString();
        // Set status to under_review so it appears in institution pending reviews
        updateData.status = "under_review";
        // Set institution_id from supervisor's institution
        if (supervisorData?.institution_id) {
          updateData.institution_id = supervisorData.institution_id;
        }
      } else if (actionType === "revision") {
        updateData.supervisor_approval_status = "revision_requested";
      } else if (actionType === "reject") {
        updateData.supervisor_approval_status = "rejected";
      }

      const { error } = await supabase
        .from("research_papers")
        .update(updateData)
        .eq("id", selectedResearch.id);

      if (error) throw error;

      toast({
        title: actionType === "approve" ? "Research Approved" : actionType === "revision" ? "Revision Requested" : "Research Rejected",
        description: `${selectedResearch.title} has been ${actionType === "approve" ? "approved" : actionType === "revision" ? "sent back for revision" : "rejected"}`,
      });

      // Refresh list
      if (user) fetchPendingResearch(user.id);
      setSelectedResearch(null);
      setActionType(null);
      setComments("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pending Reviews</h1>
            <p className="text-muted-foreground">Research papers awaiting your approval</p>
          </div>
          <Badge className="w-fit rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 px-4 py-1">
            <Clock className="w-3.5 h-3.5 mr-1" />
            {pendingResearch.length} Pending
          </Badge>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <div className="text-white">
                <h4 className="font-bold text-lg mb-1">Review Guidelines</h4>
                <ul className="text-sm text-white/80 space-y-1">
                  <li>• Review methodology, objectives, and ethical considerations</li>
                  <li>• Approve to allow student to proceed to completion</li>
                  <li>• Request revision with specific feedback if changes needed</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Research List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading pending reviews...</p>
          </div>
        ) : pendingResearch.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-none shadow-lg">
            <CheckCircle className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">All caught up!</h3>
            <p className="text-muted-foreground">No pending research reviews at the moment</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingResearch.map((research) => (
              <Card key={research.id} className="rounded-2xl border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={research.author.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {research.author.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground line-clamp-1">{research.title}</h3>
                        <p className="text-sm text-muted-foreground">by {research.author.full_name}</p>
                        {research.research_field && (
                          <Badge variant="secondary" className="mt-2 rounded-full">
                            {research.research_field}
                          </Badge>
                        )}
                        {research.abstract && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{research.abstract}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                      <Link to={`/supervisor/research/${research.id}`}>
                        <Button variant="outline" className="rounded-xl">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        className="rounded-xl text-orange-600 border-orange-200 hover:bg-orange-50"
                        onClick={() => {
                          setSelectedResearch(research);
                          setActionType("revision");
                        }}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Revision
                      </Button>
                      <Button
                        className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600"
                        onClick={() => {
                          setSelectedResearch(research);
                          setActionType("approve");
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => { setActionType(null); setComments(""); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Research" : actionType === "revision" ? "Request Revision" : "Reject Research"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {actionType === "approve"
                ? "Are you sure you want to approve this research? The student will be able to proceed to completion."
                : actionType === "revision"
                ? "Please provide feedback on what changes are needed."
                : "Please provide a reason for rejecting this research."}
            </p>
            {(actionType === "revision" || actionType === "reject") && (
              <Textarea
                placeholder="Enter your comments..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="rounded-xl"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionType(null); setComments(""); }} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={submitting || ((actionType === "revision" || actionType === "reject") && !comments.trim())}
              className={`rounded-xl ${
                actionType === "approve"
                  ? "bg-gradient-to-r from-emerald-500 to-green-600"
                  : actionType === "revision"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600"
                  : "bg-gradient-to-r from-red-500 to-rose-600"
              }`}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionType === "approve" ? "Approve" : actionType === "revision" ? "Request Revision" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SupervisorLayout>
  );
}
