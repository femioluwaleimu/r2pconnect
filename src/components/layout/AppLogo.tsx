import { useState } from "react";
import { APP_LOGO_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
}

export default function AppLogo({ className }: AppLogoProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  if (logoFailed) {
    return (
      <div className={cn("bg-primary flex items-center justify-center text-white font-bold text-sm", className)}>
        R2P
      </div>
    );
  }

  return (
    <img
      src={APP_LOGO_PATH}
      alt="R2P Connect logo"
      className={cn("bg-white object-contain", className)}
      onError={() => setLogoFailed(true)}
    />
  );
}
