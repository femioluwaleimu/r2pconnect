import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Bot, Shield, CheckCircle, Sparkles, Zap } from "lucide-react";

type SupervisionMode = "ai_only" | "human_only" | "hybrid_ai_human";

interface SupervisionTypeSelectorProps {
  value: SupervisionMode;
  onChange: (mode: SupervisionMode) => void;
  hasSupervisors?: boolean;
  hasInstitutionSupervisors?: boolean;
  disabled?: boolean;
}

export default function SupervisionTypeSelector({
  value,
  onChange,
  hasSupervisors = false,
  hasInstitutionSupervisors,
  disabled = false,
}: SupervisionTypeSelectorProps) {
  const supervisorsAvailable = hasInstitutionSupervisors ?? hasSupervisors;
  const options = [
    {
      id: "hybrid_ai_human" as SupervisionMode,
      name: "Hybrid (Recommended)",
      description: "AI handles reviews, human supervisor has final authority",
      icon: Zap,
      badge: "Recommended",
      features: [
        "AI auto-scans chapters",
        "Human supervisor final approval",
        "Best of both worlds",
        "Institution approved",
      ],
      disabled: !supervisorsAvailable,
      disabledReason: "No supervisors available at your institution",
    },
    {
      id: "human_only" as SupervisionMode,
      name: "Human Supervisor Only",
      description: "Work with an assigned supervisor from your institution",
      icon: Users,
      features: [
        "Human guidance and mentorship",
        "Direct communication",
        "Official institutional approval",
        "Required for final submission",
      ],
      disabled: !supervisorsAvailable,
      disabledReason: "No supervisors available at your institution",
    },
    {
      id: "ai_only" as SupervisionMode,
      name: "AI Supervisor Only",
      description: "Get AI-powered guidance throughout your research",
      icon: Bot,
      badge: "Beta",
      features: [
        "Instant chapter feedback",
        "24/7 availability",
        "Not institution approved",
        "Cannot publish to marketplace",
      ],
      disabled: false,
    },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl border-b">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Shield className="w-5 h-5 text-primary" />
          Supervision Mode
          <Badge className="ml-2 bg-primary/10 text-primary border-primary/20">Required</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <RadioGroup
          value={value}
          onValueChange={(v) => onChange(v as SupervisionMode)}
          className="space-y-3"
          disabled={disabled}
        >
          {options.map((option) => {
            const Icon = option.icon;
            const isSelected = value === option.id;
            const isDisabled = option.disabled || disabled;

            return (
              <div key={option.id}>
                <RadioGroupItem
                  value={option.id}
                  id={`supervision-${option.id}`}
                  disabled={isDisabled}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`supervision-${option.id}`}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl flex-shrink-0 ${
                        isSelected ? "bg-primary/20" : "bg-muted"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          isSelected ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{option.name}</span>
                        {option.badge && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            {option.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </div>

                  <div className="sm:hidden flex flex-wrap gap-1.5 mt-1">
                    {option.features.map((feature, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <div className="w-1 h-1 rounded-full bg-primary/60" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {option.disabled && option.disabledReason && (
                    <Alert className="mt-2 py-2 border-amber-500/30 bg-amber-500/10">
                      <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
                        {option.disabledReason}
                      </AlertDescription>
                    </Alert>
                  )}
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        {value === "ai_only" && (
          <Alert className="mt-4 border-amber-500/20 bg-amber-500/5">
            <Bot className="w-4 h-4" />
            <AlertDescription className="text-sm">
              <strong>AI Advisory Mode</strong> — Your research will be labeled "Not Institution Approved" 
              and cannot be published to the Industry Marketplace. Consider Hybrid mode for full benefits.
            </AlertDescription>
          </Alert>
        )}

        {value === "hybrid_ai_human" && (
          <Alert className="mt-4 border-primary/20 bg-primary/5">
            <Zap className="w-4 h-4" />
            <AlertDescription className="text-sm">
              <strong>Hybrid Mode</strong> — AI handles chapter scoring, structure review, gap detection, 
              and methodology checks. Your human supervisor retains final authority on academic direction, 
              revision decisions, and approval.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
