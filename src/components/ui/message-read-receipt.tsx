import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageReadReceiptProps {
  isRead: boolean;
  readAt?: string | null;
  className?: string;
}

export function MessageReadReceipt({ isRead, readAt, className }: MessageReadReceiptProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      {isRead ? (
        <CheckCheck className="w-3.5 h-3.5 text-primary" />
      ) : (
        <Check className="w-3.5 h-3.5 opacity-60" />
      )}
    </span>
  );
}
