import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Loader2, 
  Sparkles,
  FileSearch,
  AlertTriangle,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSupervisorCredits } from "@/hooks/useSupervisorCredits";

interface SupervisorIntegrityCheckProps {
  researchId: string;
  title: string;
  abstract: string;
  fileUrl: string | null;
  hasExistingCheck: boolean;
  onCheckComplete: (result?: IntegrityCheckResult) => void;
}

export interface IntegrityCheckResult {
  plagiarism_score?: number | null;
  plagiarism_status?: string | null;
  ai_content_risk?: string | null;
  summary?: string | null;
  recommendations?: string[] | string | null;
  credits_remaining?: number | null;
}

export default function SupervisorIntegrityCheck({
  researchId,
  title,
  abstract,
  fileUrl,
  hasExistingCheck,
  onCheckComplete,
}: SupervisorIntegrityCheckProps) {
  const [loading, setLoading] = useState(false);
  const { creditsRemaining, refresh: refreshCredits } = useSupervisorCredits();
  const { toast } = useToast();

  // Estimate word count from abstract (document word count will be calculated server-side)
  const estimatedWords = abstract ? abstract.split(/\s+/).length : 0;
  const estimatedCredits = Math.max(1, Math.ceil(estimatedWords / 5000));
  
  // If there's a file, we estimate higher since full document will be analyzed
  const expectedCredits = fileUrl ? Math.max(2, estimatedCredits) : estimatedCredits;

  const handleRunCheck = async () => {
    if (creditsRemaining < 1) {
      toast({
        title: "Insufficient Credits",
        description: "You do not have enough supervisor AI credits. You will receive more credits when your students subscribe to a package.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("research-integrity-check", {
        body: {
          research_id: researchId,
          abstract,
          title,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.message || "You do not have enough supervisor AI credits. You will receive more credits when your students subscribe to a package.");
      }

      toast({
        title: "Integrity Check Complete",
        description: data.document_analyzed 
          ? "Full document was analyzed successfully." 
          : "Analysis based on abstract and title.",
      });

      // Refresh credits after use
      refreshCredits();
      onCheckComplete(data);
    } catch (error: any) {
      console.error("Integrity check error:", error);
      toast({
        title: "Check Failed",
        description: error.message || "Failed to run integrity check",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border-none shadow-lg">
      <CardHeader className="bg-primary/5 rounded-t-2xl border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-primary" />
          Research Integrity Check
          <Badge variant="secondary" className="ml-auto text-xs">
            Supervisor Only
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {hasExistingCheck ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileSearch className="w-4 h-4" />
            <span>Integrity check has been run. View results below.</span>
          </div>
        ) : (
          <>
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm text-foreground font-medium">
                    AI Credit Usage
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Running this check uses <strong>1 AI credit per 5,000 words</strong> analyzed.
                    {fileUrl && " The full document will be analyzed for thorough results."}
                  </p>
                  <div className="flex items-center gap-4 pt-1">
                    <span className="text-xs text-muted-foreground">
                      Estimated cost: ~{expectedCredits} credit{expectedCredits > 1 ? "s" : ""}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      <Sparkles className="w-3 h-3 mr-1" />
                      You have {creditsRemaining} credit{creditsRemaining !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {!abstract.trim() && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>No abstract available. The check will be limited.</span>
              </div>
            )}

            <Button
              onClick={handleRunCheck}
              disabled={loading || creditsRemaining < 1}
              className="w-full rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Run Integrity Check
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
