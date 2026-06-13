import { CheckCircle, Clock, FileText, UserCheck, Send, Eye, Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResearchProgressTrackerProps {
  researchType: "student" | "completed";
  status: string;
  supervisorApprovalStatus?: string | null;
}

interface Stage {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const getStudentStages = (): Stage[] => [
  { id: "draft", label: "Draft", icon: FileText, description: "Research in progress" },
  { id: "pending", label: "Pending Review", icon: Clock, description: "Submitted to supervisor" },
  { id: "revision", label: "Revision", icon: AlertTriangle, description: "Changes requested" },
  { id: "approved", label: "Approved", icon: UserCheck, description: "Supervisor approved" },
  { id: "completed", label: "Completed", icon: CheckCircle, description: "Ready for publication" },
];

const getCompletedStages = (): Stage[] => [
  { id: "draft", label: "Draft", icon: FileText, description: "Research saved" },
  { id: "under_review", label: "Under Review", icon: Eye, description: "Reviewer evaluation" },
  { id: "revision_requested", label: "Revision", icon: AlertTriangle, description: "Changes needed" },
  { id: "approved", label: "Approved", icon: CheckCircle, description: "Review passed" },
  { id: "published", label: "Published", icon: Send, description: "Live & visible" },
];

const getStudentStageIndex = (status: string, supervisorApprovalStatus?: string | null): number => {
  if (status === "draft" && (!supervisorApprovalStatus || supervisorApprovalStatus === "pending")) return 0;
  if (supervisorApprovalStatus === "pending") return 1;
  if (supervisorApprovalStatus === "revision_requested") return 2;
  if (supervisorApprovalStatus === "approved") return 3;
  if (status === "published" || supervisorApprovalStatus === "completed") return 4;
  return 0;
};

const getCompletedStageIndex = (status: string): number => {
  const statusMap: Record<string, number> = {
    draft: 0,
    under_review: 1,
    revision_requested: 2,
    approved: 3,
    published: 4,
  };
  return statusMap[status] ?? 0;
};

export default function ResearchProgressTracker({
  researchType,
  status,
  supervisorApprovalStatus,
}: ResearchProgressTrackerProps) {
  const stages = researchType === "student" ? getStudentStages() : getCompletedStages();
  const currentIndex =
    researchType === "student"
      ? getStudentStageIndex(status, supervisorApprovalStatus)
      : getCompletedStageIndex(status);

  return (
    <div className="w-full">
      {/* Desktop Progress */}
      <div className="hidden sm:block">
        <div className="relative flex items-center justify-between">
          {/* Progress Line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-muted rounded-full">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
              style={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
            />
          </div>

          {/* Stage Circles */}
          {stages.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isRevision = stage.id === "revision" || stage.id === "revision_requested";
            const Icon = stage.icon;

            return (
              <div key={stage.id} className="relative z-10 flex flex-col items-center">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCompleted
                      ? "bg-primary border-primary text-primary-foreground"
                      : isCurrent
                      ? isRevision
                        ? "bg-orange-500 border-orange-500 text-white ring-4 ring-orange-200"
                        : "bg-gradient-to-br from-primary to-accent border-transparent text-white ring-4 ring-primary/20"
                      : "bg-background border-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="mt-3 text-center">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {stage.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[80px]">
                    {stage.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Progress */}
      <div className="sm:hidden space-y-2">
        {stages.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isRevision = stage.id === "revision" || stage.id === "revision_requested";
          const Icon = stage.icon;

          return (
            <div key={stage.id} className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                    ? isRevision
                      ? "bg-orange-500 text-white"
                      : "bg-gradient-to-br from-primary to-accent text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {stage.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">{stage.description}</p>
              </div>
              {isCurrent && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                  Current
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
