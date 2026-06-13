import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, Building2, GraduationCap } from "lucide-react";

interface ResearchCredentialLabelProps {
  institutionId: string | null;
  supervisorId: string | null;
  department?: string | null;
  compact?: boolean;
}

export default function ResearchCredentialLabel({
  institutionId,
  supervisorId,
  department,
  compact = false,
}: ResearchCredentialLabelProps) {
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [supervisorName, setSupervisorName] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (institutionId) {
        const { data } = await supabase
          .from("institutions")
          .select("name, is_verified")
          .eq("id", institutionId)
          .maybeSingle();
        if (data) {
          setInstitutionName(data.name);
          setIsVerified(data.is_verified ?? false);
        }
      }
      if (supervisorId) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", supervisorId)
          .maybeSingle();
        if (data) setSupervisorName(data.full_name);
      }
    };
    fetch();
  }, [institutionId, supervisorId]);

  if (!institutionId && !supervisorId) return null;

  if (compact) {
    return isVerified ? (
      <Badge variant="secondary" className="rounded-full text-xs gap-1">
        <Shield className="w-3 h-3 text-emerald-600" />
        {institutionName || "Verified"}
      </Badge>
    ) : institutionId ? (
      <Badge variant="outline" className="rounded-full text-xs gap-1 text-amber-600 border-amber-300">
        <ShieldAlert className="w-3 h-3" />
        Unverified
      </Badge>
    ) : null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {isVerified ? (
        <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 rounded-full gap-1.5 px-3 py-1">
          <Shield className="w-3.5 h-3.5" />
          Verified
        </Badge>
      ) : institutionId ? (
        <Badge variant="outline" className="rounded-full gap-1.5 px-3 py-1 text-amber-600 border-amber-300 dark:border-amber-700">
          <ShieldAlert className="w-3.5 h-3.5" />
          Unverified Institution
        </Badge>
      ) : null}

      {department && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Building2 className="w-3.5 h-3.5" />
          {department}
        </span>
      )}

      {institutionName && (
        <span className="text-muted-foreground">
          {department ? "•" : ""} {institutionName}
        </span>
      )}

      {supervisorName && (
        <span className="flex items-center gap-1 text-muted-foreground">
          • <GraduationCap className="w-3.5 h-3.5" />
          {supervisorName}
        </span>
      )}
    </div>
  );
}
