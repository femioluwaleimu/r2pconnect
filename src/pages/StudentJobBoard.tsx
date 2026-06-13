import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase, FileText, CheckCircle, XCircle, AlertCircle,
  Loader2, Clock, Building2, GraduationCap, Calendar,
  ExternalLink, MessageSquare, ArrowRight, BadgeCheck, Send
} from "lucide-react";
import { formatLagos } from "@/lib/dateUtils";

interface ApplicationWithJob {
  id: string;
  job_id: string;
  status: string;
  rejection_reason: string | null;
  employer_feedback: string | null;
  cover_letter: string | null;
  created_at: string;
  student_level: string | null;
  source?: string;
  job_postings: {
    title: string;
    job_type: string;
    company_name: string | null;
    company_city: string | null;
    company_location: string | null;
    deadline: string | null;
    duration: string | null;
    payment_amount: number | null;
    payment_currency: string | null;
  };
}

interface FeedbackMessage {
  id: string;
  sender_role: string;
  message: string;
  created_at: string;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  part_time: "Part-time",
  "part-time": "Part-time",
  "full-time": "Full-time",
  siwes: "SIWES",
  industrial_training: "Industrial Training",
  internship: "Internship",
  contract: "Contract",
  freelance: "Freelance",
};

export default function StudentJobBoard() {
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackApp, setFeedbackApp] = useState<ApplicationWithJob | null>(null);
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
    handlePaystackReturn();
  }, []);

  const safeMessage = (error: any, fallback: string) => {
    if (!error) return fallback;
    if (typeof error.message === "string") return error.message;
    if (typeof error.error === "string") return error.error;
    return fallback;
  };

  const fetchApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch direct job applications
      let { data: directData, error: directError } = await supabase
        .from("job_applications")
        .select("id, job_id, status, rejection_reason, employer_feedback, cover_letter, created_at, student_level")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (directError) {
        const fallback = await supabase
          .from("job_applications")
          .select("id, job_id, status, cover_letter, created_at")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false });

        directData = fallback.data;
        directError = fallback.error;
      }

      if (directError) throw new Error(safeMessage(directError, "Unable to load your job applications"));

      const directJobIds = [...new Set((directData || []).map((a: any) => a.job_id).filter(Boolean))];
      let { data: directJobs, error: directJobsError } = directJobIds.length
        ? await supabase
            .from("job_postings")
            .select("id, title, job_type, company_name, company_city, company_location, deadline, duration, payment_amount, payment_currency")
            .in("id", directJobIds)
        : { data: [], error: null };

      if (directJobsError && directJobIds.length) {
        const fallback = await supabase
          .from("job_postings")
          .select("id, title, job_type, company_name")
          .in("id", directJobIds);

        directJobs = fallback.data;
        directJobsError = fallback.error;
      }

      if (directJobsError) throw new Error(safeMessage(directJobsError, "Unable to load job posting details"));

      const directJobMap = new Map((directJobs || []).map((job: any) => [job.id, job]));
      const directApps = (directData || []).map((a: any) => ({
        ...a,
        rejection_reason: a.rejection_reason || null,
        employer_feedback: a.employer_feedback || null,
        student_level: a.student_level || null,
        source: "direct",
        job_postings: directJobMap.get(a.job_id) || {
          title: "Job Posting",
          job_type: "internship",
          company_name: null,
          company_city: null,
          company_location: null,
          deadline: null,
          duration: null,
          payment_amount: null,
          payment_currency: null,
        },
      }));

      // Fetch IPN applications
      let { data: ipnData, error: ipnError } = await supabase
        .from("ipn_applications")
        .select("id, opportunity_id, status, cover_letter, created_at, applicant_name, employer_feedback")
        .eq("applicant_id", user.id)
        .order("created_at", { ascending: false });

      if (ipnError) {
        const fallback = await supabase
          .from("ipn_applications")
          .select("id, opportunity_id, status, cover_letter, created_at")
          .eq("applicant_id", user.id)
          .order("created_at", { ascending: false });

        ipnData = fallback.data || [];
        ipnError = fallback.error;
      }

      // For IPN apps, fetch opportunity details
      const ipnApps: ApplicationWithJob[] = [];
      if (!ipnError) for (const ipnApp of (ipnData || [])) {
        let { data: opp, error: oppError } = await supabase
          .from("ipn_opportunities")
          .select("title, job_type, location, duration, work_mode, company_id")
          .eq("id", ipnApp.opportunity_id)
          .maybeSingle();

        if (oppError) {
          const fallback = await supabase
            .from("ipn_opportunities")
            .select("title, job_type, location")
            .eq("id", ipnApp.opportunity_id)
            .maybeSingle();

          opp = fallback.data;
        }

        let companyName: string | null = null;
        if (opp?.company_id) {
          const { data: comp } = await supabase
            .from("ipn_companies")
            .select("name")
            .eq("id", opp.company_id)
            .maybeSingle();
          companyName = comp?.name || null;
        }

        ipnApps.push({
          id: ipnApp.id,
          job_id: ipnApp.opportunity_id,
          status: ipnApp.status || "pending",
          rejection_reason: null,
          employer_feedback: (ipnApp as any).employer_feedback || null,
          cover_letter: ipnApp.cover_letter,
          created_at: ipnApp.created_at,
          student_level: null,
          source: "ipn",
          job_postings: {
            title: opp?.title || "IPN Opportunity",
            job_type: opp?.job_type || "internship",
            company_name: companyName,
            company_city: opp?.location || null,
            company_location: opp?.location || null,
            deadline: null,
            duration: opp?.duration || null,
            payment_amount: null,
            payment_currency: null,
          },
        });
      }

      // Merge and sort by created_at desc
      const allApps = [...directApps, ...ipnApps].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setApplications(allApps);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackReturn = async () => {
    const params = new URLSearchParams(window.location.search);
    const paymentRef = params.get("reference") || params.get("trxref");
    const pendingStr = localStorage.getItem("pending_job_application");

    if (paymentRef && pendingStr) {
      const pending = JSON.parse(pendingStr);
      localStorage.removeItem("pending_job_application");

      try {
        const { data, error } = await supabase.functions.invoke("paystack", {
          body: { action: "verify_job_application", reference: paymentRef },
        });
        if (error || !data?.success) throw new Error(data?.message || "Payment verification failed");

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const isIpn = pending.source === "ipn";

        if (isIpn) {
          const { data: prof } = await supabase.from("profiles").select("full_name, email").eq("user_id", user.id).maybeSingle();
          const { error: insertError } = await supabase.from("ipn_applications").insert({
            opportunity_id: pending.real_id,
            applicant_id: user.id,
            applicant_name: prof?.full_name || null,
            applicant_email: prof?.email || null,
            cover_letter: pending.cover_letter || null,
            cv_url: pending.cv_url || null,
            payment_reference: paymentRef,
          });
          if (insertError) throw insertError;
        } else {
          const { data: studentProfile } = await supabase
            .from("profiles")
            .select("full_name, level, institution_id, avatar_url")
            .eq("user_id", user.id)
            .maybeSingle();

          let institutionName: string | null = null;
          if (studentProfile?.institution_id) {
            const { data: inst } = await supabase.from("institutions").select("name").eq("id", studentProfile.institution_id).maybeSingle();
            institutionName = inst?.name || null;
          }

          const realJobId = pending.real_id || pending.job_id;
          const { error: insertError } = await supabase.from("job_applications").insert({
            job_id: realJobId,
            student_id: user.id,
            cover_letter: pending.cover_letter || null,
            cv_url: pending.cv_url || null,
            student_name: studentProfile?.full_name || null,
            student_level: pending.selected_level || studentProfile?.level || null,
            student_institution_id: studentProfile?.institution_id || null,
            student_institution_name: institutionName,
            student_avatar_url: studentProfile?.avatar_url || null,
          });
          if (insertError) throw insertError;
        }

        toast({ title: "Payment confirmed & application submitted!" });
        fetchApplications();
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const openFeedbackDialog = async (app: ApplicationWithJob) => {
    setFeedbackApp(app);
    setReplyText("");
    setFeedbackLoading(true);
    try {
      const appType = app.source === "ipn" ? "ipn" : "direct";
      const { data } = await supabase
        .from("job_feedback_messages")
        .select("id, sender_role, message, created_at")
        .eq("application_id", app.id)
        .eq("application_type", appType)
        .order("created_at", { ascending: true });
      setFeedbackMessages((data || []) as FeedbackMessage[]);
    } catch {
      setFeedbackMessages([]);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !feedbackApp) return;
    setSendingReply(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const appType = feedbackApp.source === "ipn" ? "ipn" : "direct";
      const { data: inserted, error } = await supabase.from("job_feedback_messages").insert({
        application_id: feedbackApp.id,
        application_type: appType,
        sender_id: user.id,
        sender_role: "applicant",
        message: replyText.trim(),
      }).select("id").single();
      if (error) throw error;

      // Trigger notification
      supabase.functions.invoke("send-job-feedback-notification", {
        body: { feedbackId: inserted.id },
      }).catch(console.error);

      setReplyText("");
      // Refresh messages
      const { data: msgs } = await supabase
        .from("job_feedback_messages")
        .select("id, sender_role, message, created_at")
        .eq("application_id", feedbackApp.id)
        .eq("application_type", appType)
        .order("created_at", { ascending: true });
      setFeedbackMessages((msgs || []) as FeedbackMessage[]);
      toast({ title: "Reply sent!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSendingReply(false);
    }
  };

  const pending = applications.filter((a) => a.status === "pending");
  const approved = applications.filter((a) => a.status === "approved" || a.status === "hired" || a.status === "shortlisted");
  const rejected = applications.filter((a) => a.status === "rejected");

  const getStatusBadge = (status: string) => {
    const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      pending: { color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: <Clock className="w-3 h-3" />, label: "Pending" },
      shortlisted: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: <CheckCircle className="w-3 h-3" />, label: "Shortlisted" },
      approved: { color: "bg-green-500/10 text-green-600 border-green-500/20", icon: <CheckCircle className="w-3 h-3" />, label: "Approved" },
      hired: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: <BadgeCheck className="w-3 h-3" />, label: "Hired" },
      rejected: { color: "bg-red-500/10 text-red-600 border-red-500/20", icon: <XCircle className="w-3 h-3" />, label: "Rejected" },
    };
    const v = map[status] || map.pending;
    return <Badge className={`${v.color} border flex items-center gap-1`}>{v.icon} {v.label}</Badge>;
  };

  const ApplicationCard = ({ app }: { app: ApplicationWithJob }) => (
    <Card className="rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm truncate">{app.job_postings?.title}</h3>
              <Badge variant="outline" className="text-[10px]">
                {JOB_TYPE_LABELS[app.job_postings?.job_type] || app.job_postings?.job_type}
              </Badge>
              {(app.job_postings as any)?.work_mode && (
                <Badge variant="secondary" className="text-[10px]">{(app.job_postings as any).work_mode}</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {app.job_postings?.company_name && (
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{app.job_postings.company_name}</span>
              )}
              {app.student_level && (
                <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{app.student_level}</span>
              )}
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Applied {formatLagos(app.created_at)}</span>
            </div>
            {app.status === "rejected" && app.rejection_reason && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg p-2">
                Reason: {app.rejection_reason}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-lg text-xs h-7 px-2 text-primary"
              onClick={() => openFeedbackDialog(app)}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Feedback
            </Button>
            {getStatusBadge(app.status)}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderList = (list: ApplicationWithJob[]) =>
    list.length === 0 ? (
      <Card className="rounded-2xl">
        <CardContent className="text-center py-12">
          <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No applications in this category</p>
        </CardContent>
      </Card>
    ) : (
      <div className="space-y-3">{list.map((app) => <ApplicationCard key={app.id} app={app} />)}</div>
    );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">My Job Board</h1>
            <p className="text-sm text-muted-foreground">Track your job applications and feedback</p>
          </div>
          <Link to="/jobs">
            <Button className="rounded-xl gradient-hero gap-2">
              <ExternalLink className="w-4 h-4" />Browse & Apply for Jobs
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none rounded-2xl">
            <CardContent className="p-4"><div className="flex items-center gap-3"><FileText className="w-7 h-7 opacity-80" /><div><p className="text-2xl font-bold">{applications.length}</p><p className="text-xs opacity-80">Applications</p></div></div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none rounded-2xl">
            <CardContent className="p-4"><div className="flex items-center gap-3"><AlertCircle className="w-7 h-7 opacity-80" /><div><p className="text-2xl font-bold">{pending.length}</p><p className="text-xs opacity-80">Pending</p></div></div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none rounded-2xl">
            <CardContent className="p-4"><div className="flex items-center gap-3"><CheckCircle className="w-7 h-7 opacity-80" /><div><p className="text-2xl font-bold">{approved.length}</p><p className="text-xs opacity-80">Approved</p></div></div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-none rounded-2xl">
            <CardContent className="p-4"><div className="flex items-center gap-3"><XCircle className="w-7 h-7 opacity-80" /><div><p className="text-2xl font-bold">{rejected.length}</p><p className="text-xs opacity-80">Rejected</p></div></div></CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : applications.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="text-center py-16">
              <Briefcase className="w-14 h-14 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No applications yet</h3>
              <p className="text-sm text-muted-foreground mb-6">Start applying for jobs to track your applications here.</p>
              <Link to="/jobs"><Button className="rounded-xl gradient-hero gap-2">Browse Jobs <ArrowRight className="w-4 h-4" /></Button></Link>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="rounded-xl h-9 w-full sm:w-auto grid grid-cols-4 sm:flex">
              <TabsTrigger value="all" className="text-xs px-3 rounded-lg">All ({applications.length})</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs px-3 rounded-lg">Pending ({pending.length})</TabsTrigger>
              <TabsTrigger value="approved" className="text-xs px-3 rounded-lg">Approved ({approved.length})</TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs px-3 rounded-lg">Rejected ({rejected.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">{renderList(applications)}</TabsContent>
            <TabsContent value="pending" className="mt-4">{renderList(pending)}</TabsContent>
            <TabsContent value="approved" className="mt-4">{renderList(approved)}</TabsContent>
            <TabsContent value="rejected" className="mt-4">{renderList(rejected)}</TabsContent>
          </Tabs>
        )}
      </div>

      {/* Feedback Conversation Dialog */}
      <Dialog open={!!feedbackApp} onOpenChange={() => setFeedbackApp(null)}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />Feedback
            </DialogTitle>
          </DialogHeader>
          {feedbackApp && (
            <div className="flex flex-col flex-1 min-h-0 space-y-3">
              <div className="p-3 bg-muted/50 rounded-xl">
                <p className="text-sm font-medium text-foreground">{feedbackApp.job_postings?.title}</p>
                <p className="text-xs text-muted-foreground">{feedbackApp.job_postings?.company_name}</p>
              </div>
              <div className="flex items-center gap-2">{getStatusBadge(feedbackApp.status)}</div>

              {/* Messages */}
              <ScrollArea className="flex-1 max-h-[300px] pr-2">
                {feedbackLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : feedbackMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">No feedback messages yet. Send a message to the employer.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {feedbackMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_role === "applicant" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                          msg.sender_role === "applicant"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p className={`text-[10px] mt-1 ${
                            msg.sender_role === "applicant" ? "text-primary-foreground/60" : "text-muted-foreground"
                          }`}>{formatLagos(msg.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Reply input */}
              <div className="flex gap-2 pt-2 border-t">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  className="rounded-xl text-sm min-h-[60px] flex-1"
                />
                <Button
                  size="sm"
                  className="rounded-xl self-end"
                  disabled={sendingReply || !replyText.trim()}
                  onClick={sendReply}
                >
                  {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
