import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  AlertCircle,
} from "lucide-react";

interface ChapterProgress {
  name: string;
  status: "not_started" | "in_progress" | "reviewed" | "approved";
  rating?: number;
  examinerReadiness?: "not_ready" | "needs_revision" | "supervisor_ready";
}

interface ChapterProgressTimelineProps {
  chapters: ChapterProgress[];
  currentChapter?: string;
}

const TIMELINE_CHAPTERS = [
  { key: "proposal", label: "Proposal" },
  { key: "chapter_1", label: "Chapter 1" },
  { key: "chapter_2", label: "Chapter 2" },
  { key: "chapter_3", label: "Chapter 3" },
  { key: "chapter_4", label: "Chapter 4" },
  { key: "chapter_5", label: "Chapter 5" },
];

export default function ChapterProgressTimeline({
  chapters,
  currentChapter,
}: ChapterProgressTimelineProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "reviewed":
        return <Clock className="w-5 h-5 text-amber-500" />;
      case "in_progress":
        return <FileText className="w-5 h-5 text-primary" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground/40" />;
    }
  };

  const getReadinessLabel = (readiness?: string) => {
    switch (readiness) {
      case "supervisor_ready":
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
            Supervisor-Ready
          </Badge>
        );
      case "needs_revision":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
            Needs Revision
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Not Ready
          </Badge>
        );
    }
  };

  const completedCount = chapters.filter(
    (c) => c.status === "approved" || c.status === "reviewed"
  ).length;
  const progressPercent = (completedCount / TIMELINE_CHAPTERS.length) * 100;

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Research Progress</span>
          <span className="text-muted-foreground">
            {completedCount} / {TIMELINE_CHAPTERS.length} chapters reviewed
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute left-[18px] top-8 bottom-8 w-0.5 bg-border" />

        <div className="space-y-1">
          {TIMELINE_CHAPTERS.map((tc, index) => {
            const chapter = chapters.find(
              (c) =>
                c.name.toLowerCase().includes(tc.key.replace("_", " ")) ||
                c.name.toLowerCase().includes(tc.label.toLowerCase())
            );
            const status = chapter?.status || "not_started";
            const isCurrent =
              currentChapter?.toLowerCase().includes(tc.label.toLowerCase());

            return (
              <div
                key={tc.key}
                className={`relative flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isCurrent
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="relative z-10 bg-background p-0.5 rounded-full">
                  {getStatusIcon(status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-medium ${
                        status === "not_started"
                          ? "text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {tc.label}
                    </span>
                    {chapter?.rating && (
                      <Badge variant="secondary" className="text-xs">
                        ★ {chapter.rating}/5
                      </Badge>
                    )}
                  </div>
                </div>

                {chapter?.examinerReadiness && (
                  <div className="flex-shrink-0">
                    {getReadinessLabel(chapter.examinerReadiness)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
