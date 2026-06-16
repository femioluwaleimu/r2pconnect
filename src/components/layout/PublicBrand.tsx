import { Link } from "react-router-dom";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import AppLogo from "./AppLogo";

interface PublicBrandProps {
  compact?: boolean;
  inverted?: boolean;
  onClick?: () => void;
}

export default function PublicBrand({ compact = false, inverted = false, onClick }: PublicBrandProps) {
  const { platformName } = usePlatformSettings();

  return (
    <Link to="/" className="flex items-center gap-2" onClick={onClick}>
      <AppLogo className="w-10 h-10 rounded-xl shadow-lg overflow-hidden border border-border/40 flex-shrink-0" />
      <div>
        <span className={`font-bold ${inverted ? "text-white" : "text-foreground"} ${compact ? "" : "text-lg"}`}>
          {platformName || "R2P CONNECT"}
        </span>
        {!compact && (
          <span className={`block text-xs ${inverted ? "text-white/80" : "text-primary"}`}>Research2Practice</span>
        )}
      </div>
    </Link>
  );
}
