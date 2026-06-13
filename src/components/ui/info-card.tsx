import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoCardProps {
  icon: LucideIcon;
  title: string;
  items?: string[];
  description?: string;
  iconColor?: string;
  className?: string;
}

export function InfoCard({
  icon: Icon,
  title,
  items,
  description,
  iconColor = "text-amber-500",
  className,
}: InfoCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 p-4 md:p-5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", iconColor)} />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm md:text-base mb-2">
            {title}
          </h4>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {items && items.length > 0 && (
            <ul className="space-y-1.5">
              {items.map((item, idx) => (
                <li
                  key={idx}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-muted-foreground/60 mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
