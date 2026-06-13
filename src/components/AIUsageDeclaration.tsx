import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Brain, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AIUsageDeclarationProps {
  aiUsageDeclared: boolean | null;
  aiToolsUsed: string;
  onAiUsageChange: (declared: boolean) => void;
  onAiToolsChange: (tools: string) => void;
}

export default function AIUsageDeclaration({
  aiUsageDeclared,
  aiToolsUsed,
  onAiUsageChange,
  onAiToolsChange,
}: AIUsageDeclarationProps) {
  return (
    <Card className="rounded-2xl shadow-lg border-primary/20">
      <CardHeader className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-t-2xl border-b">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Brain className="w-5 h-5 text-violet-600" />
          AI Usage Declaration
          <Badge className="ml-2 bg-destructive/10 text-destructive border-destructive/20">
            Required
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="w-4 h-4" />
          <AlertDescription className="text-sm">
            Academic integrity requires disclosure of AI tool usage. This declaration is visible only to you and your supervisor.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Did you use AI tools (e.g., ChatGPT, Claude, Gemini) in preparing this research?
            <span className="text-destructive">*</span>
          </Label>
          <RadioGroup
            value={aiUsageDeclared === null ? "" : aiUsageDeclared ? "yes" : "no"}
            onValueChange={(value) => onAiUsageChange(value === "yes")}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="ai-yes" />
              <Label htmlFor="ai-yes" className="cursor-pointer">Yes, I used AI tools</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="ai-no" />
              <Label htmlFor="ai-no" className="cursor-pointer">No, I did not use AI tools</Label>
            </div>
          </RadioGroup>
        </div>

        {aiUsageDeclared && (
          <div className="space-y-2">
            <Label htmlFor="ai-tools" className="text-sm font-medium">
              Please specify which AI tools you used and how
              <span className="text-muted-foreground ml-1">(Optional but recommended)</span>
            </Label>
            <Textarea
              id="ai-tools"
              value={aiToolsUsed}
              onChange={(e) => onAiToolsChange(e.target.value)}
              placeholder="e.g., ChatGPT for grammar checking, Claude for literature search assistance..."
              rows={3}
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Describe how AI was used: brainstorming, drafting, editing, research, coding, etc.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
