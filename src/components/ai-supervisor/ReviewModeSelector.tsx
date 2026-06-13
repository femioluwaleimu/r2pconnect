import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, Zap, BookOpen, Telescope } from "lucide-react";

type ReviewMode = "quick" | "learning" | "advanced";

interface ReviewModeSelectorProps {
  value: ReviewMode;
  onChange: (mode: ReviewMode) => void;
  creditsRemaining: number;
}

export default function ReviewModeSelector({
  value,
  onChange,
  creditsRemaining,
}: ReviewModeSelectorProps) {
  const modes = [
    {
      id: "quick" as ReviewMode,
      name: "Quick Review",
      description: "High-level issues and key improvements",
      credits: 1,
      icon: Zap,
      features: ["Key issues identified", "Summary recommendations", "Fast turnaround"],
    },
    {
      id: "learning" as ReviewMode,
      name: "Learning Mode",
      description: "Detailed explanations with academic context",
      credits: 2,
      icon: BookOpen,
      features: [
        "Detailed explanations",
        "Why it matters academically",
        "Examiner expectations",
        "Generic examples",
      ],
    },
    {
      id: "advanced" as ReviewMode,
      name: "Advanced Mode",
      description: "Comprehensive 19-section deep analysis",
      credits: 3,
      icon: Telescope,
      features: [
        "Full structural & methodology audit",
        "Originality & critical thinking review",
        "AI confidence score & priority fixes",
        "Supervisor insight & next steps",
      ],
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Review Mode</Label>
        <Badge variant="outline" className="text-xs">
          <Sparkles className="w-3 h-3 mr-1" />
          {creditsRemaining} credits available
        </Badge>
      </div>

      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as ReviewMode)}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = value === mode.id;
          const canAfford = creditsRemaining >= mode.credits;

          return (
            <div key={mode.id}>
              <RadioGroupItem
                value={mode.id}
                id={mode.id}
                disabled={!canAfford}
                className="peer sr-only"
              />
              <Label
                htmlFor={mode.id}
                className={`flex flex-col h-full p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                } ${!canAfford ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isSelected ? "bg-primary/20" : "bg-muted"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isSelected ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <span className="font-semibold text-sm">{mode.name}</span>
                </div>

                <p className="text-xs text-muted-foreground mb-3">
                  {mode.description}
                </p>

                <div className="space-y-1 mb-3 flex-1">
                  {mode.features.map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <div className="w-1 h-1 rounded-full bg-primary/60" />
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1 text-xs">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="font-medium">{mode.credits} credit{mode.credits > 1 ? "s" : ""}</span>
                  </div>
                  {!canAfford && (
                    <Badge variant="destructive" className="text-xs">
                      Insufficient
                    </Badge>
                  )}
                </div>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
