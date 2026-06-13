import { useState, useEffect } from "react";
import IPNLayout from "@/components/layout/IPNLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, CheckCircle, XCircle, Clock, Loader2, MessageSquare, BadgeCheck, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatLagos } from "@/lib/dateUtils";

interface Application {
  id: string;
  applicant_name: string | null;
  applicant_email: string | null;
  status: string;
  created_at: string;
  cover_letter: string | null;
  employer_feedback: string | null;
  ipn_opportunities?: { title: string; ipn_companies?: { name: string } };
}

interface FeedbackMessage {
  id: string;
  sender_role: string;
  message: string;
  created_at: string;
}

export default function IPNApplicants() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [newFeedback, setNewFeedback] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    const { data } = await supabase
      .from("ipn_applications")
      .select("*, ipn_opportunities(title, ipn_companies(name))")
      .order("created_at", { ascending: false });
    setApplications((data || []) as any);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(true);
    await supabase.from("ipn_applications").update({ status }).eq("id", id);
    toast({ title: `Application ${status}` });
    fetchApplications();
    setActionLoading(false);
  };

  const loadFeedbackMessages = async (appId: string) => {
    setFeedbackLoading(true);
    try {
      const { data } = await supabase
        .from("job_feedback_messages")
        .select("id, sender_role, message, created_at")
        .eq("application_id", appId)
        .eq("application_type", "ipn")
        .order("created_at", { ascending: true });
      setFeedbackMessages((data || []) as FeedbackMessage[]);
    } catch {
      setFeedbackMessages([]);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const openAppDialog = (app: Application) => {
    setSelectedApp(app);
    setNewFeedback('');
    loadFeedbackMessages(app.id);
  };

  const sendFeedbackMessage = async () => {
    if (!newFeedback.trim() || !selectedApp) return;
    setSendingFeedback(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: inserted, error } = await supabase.from("job_feedback_messages").insert({
        application_id: selectedApp.id,
        application_type: "ipn",
        sender_id: user.id,
        sender_role: "employer",
        message: newFeedback.trim(),
      }).select("id").single();
      if (error) throw error;

      supabase.functions.invoke("send-job-feedback-notification", {
        body: { feedbackId: inserted.id },
      }).catch(console.error);

      setNewFeedback('');
      loadFeedbackMessages(selectedApp.id);
      toast({ title: "Feedback sent!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSendingFeedback(false);
    }
  };

  const pending = applications.filter(a => a.status === "pending");
  const shortlisted = applications.filter(a => a.status === "shortlisted");
  const rejected = applications.filter(a => a.status === "rejected");
  const hired = applications.filter(a => a.status === "hired");

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    shortlisted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    hired: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };

  const renderApplicationCard = (a: Application) => (
    <Card key={a.id} className="shadow-sm rounded-2xl border-border/50 hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="font-semibold text-foreground text-sm">{a.applicant_name || "Unknown"}</h3>
            <p className="text-xs text-muted-foreground">{a.applicant_email}</p>
            <p className="text-xs text-muted-foreground">
              Applied to: {(a as any).ipn_opportunities?.title} • {(a as any).ipn_opportunities?.ipn_companies?.name}
            </p>
            <p className="text-[10px] text-muted-foreground">{formatLagos(a.created_at)}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={statusColors[a.status] || ""}>{a.status}</Badge>
            <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 px-2" onClick={() => openAppDialog(a)}>
              <MessageSquare className="w-3 h-3 mr-1" />View & Feedback
            </Button>
            {a.status === "pending" && (
              <>
                <Button size="sm" variant="outline" className="rounded-xl gap-1 text-xs h-7 px-2" onClick={() => updateStatus(a.id, "shortlisted")}>
                  <CheckCircle className="w-3 h-3" /> Shortlist
                </Button>
                <Button size="sm" variant="ghost" className="rounded-xl text-destructive gap-1 text-xs h-7 px-2" onClick={() => updateStatus(a.id, "rejected")}>
                  <XCircle className="w-3 h-3" /> Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderList = (list: Application[]) =>
    list.length === 0 ? (
      <Card className="rounded-2xl"><CardContent className="p-12 text-center"><Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">No applicants in this category</p></CardContent></Card>
    ) : (
      <div className="space-y-3">{list.map(renderApplicationCard)}</div>
    );

  return (
    <IPNLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Applicants</h1>
          <p className="text-sm text-muted-foreground">View and manage applications across all opportunities</p>
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none rounded-2xl">
            <CardContent className="p-3"><div className="flex items-center justify-between"><div><p className="text-xl font-bold">{pending.length}</p><p className="text-xs opacity-80">Pending</p></div><Clock className="w-5 h-5 opacity-80" /></div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none rounded-2xl">
            <CardContent className="p-3"><div className="flex items-center justify-between"><div><p className="text-xl font-bold">{shortlisted.length}</p><p className="text-xs opacity-80">Shortlisted</p></div><CheckCircle className="w-5 h-5 opacity-80" /></div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none rounded-2xl">
            <CardContent className="p-3"><div className="flex items-center justify-between"><div><p className="text-xl font-bold">{hired.length}</p><p className="text-xs opacity-80">Hired</p></div><BadgeCheck className="w-5 h-5 opacity-80" /></div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-none rounded-2xl">
            <CardContent className="p-3"><div className="flex items-center justify-between"><div><p className="text-xl font-bold">{rejected.length}</p><p className="text-xs opacity-80">Rejected</p></div><XCircle className="w-5 h-5 opacity-80" /></div></CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="rounded-xl h-9 w-full sm:w-auto grid grid-cols-4 sm:flex">
              <TabsTrigger value="all" className="text-xs px-3 rounded-lg">All ({applications.length})</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs px-3 rounded-lg">Pending ({pending.length})</TabsTrigger>
              <TabsTrigger value="shortlisted" className="text-xs px-3 rounded-lg">Shortlisted ({shortlisted.length})</TabsTrigger>
              <TabsTrigger value="hired" className="text-xs px-3 rounded-lg">Hired ({hired.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">{renderList(applications)}</TabsContent>
            <TabsContent value="pending" className="mt-4">{renderList(pending)}</TabsContent>
            <TabsContent value="shortlisted" className="mt-4">{renderList(shortlisted)}</TabsContent>
            <TabsContent value="hired" className="mt-4">{renderList(hired)}</TabsContent>
          </Tabs>
        )}
      </div>

      {/* Detail + Feedback Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={() => { setSelectedApp(null); setNewFeedback(''); }}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Applicant Details</DialogTitle></DialogHeader>
          {selectedApp && (
            <div className="space-y-4 flex-1 min-h-0 overflow-y-auto">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Name:</span><span className="font-medium">{selectedApp.applicant_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span className="font-medium">{selectedApp.applicant_email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Position:</span><span className="font-medium">{(selectedApp as any).ipn_opportunities?.title}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><Badge className={statusColors[selectedApp.status] || ""}>{selectedApp.status}</Badge></div>
              </div>

              {selectedApp.cover_letter && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Cover Letter</p>
                  <div className="p-3 bg-muted/50 rounded-lg"><p className="text-sm whitespace-pre-wrap">{selectedApp.cover_letter}</p></div>
                </div>
              )}

              {/* Feedback Conversation */}
              <div className="space-y-3 pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><MessageSquare className="w-3 h-3" />Feedback Conversation</p>
                <ScrollArea className="max-h-[200px] pr-2">
                  {feedbackLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                  ) : feedbackMessages.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>
                  ) : (
                    <div className="space-y-2">
                      {feedbackMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender_role === "employer" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                            msg.sender_role === "employer" ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <p className={`text-[10px] mt-1 ${msg.sender_role === "employer" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{formatLagos(msg.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="flex gap-2">
                  <Textarea
                    value={newFeedback}
                    onChange={(e) => setNewFeedback(e.target.value)}
                    placeholder="Write feedback to applicant..."
                    className="rounded-xl text-sm min-h-[60px] flex-1"
                  />
                  <Button size="sm" className="rounded-xl self-end" disabled={sendingFeedback || !newFeedback.trim()} onClick={sendFeedbackMessage}>
                    {sendingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </IPNLayout>
  );
}
