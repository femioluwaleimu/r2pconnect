import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { NO_INTERNET_CONNECTION_MESSAGE } from "@/lib/errorMessage";

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => (
    typeof navigator === "undefined" ? true : navigator.onLine
  ));

  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: NO_INTERNET_CONNECTION_MESSAGE,
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    };

    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Your internet connection has been restored.",
      });
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex justify-center px-3 py-2 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-lg">
        <WifiOff className="h-4 w-4" />
        <span>{NO_INTERNET_CONNECTION_MESSAGE}</span>
      </div>
    </div>
  );
}
