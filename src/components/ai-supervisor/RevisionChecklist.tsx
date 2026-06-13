import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ClipboardList,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RevisionItem {
  id: string;
  text: string;
  completed: boolean;
}

interface RevisionChecklistProps {
  chapterName: string;
  requiredFixes: string[];
  optionalImprovements: string[];
  onExport?: () => void;
}

export default function RevisionChecklist({
  chapterName,
  requiredFixes,
  optionalImprovements,
}: RevisionChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const requiredCompleted = requiredFixes.filter((_, i) =>
    checkedItems.has(`required-${i}`)
  ).length;
  const optionalCompleted = optionalImprovements.filter((_, i) =>
    checkedItems.has(`optional-${i}`)
  ).length;

  const allRequiredDone = requiredCompleted === requiredFixes.length;
  const progress =
    requiredFixes.length > 0
      ? Math.round((requiredCompleted / requiredFixes.length) * 100)
      : 100;

  const generateExportText = () => {
    let text = `AI PRE-SUPERVISOR REVIEW REPORT\n`;
    text += `${chapterName}\n`;
    text += `Generated: ${new Date().toLocaleDateString()}\n`;
    text += `${"=".repeat(60)}\n\n`;

    text += `REQUIRED FIXES (${requiredCompleted}/${requiredFixes.length} completed)\n`;
    text += `${"-".repeat(40)}\n`;
    requiredFixes.forEach((fix, i) => {
      const status = checkedItems.has(`required-${i}`) ? "[✓]" : "[ ]";
      text += `${status} ${fix}\n\n`;
    });

    if (optionalImprovements.length > 0) {
      text += `\nOPTIONAL IMPROVEMENTS (${optionalCompleted}/${optionalImprovements.length} completed)\n`;
      text += `${"-".repeat(40)}\n`;
      optionalImprovements.forEach((imp, i) => {
        const status = checkedItems.has(`optional-${i}`) ? "[✓]" : "[ ]";
        text += `${status} ${imp}\n\n`;
      });
    }

    text += `\n${"=".repeat(60)}\n`;
    text += `Note: This is an AI-generated checklist. Final academic\n`;
    text += `decisions remain with your supervisor.\n`;

    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateExportText());
    toast({ title: "Checklist copied to clipboard" });
  };

  const handleDownload = () => {
    const text = generateExportText();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chapterName.replace(/[^a-zA-Z0-9]/g, "_")}_Revision_Checklist.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Checklist downloaded" });
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Revision Checklist</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track your progress on required changes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={allRequiredDone ? "default" : "secondary"}
              className={allRequiredDone ? "bg-green-600" : ""}
            >
              {progress}% Complete
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              allRequiredDone ? "bg-green-500" : "bg-primary"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Required Fixes */}
        {requiredFixes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold">
                Required Fixes ({requiredCompleted}/{requiredFixes.length})
              </span>
            </div>
            <div className="space-y-2 pl-6">
              {requiredFixes.map((fix, i) => {
                const id = `required-${i}`;
                const isChecked = checkedItems.has(id);
                return (
                  <div
                    key={id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      isChecked
                        ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                        : "bg-muted/30 border-border/50 hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      id={id}
                      checked={isChecked}
                      onCheckedChange={() => toggleItem(id)}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={id}
                      className={`text-sm cursor-pointer leading-relaxed ${
                        isChecked ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {fix}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Optional Improvements */}
        {optionalImprovements.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold">
                  Optional Improvements ({optionalCompleted}/{optionalImprovements.length})
                </span>
              </div>
              <div className="space-y-2 pl-6">
                {optionalImprovements.map((imp, i) => {
                  const id = `optional-${i}`;
                  const isChecked = checkedItems.has(id);
                  return (
                    <div
                      key={id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        isChecked
                          ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                          : "bg-muted/30 border-border/50 hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        id={id}
                        checked={isChecked}
                        onCheckedChange={() => toggleItem(id)}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={id}
                        className={`text-sm cursor-pointer leading-relaxed ${
                          isChecked ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {imp}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Export Buttons */}
        <Separator />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1">
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
