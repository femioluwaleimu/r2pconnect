import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  GitCompare, 
  FileText, 
  Download, 
  Sparkles, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Info
} from "lucide-react";
import { formatLagos } from "@/lib/dateUtils";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface ComparisonResult {
  key_changes: string[];
  content_additions: string[];
  content_removals: string[];
  quality_improvements: string[];
  areas_needing_attention: string[];
  supervisor_focus_areas: string[];
  overall_assessment: string;
  alignment_score: number;
}

interface VersionComparisonViewProps {
  researchId: string;
  studentFileUrl: string | null;
  studentFileName: string | null;
  researchTitle: string;
  researchAbstract: string | null;
}

export default function VersionComparisonView({
  researchId,
  studentFileUrl,
  studentFileName,
  researchTitle,
  researchAbstract,
}: VersionComparisonViewProps) {
  const [feedbackFiles, setFeedbackFiles] = useState<FeedbackFile[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFeedbackFiles();
  }, [researchId]);

  const fetchFeedbackFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("supervisor_feedback_uploads")
        .select("*")
        .eq("research_id", researchId)
        .order("version_number", { ascending: false });

      if (error) throw error;
      setFeedbackFiles(data || []);
      
      // Auto-select the latest version
      if (data && data.length > 0) {
        setSelectedVersion(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching feedback files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeComparison = async () => {
    if (!selectedVersion || !studentFileUrl) {
      toast({
        title: "Missing Files",
        description: "Both student submission and supervisor annotation are required for comparison",
        variant: "destructive",
      });
      return;
    }

    const selectedFile = feedbackFiles.find(f => f.id === selectedVersion);
    if (!selectedFile) return;

    setAnalyzing(true);
    setComparisonResult(null);

    try {
      const content = `
Research Title: ${researchTitle}

Research Abstract: ${researchAbstract || "No abstract provided"}

Student Submission: ${studentFileName}
- File URL: ${studentFileUrl}

Supervisor Annotated Version: ${selectedFile.file_name} (Version ${selectedFile.version_number})
- Review Stage: ${selectedFile.review_stage}
- Supervisor Comments: ${selectedFile.comments || "No written comments provided"}
- Uploaded: ${formatLagos(selectedFile.created_at, "datetime")}

Please analyze the differences between the student's original submission and the supervisor's annotated version based on the context provided.
`;

      const { data, error } = await supabase.functions.invoke("ai-research", {
        body: { type: "version_comparison", content },
      });

      if (error) {
        if (error.message?.includes("AI_CREDITS_EXHAUSTED")) {
          toast({
            title: "AI Credits Exhausted",
            description: "You've used all your AI credits. Upgrade your subscription for more.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      // Parse the AI response
      let result = data.result;
      
      // Sanitize markdown code blocks if present
      if (typeof result === "string") {
        result = result.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
        try {
          const parsed = JSON.parse(result);
          setComparisonResult(parsed);
        } catch {
          // If parsing fails, create a structured result from the text
          setComparisonResult({
            key_changes: ["AI analysis completed - see overall assessment"],
            content_additions: [],
            content_removals: [],
            quality_improvements: [],
            areas_needing_attention: [],
            supervisor_focus_areas: [],
            overall_assessment: result,
            alignment_score: 0,
          });
        }
      } else if (data.result) {
        setComparisonResult(data.result);
      }

      toast({
        title: "Analysis Complete",
        description: "Version comparison analysis is ready",
      });
    } catch (error: any) {
      console.error("Error analyzing comparison:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze version differences",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary" />
            Version Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!studentFileUrl || feedbackFiles.length === 0) {
    return null;
  }

  const selectedFile = feedbackFiles.find(f => f.id === selectedVersion);

  return (
    <Card className="rounded-2xl border-none shadow-lg">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-primary" />
              AI Version Comparison
              <Badge variant="secondary" className="ml-2 rounded-full text-xs">
                Beta
              </Badge>
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-xl">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Compare student submissions with supervisor annotations using AI analysis
          </p>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* File Selection */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Student Submission */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Student Submission</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{studentFileName}</p>
                <a href={studentFileUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="mt-2 rounded-xl text-xs">
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </a>
              </div>

              {/* Supervisor Version Select */}
              <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium text-warning">Supervisor Annotation</span>
                </div>
                <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                  <SelectTrigger className="rounded-xl text-sm">
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {feedbackFiles.map((file) => (
                      <SelectItem key={file.id} value={file.id}>
                        v{file.version_number} - {formatLagos(file.created_at)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedFile && (
                  <a href={selectedFile.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="mt-2 rounded-xl text-xs">
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Analyze Button */}
            <Button
              onClick={handleAnalyzeComparison}
              disabled={analyzing || !selectedVersion}
              className="w-full rounded-xl bg-gradient-to-r from-primary to-primary/80"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Differences...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze with AI
                </>
              )}
            </Button>

            {/* Comparison Results */}
            {comparisonResult && (
              <div className="space-y-4 mt-4">
                {/* Alignment Score */}
                {comparisonResult.alignment_score > 0 && (
                  <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Alignment Score</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                            style={{ width: `${comparisonResult.alignment_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-primary">
                          {comparisonResult.alignment_score}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Key Changes */}
                {comparisonResult.key_changes?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" />
                      Key Changes Identified
                    </h4>
                    <ul className="space-y-1.5">
                      {comparisonResult.key_changes.map((change, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quality Improvements */}
                {comparisonResult.quality_improvements?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-secondary">
                      <CheckCircle className="w-4 h-4" />
                      Quality Improvements
                    </h4>
                    <ul className="space-y-1.5">
                      {comparisonResult.quality_improvements.map((improvement, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 flex-shrink-0" />
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Areas Needing Attention */}
                {comparisonResult.areas_needing_attention?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-warning">
                      <AlertCircle className="w-4 h-4" />
                      Areas Needing Attention
                    </h4>
                    <ul className="space-y-1.5">
                      {comparisonResult.areas_needing_attention.map((area, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 flex-shrink-0" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Supervisor Focus Areas */}
                {comparisonResult.supervisor_focus_areas?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-accent-foreground">
                      <FileText className="w-4 h-4" />
                      Supervisor Focus Areas
                    </h4>
                    <ul className="space-y-1.5">
                      {comparisonResult.supervisor_focus_areas.map((area, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Overall Assessment */}
                {comparisonResult.overall_assessment && (
                  <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                    <h4 className="text-sm font-semibold mb-2">Overall Assessment</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {comparisonResult.overall_assessment}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
