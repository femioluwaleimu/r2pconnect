import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatLagos } from "@/lib/dateUtils";

interface Institution {
  id: string;
  name: string;
}

interface RegistrationEntry {
  user_id: string;
  full_name: string;
  department: string | null;
  created_at: string;
}

export default function InstitutionRegistrations() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<string>("all");
  const [registrations, setRegistrations] = useState<RegistrationEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInstitutions();
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [selectedInstitution]);

  const fetchInstitutions = async () => {
    const { data } = await supabase
      .from("institutions")
      .select("id, name")
      .order("name");
    if (data) setInstitutions(data);
  };

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("user_id, full_name, department, created_at, institution_id")
        .order("created_at", { ascending: false })
        .limit(50);

      if (selectedInstitution !== "all") {
        query = query.eq("institution_id", selectedInstitution);
      } else {
        query = query.not("institution_id", "is", null);
      }

      const { data } = await query;
      setRegistrations(data || []);
    } finally {
      setLoading(false);
    }
  };

  const selectedName = institutions.find(i => i.id === selectedInstitution)?.name;

  return (
    <Card className="shadow-card rounded-2xl border-border/50">
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Registrations by Institution
        </CardTitle>
        <Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
          <SelectTrigger className="w-56 rounded-xl">
            <SelectValue placeholder="Filter by institution" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Institutions</SelectItem>
            {institutions.map((inst) => (
              <SelectItem key={inst.id} value={inst.id}>
                {inst.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedInstitution === "all"
                ? "No institution-linked registrations found."
                : `No registrations found for ${selectedName || "this institution"}.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {registrations.map((reg) => (
              <div
                key={reg.user_id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {reg.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{reg.full_name}</p>
                    {reg.department && (
                      <Badge variant="outline" className="text-xs rounded-full mt-0.5">
                        {reg.department}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatLagos(reg.created_at, "full")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
