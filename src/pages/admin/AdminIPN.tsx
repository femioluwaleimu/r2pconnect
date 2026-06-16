import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Search, CheckCircle, Clock, XCircle, FileText, Eye, ShieldCheck, ShieldX, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatLagos } from "@/lib/dateUtils";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyAmount, toNumber } from "@/lib/numberFormat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface IPNUser {
  id: string;
  user_id: string;
  company_name: string;
  phone: string | null;
  location: string | null;
  means_of_identification: string | null;
  what_do_you_do: string | null;
  created_at: string;
  activation?: {
    status: string;
    payment_amount: number | null;
    payment_reference: string | null;
    activated_at: string | null;
    id_document_url: string | null;
    rejection_reason: string | null;
  } | null;
  email?: string;
}

export default function AdminIPN() {
  const [ipnUsers, setIpnUsers] = useState<IPNUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectUserId, setRejectUserId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { toast } = useToast();

  useEffect(() => { fetchIPNUsers(); }, []);

  const fetchIPNUsers = async () => {
    const { data: profiles } = await supabase
      .from("ipn_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!profiles) { setLoading(false); return; }

    const userIds = profiles.map(p => p.user_id);
    const { data: activations } = await supabase
      .from("ipn_activations")
      .select("*")
      .in("user_id", userIds);

    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const activation = activations?.find(a => a.user_id === p.user_id) || null;
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", p.user_id)
          .maybeSingle();
        return {
          ...p,
          activation: activation ? {
            ...activation,
            payment_amount: activation.payment_amount == null ? null : toNumber(activation.payment_amount),
          } : null,
          email: profile?.email || "",
        };
      })
    );

    setIpnUsers(enriched);
    setLoading(false);
  };

  const viewDocument = async (path: string) => {
    const { data } = await supabase.storage
      .from("ipn-documents")
      .createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleAccept = async (userId: string) => {
    setActionLoading(userId);
    await supabase
      .from("ipn_activations")
      .update({ status: "activated", activated_at: new Date().toISOString(), rejection_reason: null })
      .eq("user_id", userId);

    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Account Activated!",
      message: "Your IPN account has been verified and activated. You now have full access.",
      type: "success",
    });

    // Send email to IPN user
    const user = ipnUsers.find(u => u.user_id === userId);
    if (user?.email) {
      await supabase.functions.invoke("send-email", {
        body: {
          type: "ipn_id_accepted",
          to: user.email,
          data: { name: user.company_name },
        },
      });
    }

    toast({ title: "IPN user activated" });
    setActionLoading(null);
    fetchIPNUsers();
  };

  const handleReject = async () => {
    if (!rejectUserId) return;
    setActionLoading(rejectUserId);

    await supabase
      .from("ipn_activations")
      .update({ status: "rejected", rejection_reason: rejectReason || "ID document not valid" })
      .eq("user_id", rejectUserId);

    await supabase.from("notifications").insert({
      user_id: rejectUserId,
      title: "ID Verification Rejected",
      message: rejectReason || "Your ID document was rejected. Please re-upload a valid ID.",
      type: "warning",
    });

    // Send email to IPN user
    const user = ipnUsers.find(u => u.user_id === rejectUserId);
    if (user?.email) {
      await supabase.functions.invoke("send-email", {
        body: {
          type: "ipn_id_rejected",
          to: user.email,
          data: { name: user.company_name, reason: rejectReason || "ID document not valid" },
        },
      });
    }

    toast({ title: "IPN user ID rejected" });
    setActionLoading(null);
    setRejectDialogOpen(false);
    setRejectReason("");
    setRejectUserId(null);
    fetchIPNUsers();
  };

  const filtered = ipnUsers.filter(u =>
    u.company_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.what_do_you_do?.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status?: string) => {
    if (status === "activated") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none rounded-full">Activated</Badge>;
    if (status === "pending_review") return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-none rounded-full">Pending Review</Badge>;
    if (status === "pending_payment") return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-none rounded-full">Pending Payment</Badge>;
    if (status === "rejected") return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-none rounded-full">Rejected</Badge>;
    return <Badge className="bg-muted text-muted-foreground border-none rounded-full">Not Started</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">IPN Management</h1>
          <p className="text-muted-foreground">View and manage Industry Partner Network users</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="rounded-2xl shadow-card border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{ipnUsers.length}</p>
                  <p className="text-xs text-muted-foreground">Total IPN Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-card border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{ipnUsers.filter(u => u.activation?.status === "activated").length}</p>
                  <p className="text-xs text-muted-foreground">Activated</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-card border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrencyAmount(ipnUsers.reduce((sum, u) => sum + toNumber(u.activation?.payment_amount), 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Activation Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl shadow-card"><CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No IPN users found</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => (
              <Card key={u.id} className="rounded-2xl shadow-card border-border/50">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{u.company_name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        {u.what_do_you_do && <p className="text-xs text-muted-foreground truncate">{u.what_do_you_do}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {statusBadge(u.activation?.status)}
                      {u.activation?.payment_amount && Number(u.activation.payment_amount) > 0 && (
                        <Badge variant="outline" className="rounded-full text-xs">{formatCurrencyAmount(u.activation.payment_amount)}</Badge>
                      )}
                      {u.activation?.id_document_url && (
                        <Button variant="ghost" size="sm" className="rounded-xl text-xs gap-1" onClick={() => viewDocument(u.activation!.id_document_url!)}>
                          <Eye className="w-3 h-3" /> View ID
                        </Button>
                      )}
                      {/* Accept/Reject buttons for pending_review */}
                      {u.activation?.status === "pending_review" && (
                        <>
                          <Button
                            size="sm"
                            className="rounded-xl text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleAccept(u.user_id)}
                            disabled={actionLoading === u.user_id}
                          >
                            {actionLoading === u.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="rounded-xl text-xs gap-1"
                            onClick={() => { setRejectUserId(u.user_id); setRejectDialogOpen(true); }}
                            disabled={actionLoading === u.user_id}
                          >
                            <ShieldX className="w-3 h-3" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {u.location && <span>📍 {u.location}</span>}
                    {u.phone && <span>📞 {u.phone}</span>}
                    {u.means_of_identification && <span>🪪 NIN: {u.means_of_identification}</span>}
                    <span>📅 Joined {formatLagos(u.created_at)}</span>
                    {u.activation?.activated_at && <span>✅ Activated {formatLagos(u.activation.activated_at)}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reject ID Document</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional but recommended)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="rounded-xl"
            rows={3}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleReject} disabled={actionLoading !== null}>
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Reject ID
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
