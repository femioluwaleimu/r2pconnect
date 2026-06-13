import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, Bot } from "lucide-react";

interface StyleReference {
  id: string;
  file_name: string;
  file_size: number | null;
  source_description: string | null;
  created_at: string;
}

interface StyleReferencesDisplayProps {
  userId: string;
  supervisionType: string | null;
  aiStyleSource: string | null;
}

export default function StyleReferencesDisplay({ 
  userId, 
  supervisionType, 
  aiStyleSource 
}: StyleReferencesDisplayProps) {
  const [references, setReferences] = useState<StyleReference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (supervisionType === "ai") {
      fetchReferences();
    } else {
      setLoading(false);
    }
  }, [userId, supervisionType]);

  const fetchReferences = async () => {
    try {
      const { data, error } = await supabase
        .from("student_style_references")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReferences(data || []);
    } catch (error) {
      console.error("Error fetching references:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (supervisionType !== "ai") {
    return null;
  }

  return (
    <Card className="rounded-2xl shadow-tick border-violet-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="w-5 h-5 text-violet-500" />
          AI Supervisor Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30">
            <Bot className="w-3 h-3 mr-1" />
            AI Supervised
          </Badge>
          {aiStyleSource && (
            <Badge variant="secondary" className="text-xs">
              Style: {aiStyleSource === "institution" ? "Institution" : "Student"}
            </Badge>
          )}
        </div>

        {references.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Style References ({references.length})
            </p>
            <div className="grid gap-2">
              {references.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ref.file_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(ref.file_size)}</span>
                      {ref.source_description && (
                        <>
                          <span>•</span>
                          <span className="truncate">{ref.source_description}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-muted rounded-lg" />
            <div className="h-12 bg-muted rounded-lg" />
          </div>
        )}

        {!loading && references.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No style references uploaded for this research.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
