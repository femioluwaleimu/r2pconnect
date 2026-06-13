import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
  name?: string;
}

export function TypingIndicator({ className, name }: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      {name && (
        <span className="text-xs text-muted-foreground">{name} is typing...</span>
      )}
    </div>
  );
}
