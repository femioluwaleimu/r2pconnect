import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  GraduationCap 
} from "lucide-react";

type ReadinessLevel = "not_ready" | "needs_revision" | "supervisor_ready" | string;

interface ExaminerReadinessLabelProps {
  readiness: ReadinessLevel;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showDescription?: boolean;
}

const readinessConfig = {
  not_ready: {
    label: "Not Ready",
    description: "This chapter requires significant work before examiner review",
    icon: AlertCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    iconColor: "text-red-500",
  },
  needs_revision: {
    label: "Needs Revision",
    description: "Minor improvements needed before examiner review",
    icon: Clock,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    iconColor: "text-amber-500",
  },
  supervisor_ready: {
    label: "Supervisor-Ready",
    description: "This chapter is ready for supervisor/examiner review",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    iconColor: "text-green-500",
  },
};

export default function ExaminerReadinessLabel({
  readiness,
  size = "md",
  showIcon = true,
  showDescription = false,
}: ExaminerReadinessLabelProps) {
  const config = readinessConfig[readiness];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div className="space-y-1">
      <Badge
        variant="outline"
        className={`${config.className} ${sizeClasses[size]} font-medium`}
      >
        {showIcon && <Icon className={`${iconSizes[size]} mr-1.5 ${config.iconColor}`} />}
        {config.label}
      </Badge>
      {showDescription && (
        <p className="text-xs text-muted-foreground pl-1">
          {config.description}
        </p>
      )}
    </div>
  );
}
