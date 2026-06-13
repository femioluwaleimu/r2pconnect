import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  MessageSquare, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  Calendar,
  ChevronRight
} from "lucide-react";
import { formatLagos } from "@/lib/dateUtils";

interface ReviewHistoryItem {
  id: string;
  action: string;
  previous_status: string | null;
  new_status: string;
  comments: string | null;
  created_at: string;
  feedback_file?: {
    id: string;
    file_url: string;
    file_name: string;
    version_number: number;
  } | null;
}

interface SupervisorReviewHistoryProps {
  researchId: string;
  showTitle?: boolean;
  collapsible?: boolean;
}

const actionConfig: Record<string, { label: string; color: string; icon: any }> = {
  approve: { label: "Approved", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: CheckCircle },
  revision: { label: "Revision Requested", color: "bg-amber-500/10 text-amber-600 border-amber-200", icon: AlertTriangle },
  reject: { label: "Rejected", color: "bg-red-500/10 text-red-600 border-red-200", icon: XCircle },
  submit: { label: "Submitted", color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: Clock },
  resubmit: { label: "Resubmitted", color: "bg-purple-500/10 text-purple-600 border-purple-200", icon: Clock },
};

export default function SupervisorReviewHistory({ 
  researchId,
  showTitle = true,
  collapsible = false
}: SupervisorReviewHistoryProps) {
  const [history, setHistory] = useState<ReviewHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [researchId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("supervisor_review_history")
        .select(`
          id,
          action,
          previous_status,
          new_status,
          comments,
          created_at,
          feedback_file_id
        `)
        .eq("research_id", researchId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch associated feedback files if any
      const historyWithFiles = await Promise.all(
        (data || []).map(async (item) => {
          if (item.feedback_file_id) {
            const { data: fileData } = await supabase
              .from("supervisor_feedback_uploads")
              .select("id, file_url, file_name, version_number")
              .eq("id", item.feedback_file_id)
              .maybeSingle();
            
            return { ...item, feedback_file: fileData };
          }
          return { ...item, feedback_file: null };
        })
      );

      setHistory(historyWithFiles);
    } catch (error) {
      console.error("Error fetching review history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl border-none shadow-lg">
        {showTitle && (
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Supervisor Feedback History
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="rounded-2xl border-none shadow-lg">
        {showTitle && (
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Supervisor Feedback History
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No supervisor feedback yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const visibleHistory = expanded ? history : history.slice(0, 3);
  const hasMore = history.length > 3;

  const HistoryContent = () => (
    <div className="space-y-3">
      {visibleHistory.map((item) => {
        const config = actionConfig[item.action] || actionConfig.submit;
        const ActionIcon = config.icon;

        return (
          <div
            key={item.id}
            className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-3"
          >
            {/* Header with action badge */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                  <ActionIcon className="w-4 h-4" />
                </div>
                <Badge className={`${config.color} border rounded-full`}>
                  {config.label}
                </Badge>
              </div>
            </div>

            {/* Comments - Render as HTML */}
            {item.comments && (
              <div className="pl-10">
                <div 
                  className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_p]:my-1"
                  dangerouslySetInnerHTML={{ __html: item.comments }}
                />
              </div>
            )}

            {/* Feedback file */}
            {item.feedback_file && (
              <div className="pl-10">
                <a
                  href={item.feedback_file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-primary/5 hover:bg-primary/10 rounded-lg text-sm text-primary transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">
                    {item.feedback_file.file_name}
                  </span>
                  <Badge variant="secondary" className="text-xs rounded-full">
                    v{item.feedback_file.version_number}
                  </Badge>
                  <Download className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Timestamp footer */}
            <div className="pl-10 pt-2 border-t border-border/30 flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{formatLagos(item.created_at, "datetime")}</span>
            </div>
          </div>
        );
      })}

      {/* Show more/less button */}
      {hasMore && (
        <Button
          variant="ghost"
          onClick={() => setExpanded(!expanded)}
          className="w-full rounded-xl text-muted-foreground"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Show {history.length - 3} More
            </>
          )}
        </Button>
      )}
    </div>
  );

  // Collapsible variant
  if (collapsible) {
    return (
      <Card className="rounded-2xl border-none shadow-lg">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-2xl">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Supervisor Feedback History
                <Badge variant="secondary" className="rounded-full">
                  {history.length} {history.length === 1 ? "feedback" : "feedbacks"}
                </Badge>
                <div className="ml-auto">
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <HistoryContent />
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  // Non-collapsible variant (default)
  return (
    <Card className="rounded-2xl border-none shadow-lg">
      {showTitle && (
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Supervisor Feedback History
            <Badge variant="secondary" className="ml-auto rounded-full">
              {history.length} {history.length === 1 ? "feedback" : "feedbacks"}
            </Badge>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <HistoryContent />
      </CardContent>
    </Card>
  );
}
