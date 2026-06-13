import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, UserCheck } from "lucide-react";

interface EthicsBannerProps {
  variant?: "default" | "compact";
}

export default function EthicsBanner({ variant = "default" }: EthicsBannerProps) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground">
        <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span>AI guidance is advisory. Final academic decisions remain with the supervisor.</span>
      </div>
    );
  }

  return (
    <Alert className="border-primary/20 bg-primary/5">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-primary/10 mt-0.5">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div className="space-y-1">
          <AlertDescription className="text-sm font-medium text-foreground">
            AI Guidance Notice
          </AlertDescription>
          <AlertDescription className="text-sm text-muted-foreground">
            AI-generated feedback is advisory only. It is designed to assist your learning 
            and preparation but does <strong>not replace</strong> human supervision. 
            Final academic decisions and approvals remain with your assigned supervisor.
          </AlertDescription>
          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Your supervisor has final authority on all academic matters</span>
          </div>
        </div>
      </div>
    </Alert>
  );
}
