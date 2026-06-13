import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Eye, Lock, AlertCircle } from "lucide-react";
import { formatLagos } from "@/lib/dateUtils";

interface FeedbackFile {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  version_number: number;
  review_stage: string;
  comments: string | null;
  created_at: string;
}

interface SupervisorFeedbackFilesProps {
  researchId: string;
  isStudent?: boolean;
  showTitle?: boolean;
}

export default function SupervisorFeedbackFiles({ 
  researchId,
  isStudent = false,
  showTitle = true
}: SupervisorFeedbackFilesProps) {
  const [files, setFiles] = useState<FeedbackFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, [researchId]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("supervisor_feedback_uploads")
        .select("*")
        .eq("research_id", researchId)
        .order("version_number", { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error("Error fetching feedback files:", error);
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
              <FileText className="w-5 h-5 text-primary" />
              Supervisor Feedback Documents
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-2xl border-none shadow-lg">
      {showTitle && (
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Supervisor Annotated Documents
            <Badge variant="secondary" className="ml-auto rounded-full">
              {files.length} {files.length === 1 ? "file" : "files"}
            </Badge>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {/* Student warning */}
        {isStudent && (
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-200 rounded-xl mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700">Reference Only</p>
              <p className="text-xs text-amber-600">
                These annotated documents are for your reference. You cannot submit, edit, or publish them. 
                Your final submission must be your own work.
              </p>
            </div>
          </div>
        )}

        {files.map((file) => (
          <div
            key={file.id}
            className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      variant="outline" 
                      className="text-xs rounded-full bg-blue-500/10 text-blue-600 border-blue-200"
                    >
                      Supervisor Annotated Version
                    </Badge>
                    <Badge variant="secondary" className="text-xs rounded-full">
                      v{file.version_number}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate mt-1">
                    {file.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {formatLagos(file.created_at, "datetime")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isStudent && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    <Lock className="w-3 h-3" />
                    <span>View Only</span>
                  </div>
                )}
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </a>
              </div>
            </div>

            {file.comments && (
              <div className="pl-13 mt-2">
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {file.comments}
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
