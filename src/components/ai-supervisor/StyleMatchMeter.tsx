import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, CheckCircle } from "lucide-react";

interface StyleMatchMeterProps {
  score: number; // 0-100
  styleName?: string;
}

export default function StyleMatchMeter({ score, styleName = "Selected Style" }: StyleMatchMeterProps) {
  const getScoreColor = () => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getProgressColor = () => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  const getStatusIcon = () => {
    if (score >= 80) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (score >= 60) return <Sparkles className="w-4 h-4 text-amber-500" />;
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  const getStatusLabel = () => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    if (score >= 40) return "Fair Match";
    return "Needs Improvement";
  };

  return (
    <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">Style Match</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {styleName}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className={`text-2xl font-bold ${getScoreColor()}`}>
            {score}%
          </span>
          <span className="text-xs text-muted-foreground">
            {getStatusLabel()}
          </span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 ${getProgressColor()} transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {score >= 80
          ? "Your chapter aligns well with the expected academic style."
          : score >= 60
          ? "Some adjustments may improve style alignment."
          : "Consider reviewing the structure and formatting guidelines."}
      </p>
    </div>
  );
}
