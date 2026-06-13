import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import SupervisorLayout from "@/components/layout/SupervisorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Eye, FileText, Calendar } from "lucide-react";

interface ApprovedResearch {
  id: string;
  title: string;
  research_field: string | null;
  supervisor_approved_at: string | null;
  status: string;
  author: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export default function SupervisorApproved() {
  const [user, setUser] = useState<User | null>(null);
  const [approvedResearch, setApprovedResearch] = useState<ApprovedResearch[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchApprovedResearch(user.id);
    });
  }, [navigate]);

  const fetchApprovedResearch = async (userId: string) => {
    setLoading(true);

    const { data: papers } = await supabase
      .from("research_papers")
      .select("id, title, research_field, supervisor_approved_at, status, author_id")
      .eq("supervisor_id", userId)
      .eq("research_type", "student")
      .eq("supervisor_approval_status", "approved")
      .order("supervisor_approved_at", { ascending: false });

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

      setApprovedResearch(researchWithAuthors);
    }

    setLoading(false);
  };

  const getResearchStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Published</Badge>;
      case "under_review":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Under Review</Badge>;
      case "draft":
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Approved Research</h1>
            <p className="text-muted-foreground">Research papers you have approved</p>
          </div>
          <Badge className="w-fit rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 px-4 py-1">
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            {approvedResearch.length} Approved
          </Badge>
        </div>

        {/* Approved Research List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading approved research...</p>
          </div>
        ) : approvedResearch.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-none shadow-lg">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No approved research yet</h3>
            <p className="text-muted-foreground">Approved research will appear here</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {approvedResearch.map((research) => (
              <Card key={research.id} className="rounded-2xl border-none shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground line-clamp-2">{research.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={research.author.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-primary/10">
                            {research.author.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">{research.author.full_name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {research.research_field && (
                          <Badge variant="secondary" className="rounded-full text-xs">
                            {research.research_field}
                          </Badge>
                        )}
                        {getResearchStatusBadge(research.status)}
                      </div>
                      {research.supervisor_approved_at && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Approved {new Date(research.supervisor_approved_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Link to={`/supervisor/research/${research.id}`}>
                      <Button variant="ghost" size="icon" className="rounded-xl">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
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
