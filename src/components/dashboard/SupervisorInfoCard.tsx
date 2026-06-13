import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GraduationCap, Bot, ChevronRight, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface SupervisorInfo {
  paper_id: string | null;
  supervisor_id: string | null;
  supervision_type: string | null;
  supervisor_approval_status: string | null;
  supervisor_name: string | null;
  supervisor_avatar: string | null;
  supervisor_department: string | null;
}

export default function SupervisorInfoCard({ userId }: { userId: string }) {
  const [info, setInfo] = useState<SupervisorInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchSupervisorInfo();
  }, [userId]);

  const fetchSupervisorInfo = async () => {
    // Get the latest student research paper with a supervisor
    const { data: paper } = await supabase
      .from("research_papers")
      .select("id, supervisor_id, supervision_type, supervision_mode, supervisor_approval_status")
      .eq("author_id", userId)
      .eq("research_type", "student")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!paper || (!paper.supervisor_id && !paper.supervision_type)) {
      setLoading(false);
      return;
    }

    let supervisorName: string | null = null;
    let supervisorAvatar: string | null = null;
    let supervisorDept: string | null = null;

    if (paper.supervisor_id && paper.supervision_type !== "ai") {
      const { data: profile } = await supabase
        .from("public_profiles")
        .select("full_name, avatar_url")
        .eq("user_id", paper.supervisor_id)
        .maybeSingle();

      if (profile) {
        supervisorName = profile.full_name;
        supervisorAvatar = profile.avatar_url;
      }

      const { data: sup } = await supabase
        .from("supervisors")
        .select("department")
        .eq("user_id", paper.supervisor_id)
        .maybeSingle();

      supervisorDept = sup?.department || null;
    }

    setInfo({
      paper_id: paper.id,
      supervisor_id: paper.supervisor_id,
      supervision_type: (paper as any).supervision_mode || paper.supervision_type,
      supervisor_approval_status: paper.supervisor_approval_status,
      supervisor_name: supervisorName,
      supervisor_avatar: supervisorAvatar,
      supervisor_department: supervisorDept,
    });
    setLoading(false);
  };

  if (loading || !info) return null;

  const isAI = info.supervision_type === "ai" || info.supervision_type === "ai_only";
  const isHybrid = info.supervision_type === "hybrid_ai_human";

  const getStatusBadge = () => {
    switch (info.supervisor_approval_status) {
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
            <Clock className="w-3 h-3 mr-1" /> Pending Approval
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case "revision_requested":
        return (
          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">
            <AlertCircle className="w-3 h-3 mr-1" /> Revision Requested
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="bg-card rounded-2xl border border-border overflow-hidden shadow-soft">
      <div className="p-4 sm:p-6 border-b border-border bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              {isAI ? <Bot className="w-4 h-4 text-white" /> : <GraduationCap className="w-4 h-4 text-white" />}
            </div>
            <h3 className="font-bold text-foreground">
              {isAI ? "AI Supervision" : isHybrid ? "Hybrid Supervision" : "Institutional Supervision"}
            </h3>
          </div>
          {getStatusBadge()}
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {isAI ? (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground">AI Supervisor</p>
              <p className="text-sm text-muted-foreground">Automated research guidance & review</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={info.supervisor_avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {info.supervisor_name?.charAt(0) || "S"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{info.supervisor_name || "Assigned Supervisor"}</p>
                {info.supervisor_department && (
                  <p className="text-sm text-muted-foreground">{info.supervisor_department}</p>
                )}
              </div>
            </div>
            {info.supervisor_id && (
              <Link to={info.paper_id ? `/dashboard/research/${info.paper_id}` : "/dashboard/research"}>
                <Button variant="ghost" size="sm" className="rounded-xl">
                  Message <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
