import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, GraduationCap } from "lucide-react";

interface StyleReference {
  id: string;
  file_name: string;
  file_size: number | null;
  source_description: string | null;
  created_at: string;
}

interface Props {
  studentId: string;
}

export default function SupervisorStyleReferencesDisplay({ studentId }: Props) {
  const [references, setReferences] = useState<StyleReference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferences();
  }, [studentId]);

  const fetchReferences = async () => {
    try {
      const { data, error } = await supabase
        .from("supervisor_style_references")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReferences(data || []);
    } catch (error) {
      console.error("Error fetching supervisor style references:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (references.length === 0) return null;

  return (
    <Card className="rounded-2xl shadow-md border-violet-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <GraduationCap className="w-5 h-5 text-violet-500" />
          Supervisor Style References
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge variant="outline" className="bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30">
          <GraduationCap className="w-3 h-3 mr-1" />
          Added by your supervisor
        </Badge>
        <p className="text-sm text-muted-foreground">
          Your supervisor has added style reference documents to guide the AI review of your research.
        </p>
        <div className="grid gap-2">
          {references.map((ref) => (
            <div key={ref.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ref.file_name}</p>
                {ref.source_description && (
                  <p className="text-xs text-muted-foreground truncate">{ref.source_description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
