import { useState, useEffect } from "react";
import IndustryLayout from "@/components/layout/IndustryLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Info, Search, Clock, CheckCircle, XCircle, Loader2, Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatLagos } from "@/lib/dateUtils";

interface Submission {
  id: string;
  challenge_id: string;
  researcher_id: string;
  proposal: string;
  status: string;
  created_at: string;
  challenges?: {
    title: string;
    reward_amount: number | null;
    reward_currency: string | null;
  };
  profiles?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    institution_id: string | null;
  };
  institution?: { name: string } | null;
}

export default function IndustrySubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [challengeFilter, setChallengeFilter] = useState<string>("all");
  const [challenges, setChallenges] = useState<{ id: string; title: string }[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userChallenges } = await supabase
        .from("challenges")
        .select("id, title")
        .eq("industry_id", user.id);

      if (!userChallenges || userChallenges.length === 0) {
        setLoading(false);
        return;
      }

      setChallenges(userChallenges);
      const challengeIds = userChallenges.map(c => c.id);

      const { data: subs, error } = await supabase
        .from("challenge_submissions")
        .select(`*, challenges(title, reward_amount, reward_currency)`)
        .in("challenge_id", challengeIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const researcherIds = [...new Set((subs || []).map(s => s.researcher_id))];
      
      if (researcherIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url, institution_id")
          .in("user_id", researcherIds);

        const instIds = [...new Set((profiles || []).map(p => p.institution_id).filter(Boolean))];
        const { data: institutions } = await supabase.from("institutions").select("id, name").in("id", instIds);

        const profileMap = new Map((profiles || []).map(p => {
          const inst = institutions?.find(i => i.id === p.institution_id);
          return [p.user_id, { ...p, institution: inst ? { name: inst.name } : null }];
        }));
        const enrichedSubs = (subs || []).map(sub => {
          const profile = profileMap.get(sub.researcher_id);
          return { ...sub, profiles: profile || null, institution: profile?.institution || null };
        });
        setSubmissions(enrichedSubs);
      } else {
        setSubmissions(subs || []);
      }
    } catch (error: any) {
      console.error("Error fetching submissions:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (submissionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("challenge_submissions")
        .update({ status: newStatus })
        .eq("id", submissionId);

      if (error) throw error;
      toast({ title: `Submission ${newStatus}` });
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="text-xs">{status}</Badge>;
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = 
      sub.proposal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.challenges?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    const matchesChallenge = challengeFilter === "all" || sub.challenge_id === challengeFilter;
    return matchesSearch && matchesStatus && matchesChallenge;
  });

  const statusCounts = {
    all: submissions.length,
    pending: submissions.filter(s => s.status === "pending").length,
    approved: submissions.filter(s => s.status === "approved").length,
    rejected: submissions.filter(s => s.status === "rejected").length,
  };

  return (
    <IndustryLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Submissions</h1>
          <p className="text-sm text-muted-foreground">Review proposals from researchers</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
            <CardContent className="p-3">
              <p className="text-xs text-white/80">Total</p>
              <p className="text-xl font-bold">{statusCounts.all}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none">
            <CardContent className="p-3">
              <p className="text-xs text-white/80">Pending</p>
              <p className="text-xl font-bold">{statusCounts.pending}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none">
            <CardContent className="p-3">
              <p className="text-xs text-white/80">Approved</p>
              <p className="text-xl font-bold">{statusCounts.approved}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-none">
            <CardContent className="p-3">
              <p className="text-xs text-white/80">Rejected</p>
              <p className="text-xl font-bold">{statusCounts.rejected}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search submissions..." 
              className="rounded-lg pl-9 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 rounded-lg h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={challengeFilter} onValueChange={setChallengeFilter}>
              <SelectTrigger className="flex-1 rounded-lg h-9 text-sm">
                <SelectValue placeholder="Challenge" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Challenges</SelectItem>
                {challenges.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-foreground text-sm mb-0.5">Review Tips</h4>
                <p className="text-xs text-muted-foreground">Review proposals carefully and check researcher profiles before approving.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submissions List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <Card className="shadow-sm rounded-xl">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mb-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {submissions.length === 0 ? "No Submissions Yet" : "No matching submissions"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {submissions.length === 0 
                    ? "Once researchers submit proposals, they will appear here."
                    : "Try adjusting your search or filters."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredSubmissions.map((submission) => (
              <Card key={submission.id} className="shadow-sm rounded-xl hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarImage src={submission.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold text-sm">
                          {submission.profiles?.full_name?.charAt(0) || "R"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {submission.profiles?.full_name || "Unknown Researcher"}
                        </h3>
                        {submission.institution && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                            <Building2 className="w-2.5 h-2.5" />
                            {submission.institution.name}
                          </p>
                        )}
                        <p className="text-xs text-primary font-medium truncate">{submission.challenges?.title}</p>
                      </div>
                    </div>
                    {getStatusBadge(submission.status)}
                  </div>

                  {/* Proposal */}
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{submission.proposal}</p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      {formatLagos(submission.created_at)}
                    </p>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setSelectedSubmission(submission)} className="rounded-lg text-xs h-7 px-2">
                        View
                      </Button>
                      {submission.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => handleStatusUpdate(submission.id, "approved")} className="rounded-lg text-xs h-7 px-2 bg-emerald-600 hover:bg-emerald-700">
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleStatusUpdate(submission.id, "rejected")} className="rounded-lg text-xs h-7 px-2">
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Submission Detail Dialog */}
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submission Details</DialogTitle>
            </DialogHeader>
            {selectedSubmission && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={selectedSubmission.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg font-bold">
                      {selectedSubmission.profiles?.full_name?.charAt(0) || "R"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedSubmission.profiles?.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedSubmission.profiles?.email}</p>
                    {selectedSubmission.institution && (
                      <p className="text-xs text-primary flex items-center gap-1"><Building2 className="w-3 h-3" />{selectedSubmission.institution.name}</p>
                    )}
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Challenge</p>
                  <p className="font-medium text-sm">{selectedSubmission.challenges?.title}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Proposal</p>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{selectedSubmission.proposal}</p>
                  </div>
                </div>

                {selectedSubmission.status === "pending" && (
                  <div className="flex gap-2 justify-end pt-3 border-t">
                    <Button variant="destructive" size="sm" onClick={() => handleStatusUpdate(selectedSubmission.id, "rejected")} className="rounded-lg">
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => handleStatusUpdate(selectedSubmission.id, "approved")} className="rounded-lg bg-emerald-600 hover:bg-emerald-700">
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </IndustryLayout>
  );
}