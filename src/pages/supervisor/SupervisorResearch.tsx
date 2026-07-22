import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import SupervisorLayout from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Search, Filter, Eye, Clock, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface Research {
  id: string;
  title: string;
  research_field: string | null;
  supervisor_approval_status: string;
  status: string;
  created_at: string;
  author: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export default function SupervisorResearch() {
  const [user, setUser] = useState<User | null>(null);
  const [research, setResearch] = useState<Research[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchResearch(user.id);
    });
  }, [navigate]);

  const fetchResearch = async (userId: string) => {
    setLoading(true);

    const columns = "id, title, research_field, supervisor_approval_status, status, created_at, author_id";

    const { data: primaryPapers } = await supabase
      .from("research_papers")
      .select(columns)
      .eq("supervisor_id", userId)
      .order("created_at", { ascending: false });

    const { data: coSupervisorPapers } = await supabase
      .from("research_papers")
      .select(columns)
      .eq("co_supervisor_id", userId)
      .order("created_at", { ascending: false });

    const { data: assignedStudents } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("assigned_supervisor_id", userId);

    const assignedStudentIds = (assignedStudents || []).map((student) => student.user_id).filter(Boolean);
    const { data: assignedStudentPapers } = assignedStudentIds.length
      ? await supabase
          .from("research_papers")
          .select(columns)
          .in("author_id", assignedStudentIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    const { data: supervisorProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", userId)
      .maybeSingle();

    const supervisorEmail = String(supervisorProfile?.email || user?.email || "").toLowerCase();
    const { data: acceptedInvites } = supervisorEmail
      ? await supabase
          .from("external_supervisor_invites")
          .select("student_id")
          .eq("email", supervisorEmail)
          .eq("status", "accepted")
      : { data: [] };

    const invitedStudentIds = (acceptedInvites || []).map((invite) => invite.student_id).filter(Boolean);
    const { data: invitedStudentPapers } = invitedStudentIds.length
      ? await supabase
          .from("research_papers")
          .select(columns)
          .in("author_id", invitedStudentIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    const paperMap = new Map<string, any>();
    [...(primaryPapers || []), ...(coSupervisorPapers || []), ...(assignedStudentPapers || []), ...(invitedStudentPapers || [])].forEach((paper) => {
      if (paper?.id) paperMap.set(paper.id, paper);
    });

    const papers = Array.from(paperMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (papers.length > 0) {
      const authorIds = [...new Set(papers.map((p) => p.author_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
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

      setResearch(researchWithAuthors);
    } else {
      setResearch([]);
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "revision_requested":
        return (
          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Revision
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredResearch = research.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.author.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.supervisor_approval_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Student Research</h1>
          <p className="text-muted-foreground">View all research papers under your supervision</p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by title or student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 rounded-xl h-12 border-none shadow-md"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 rounded-xl h-12 shadow-md border-none">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="revision_requested">Revision Requested</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Research List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading research...</p>
          </div>
        ) : filteredResearch.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-none shadow-lg">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No research found</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filter"
                : "No student research assigned yet"}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredResearch.map((r) => (
              <Card key={r.id} className="rounded-2xl border-none shadow-md hover:shadow-lg transition-all">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={r.author.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {r.author.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground line-clamp-1">{r.title}</h3>
                        <p className="text-sm text-muted-foreground">{r.author.full_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.research_field && (
                        <Badge variant="secondary" className="rounded-full hidden sm:inline-flex">
                          {r.research_field}
                        </Badge>
                      )}
                      {getStatusBadge(r.supervisor_approval_status)}
                      <Link to={`/supervisor/research/${r.id}`}>
                        <Button variant="ghost" size="icon" className="rounded-xl">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SupervisorLayout>
  );
}
