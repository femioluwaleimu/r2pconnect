import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Brain,
  FileSearch,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IntegrityIndicatorsProps {
  plagiarismScore: number | null;
  plagiarismStatus: string | null;
  aiUsageDeclared: boolean | null;
  aiToolsUsed: string | null;
  aiContentRisk: string | null;
  showForSupervisor?: boolean;
  // Institution thresholds for comparison
  institutionPlagiarismThreshold?: number;
  institutionAiThreshold?: string;
}

export default function ResearchIntegrityIndicators({
  plagiarismScore,
  plagiarismStatus,
  aiUsageDeclared,
  aiToolsUsed,
  aiContentRisk,
  showForSupervisor = false,
  institutionPlagiarismThreshold,
  institutionAiThreshold,
}: IntegrityIndicatorsProps) {
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "low":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
      case "medium":
        return "bg-amber-500/10 text-amber-600 border-amber-200";
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "low":
        return <CheckCircle className="w-4 h-4" />;
      case "medium":
        return <AlertTriangle className="w-4 h-4" />;
      case "high":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const hasAnyData = plagiarismStatus || aiUsageDeclared !== null || aiContentRisk;

  if (!hasAnyData) {
    return null;
  }

  return (
    <Card className="rounded-2xl border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-t-2xl border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-violet-600" />
          Research Integrity
          {showForSupervisor && (
            <Badge variant="secondary" className="ml-2 text-xs">
              Supervisor View
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid sm:grid-cols-3 gap-4">
          {/* Plagiarism Check */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`p-4 rounded-xl border ${getStatusColor(plagiarismStatus)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileSearch className="w-5 h-5" />
                    <span className="font-medium text-sm">Plagiarism Check</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {plagiarismScore !== null ? `${Math.round(plagiarismScore)}%` : "—"}
                    </span>
                    {getStatusIcon(plagiarismStatus)}
                  </div>
                  {plagiarismStatus && (
                    <Badge 
                      variant="outline" 
                      className={`mt-2 capitalize ${getStatusColor(plagiarismStatus)}`}
                    >
                      {plagiarismStatus} Risk
                    </Badge>
                  )}
                  {showForSupervisor && institutionPlagiarismThreshold !== undefined && plagiarismScore !== null && plagiarismScore > institutionPlagiarismThreshold && (
                    <p className="text-xs text-destructive mt-1">
                      ⚠️ Exceeds {institutionPlagiarismThreshold}% threshold
                    </p>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm">
                  This is an AI-based advisory check. The supervisor makes the final decision based on their review.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* AI Usage Declaration */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`p-4 rounded-xl border ${aiUsageDeclared ? "bg-primary/5 text-primary border-primary/20" : "bg-muted text-muted-foreground"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-5 h-5" />
                    <span className="font-medium text-sm">AI Usage Declared</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {aiUsageDeclared === null ? "—" : aiUsageDeclared ? "Yes" : "No"}
                    </span>
                    {aiUsageDeclared ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : aiUsageDeclared === false ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <Info className="w-4 h-4" />
                    )}
                  </div>
                  {aiUsageDeclared && aiToolsUsed && showForSupervisor && (
                    <p className="mt-2 text-xs line-clamp-2">{aiToolsUsed}</p>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm">
                  Self-declared by the student. Indicates whether AI tools were used in the research.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* AI Content Risk */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`p-4 rounded-xl border ${getStatusColor(aiContentRisk)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium text-sm">AI Content Risk</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold capitalize">
                      {aiContentRisk || "—"}
                    </span>
                    {getStatusIcon(aiContentRisk)}
                  </div>
                  {aiContentRisk && (
                    <Badge 
                      variant="outline" 
                      className={`mt-2 capitalize ${getStatusColor(aiContentRisk)}`}
                    >
                      Advisory Only
                    </Badge>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm">
                  AI detection is not definitive. This provides advisory signals for the supervisor's consideration.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {showForSupervisor && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                These are advisory indicators only. As the supervisor, you make the final decision on research integrity based on your comprehensive review.
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
