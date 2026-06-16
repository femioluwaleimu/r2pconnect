import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Users,
  Building2,
  Eye,
} from "lucide-react";

interface SupervisorRecord {
  id: string;
  user_id: string;
  institution_id: string | null;
  department: string | null;
  academic_rank: string | null;
  staff_id: string | null;
  verification_status: string | null;
  is_active: boolean;
  created_at: string;
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  institution_name: string | null;
  student_count: number;
}

type FilterTab = "all" | "pending_verification" | "verified" | "rejected";

const PENDING_SUPERVISOR_STATUSES = new Set(["pending", "pending_verification"]);

const isPendingSupervisor = (status: string | null) =>
  PENDING_SUPERVISOR_STATUSES.has(status || "");

export default function AdminSupervisors() {
  const [supervisors, setSupervisors] = useState<SupervisorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupervisor, setSelectedSupervisor] = useState<SupervisorRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    setLoading(true);
    const { data: sups } = await supabase
      .from("supervisors")
      .select("id, user_id, institution_id, department, academic_rank, staff_id, verification_status, is_active, created_at")
      .order("created_at", { ascending: false });

    if (!sups || sups.length === 0) {
      setSupervisors([]);
      setLoading(false);
      return;
    }

    const userIds = sups.map((s) => s.user_id);
    const instIds = [...new Set(sups.map((s) => s.institution_id).filter(Boolean))] as string[];

    const [profilesRes, instsRes, papersRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email, avatar_url").in("user_id", userIds),
      instIds.length > 0
        ? supabase.from("institutions").select("id, name").in("id", instIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("research_papers")
        .select("supervisor_id, author_id")
        .in("supervisor_id", userIds)
        .eq("research_type", "student"),
    ]);

    const profileMap = new Map(profilesRes.data?.map((p) => [p.user_id, p]) || []);
    const instMap = new Map((instsRes.data || []).map((i) => [i.id, i.name]));

    // Count unique students per supervisor
    const studentCountMap = new Map<string, Set<string>>();
    papersRes.data?.forEach((p) => {
      if (p.supervisor_id) {
        if (!studentCountMap.has(p.supervisor_id)) studentCountMap.set(p.supervisor_id, new Set());
        studentCountMap.get(p.supervisor_id)!.add(p.author_id);
      }
    });

    const records: SupervisorRecord[] = sups.map((s) => ({
      ...s,
      profile: profileMap.get(s.user_id) || null,
      institution_name: s.institution_id ? instMap.get(s.institution_id) || null : null,
      student_count: studentCountMap.get(s.user_id)?.size || 0,
    }));

    setSupervisors(records);
    setLoading(false);
  };

  const handleVerify = async (sup: SupervisorRecord) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("supervisors")
      .update({ verification_status: "verified", is_active: true })
      .eq("id", sup.id);

    if (!error) {
      await supabase.from("supervisor_activity_logs").insert({
        supervisor_id: sup.user_id,
        action_type: "verified_by_admin",
        details: `Verified at ${new Date().toISOString()}`,
      });

      await supabase.from("notifications").insert({
        user_id: sup.user_id,
        title: "Supervisor Account Verified",
        message: "Your supervisor account has been verified and is now active.",
        type: "success",
      });

      toast({ title: "Supervisor Verified", description: `${sup.profile?.full_name} is now verified and active.` });
      fetchSupervisors();
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setActionLoading(false);
    setSelectedSupervisor(null);
  };

  const handleReject = async (sup: SupervisorRecord) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("supervisors")
      .update({ verification_status: "rejected", is_active: false })
      .eq("id", sup.id);

    if (!error) {
      await supabase.from("supervisor_activity_logs").insert({
        supervisor_id: sup.user_id,
        action_type: "rejected_by_admin",
        details: rejectionReason || "No reason provided",
      });

      // Notify the supervisor
      await supabase.from("notifications").insert({
        user_id: sup.user_id,
        title: "Supervisor Verification Rejected",
        message: rejectionReason || "Your supervisor verification was rejected. Please contact support.",
        type: "error",
      });

      toast({ title: "Supervisor Rejected", description: `${sup.profile?.full_name} has been rejected.` });
      fetchSupervisors();
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setActionLoading(false);
    setRejectionReason("");
    setSelectedSupervisor(null);
  };

  const getStatusBadge = (status: string | null) => {
    const normalizedStatus = status || "verified";
    if (isPendingSupervisor(normalizedStatus)) {
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }

    switch (normalizedStatus) {
      case "verified":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{normalizedStatus}</Badge>;
    }
  };

  const filtered = supervisors.filter((s) => {
    const status = s.verification_status || "verified";
    const matchesTab =
      filterTab === "all" ||
      status === filterTab ||
      (filterTab === "pending_verification" && isPendingSupervisor(status));
    const matchesSearch =
      !searchQuery ||
      s.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const stats = {
    total: supervisors.length,
    pending: supervisors.filter((s) => isPendingSupervisor(s.verification_status)).length,
    verified: supervisors.filter((s) => (s.verification_status || "verified") === "verified").length,
    rejected: supervisors.filter((s) => s.verification_status === "rejected").length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Supervisor Verification</h1>
          <p className="text-muted-foreground">Review and verify supervisor registrations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, icon: GraduationCap, color: "from-indigo-500 to-purple-600" },
            { label: "Pending", value: stats.pending, icon: Clock, color: "from-amber-500 to-orange-600" },
            { label: "Verified", value: stats.verified, icon: CheckCircle, color: "from-emerald-500 to-green-600" },
            { label: "Rejected", value: stats.rejected, icon: XCircle, color: "from-red-500 to-rose-600" },
          ].map((stat) => (
            <Card key={stat.label} className="rounded-2xl border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search supervisors..."
              className="rounded-xl pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as FilterTab)}>
          <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-flex">
            <TabsTrigger value="all" className="rounded-xl text-xs sm:text-sm">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="pending_verification" className="rounded-xl text-xs sm:text-sm">Pending ({stats.pending})</TabsTrigger>
            <TabsTrigger value="verified" className="rounded-xl text-xs sm:text-sm">Verified ({stats.verified})</TabsTrigger>
            <TabsTrigger value="rejected" className="rounded-xl text-xs sm:text-sm">Rejected ({stats.rejected})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* List */}
        <Card className="rounded-2xl border-0 shadow-lg">
          <CardContent className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No supervisors found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((sup) => (
                  <div key={sup.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src={sup.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {sup.profile?.full_name?.charAt(0) || "S"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{sup.profile?.full_name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground truncate">{sup.profile?.email}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {sup.institution_name && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> {sup.institution_name}
                            </span>
                          )}
                          {sup.department && (
                            <span className="text-xs text-muted-foreground">• {sup.department}</span>
                          )}
                          {sup.academic_rank && (
                            <span className="text-xs text-muted-foreground">• {sup.academic_rank}</span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" /> {sup.student_count} students
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(sup.verification_status)}
                      {isPendingSupervisor(sup.verification_status) && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleVerify(sup)}
                            disabled={actionLoading}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => {
                              setSelectedSupervisor(sup);
                              setRejectionReason("");
                            }}
                            disabled={actionLoading}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                      {sup.verification_status === "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => handleVerify(sup)}
                          disabled={actionLoading}
                        >
                          Re-verify
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={!!selectedSupervisor} onOpenChange={() => setSelectedSupervisor(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reject Supervisor</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedSupervisor?.profile?.full_name}'s verification.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="rounded-xl"
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" className="rounded-xl" onClick={() => setSelectedSupervisor(null)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              onClick={() => selectedSupervisor && handleReject(selectedSupervisor)}
              disabled={actionLoading}
            >
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
