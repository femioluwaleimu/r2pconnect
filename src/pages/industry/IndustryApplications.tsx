import { useState, useEffect } from "react";
import IndustryLayout from "@/components/layout/IndustryLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle, XCircle, Clock, Building2, GraduationCap, BadgeCheck, Mail, Loader2, UserCheck, Download, MessageSquare, Send } from "lucide-react";
import { formatLagos } from "@/lib/dateUtils";

interface Application {
  id: string;
  job_id: string;
  student_id: string;
  cover_letter: string | null;
  status: string;
  rejection_reason: string | null;
  employer_feedback: string | null;
  created_at: string;
  student_name?: string | null;
  student_level?: string | null;
  student_institution_name?: string | null;
  student_avatar_url?: string | null;
  job_postings: { title: string; job_type: string };
  profiles?: {
    full_name: string;
    email: string;
    department: string | null;
    level: string | null;
    institution_id: string | null;
    is_verified: boolean;
    skills: string[] | null;
    cv_url: string | null;
    avatar_url?: string | null;
    institutions?: { name: string } | null;
  };
}

interface FeedbackMessage {
  id: string;
  sender_role: string;
  message: string;
  created_at: string;
}

export default function IndustryApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [newFeedback, setNewFeedback] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: jobs } = await supabase.from('job_postings').select('id').eq('industry_id', user.id);
      if (!jobs || jobs.length === 0) { setApplications([]); setLoading(false); return; }

      const jobIds = jobs.map(j => j.id);
      const { data, error } = await supabase
        .from('job_applications')
        .select(`id, job_id, student_id, cover_letter, status, rejection_reason, employer_feedback, created_at, student_name, student_level, student_institution_name, student_avatar_url, job_postings(title, job_type)`)
        .in('job_id', jobIds)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const studentIds = [...new Set((data || []).map(a => a.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, department, level, institution_id, is_verified, skills, cv_url, avatar_url')
        .in('user_id', studentIds);

      const instIds = [...new Set((profiles || []).map(p => p.institution_id).filter(Boolean))];
      const { data: institutions } = await supabase.from('institutions').select('id, name').in('id', instIds);

      const profileMap = new Map((profiles || []).map(p => {
        const inst = institutions?.find(i => i.id === p.institution_id);
        return [p.user_id, { ...p, institutions: inst ? { name: inst.name } : null }];
      }));

      setApplications((data || []).map(app => ({ ...app, profiles: profileMap.get(app.student_id) || null })));
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadFeedbackMessages = async (appId: string) => {
    setFeedbackLoading(true);
    try {
      const { data } = await supabase
        .from("job_feedback_messages")
        .select("id, sender_role, message, created_at")
        .eq("application_id", appId)
        .eq("application_type", "direct")
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
    setRejectionReason('');
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
        application_type: "direct",
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

  const handleApprove = async (app: Application) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.from('job_applications').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', app.id);
      if (error) throw error;
      toast({ title: "Application approved!" });
      fetchApplications();
      setSelectedApp(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleReject = async (app: Application) => {
    if (!rejectionReason.trim()) { toast({ title: "Please provide a reason", variant: "destructive" }); return; }
    setActionLoading(true);
    try {
      const { error } = await supabase.from('job_applications').update({ status: 'rejected', rejection_reason: rejectionReason, rejected_at: new Date().toISOString() }).eq('id', app.id);
      if (error) throw error;
      toast({ title: "Application rejected" });
      fetchApplications();
      setSelectedApp(null);
      setRejectionReason('');
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleHire = async (app: Application) => {
    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: appError } = await supabase.from('job_applications').update({ status: 'hired', hired_at: new Date().toISOString() }).eq('id', app.id);
      if (appError) throw appError;

      const { error: hireError } = await supabase.from('hired_students').insert({ application_id: app.id, job_id: app.job_id, student_id: app.student_id, industry_id: user.id, start_date: new Date().toISOString().split('T')[0] });
      if (hireError) throw hireError;

      const { data: jobData } = await supabase.from('job_postings').select('slots_filled').eq('id', app.job_id).single();
      if (jobData) await supabase.from('job_postings').update({ slots_filled: (jobData.slots_filled || 0) + 1 }).eq('id', app.job_id);

      toast({ title: "Student hired successfully!" });
      fetchApplications();
      setSelectedApp(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved': return <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected': return <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'hired': return <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs"><BadgeCheck className="w-3 h-3 mr-1" />Hired</Badge>;
      default: return <Badge className="text-xs">{status}</Badge>;
    }
  };

  const filterByStatus = (status: string | null) => !status ? applications : applications.filter(a => a.status === status);

  return (
    <IndustryLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground">Review and manage student applications</p>
        </div>

        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none">
            <CardContent className="p-3"><div className="flex items-center justify-between"><div><p className="text-xl font-bold">{filterByStatus('pending').length}</p><p className="text-xs opacity-80">Pending</p></div><Clock className="w-5 h-5 opacity-80" /></div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none">
            <CardContent className="p-3"><div className="flex items-center justify-between"><div><p className="text-xl font-bold">{filterByStatus('approved').length}</p><p className="text-xs opacity-80">Approved</p></div><CheckCircle className="w-5 h-5 opacity-80" /></div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
            <CardContent className="p-3"><div className="flex items-center justify-between"><div><p className="text-xl font-bold">{filterByStatus('hired').length}</p><p className="text-xs opacity-80">Hired</p></div><BadgeCheck className="w-5 h-5 opacity-80" /></div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-none">
            <CardContent className="p-3"><div className="flex items-center justify-between"><div><p className="text-xl font-bold">{filterByStatus('rejected').length}</p><p className="text-xs opacity-80">Rejected</p></div><XCircle className="w-5 h-5 opacity-80" /></div></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="rounded-lg h-8 text-xs">
            <TabsTrigger value="all" className="text-xs px-2">All ({applications.length})</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs px-2">Pending ({filterByStatus('pending').length})</TabsTrigger>
            <TabsTrigger value="approved" className="text-xs px-2">Approved ({filterByStatus('approved').length})</TabsTrigger>
            <TabsTrigger value="hired" className="text-xs px-2">Hired ({filterByStatus('hired').length})</TabsTrigger>
          </TabsList>

          {['all', 'pending', 'approved', 'hired'].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-2 mt-3">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : filterByStatus(tab === 'all' ? null : tab).length === 0 ? (
                <Card className="shadow-sm rounded-xl">
                  <CardContent className="text-center py-12">
                    <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-base font-semibold mb-1">No applications</h3>
                    <p className="text-sm text-muted-foreground">No applications in this category</p>
                  </CardContent>
                </Card>
              ) : (
                filterByStatus(tab === 'all' ? null : tab).map(app => (
                  <Card key={app.id} className="shadow-sm rounded-xl hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                            {(app.student_avatar_url || app.profiles?.avatar_url) ? (
                              <img src={(app.student_avatar_url || app.profiles?.avatar_url) as string} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm">
                                {(app.student_name || app.profiles?.full_name)?.charAt(0) || 'S'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <h3 className="font-semibold text-foreground text-sm truncate">{app.student_name || app.profiles?.full_name || 'Unknown'}</h3>
                              {app.profiles?.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{app.job_postings?.title}</p>
                          </div>
                        </div>
                        {getStatusBadge(app.status)}
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                        {app.profiles?.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{app.profiles.email}</span>}
                        {(app.student_institution_name || app.profiles?.institutions?.name) && (
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{app.student_institution_name || app.profiles?.institutions?.name}</span>
                        )}
                        {(app.student_level || app.profiles?.level) && (
                          <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{app.student_level || app.profiles?.level}</span>
                        )}
                      </div>

                      {app.profiles?.skills && app.profiles.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {app.profiles.skills.slice(0, 4).map((skill, i) => <Badge key={i} variant="outline" className="text-[10px]">{skill}</Badge>)}
                        </div>
                      )}

                      <div className="flex gap-1.5 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => openAppDialog(app)} className="rounded-lg text-xs h-7 px-2">
                          <MessageSquare className="w-3 h-3 mr-1" />View & Feedback
                        </Button>
                        {app.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => handleApprove(app)} className="rounded-lg text-xs h-7 px-2 bg-green-600 hover:bg-green-700"><CheckCircle className="w-3 h-3" /></Button>
                            <Button variant="destructive" size="sm" onClick={() => openAppDialog(app)} className="rounded-lg text-xs h-7 px-2"><XCircle className="w-3 h-3" /></Button>
                          </>
                        )}
                        {app.status === 'approved' && (
                          <Button size="sm" onClick={() => handleHire(app)} className="rounded-lg text-xs h-7 px-2 gradient-hero"><UserCheck className="w-3 h-3 mr-1" />Hire</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Dialog */}
        <Dialog open={!!selectedApp} onOpenChange={() => { setSelectedApp(null); setRejectionReason(''); }}>
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader><DialogTitle>Application Details</DialogTitle></DialogHeader>
            {selectedApp && (
              <div className="space-y-4 flex-1 min-h-0 overflow-y-auto">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {(selectedApp.student_avatar_url || selectedApp.profiles?.avatar_url) ? (
                      <img src={(selectedApp.student_avatar_url || selectedApp.profiles?.avatar_url) as string} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-lg font-bold">
                        {(selectedApp.student_name || selectedApp.profiles?.full_name)?.charAt(0) || 'S'}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <h3 className="font-semibold">{selectedApp.student_name || selectedApp.profiles?.full_name}</h3>
                      {selectedApp.profiles?.is_verified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedApp.profiles?.email}</p>
                  </div>
                </div>

                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Position:</span><span className="font-medium">{selectedApp.job_postings?.title}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Institution:</span><span className="font-medium">{selectedApp.student_institution_name || selectedApp.profiles?.institutions?.name || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Level:</span><span className="font-medium">{selectedApp.student_level || selectedApp.profiles?.level || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Department:</span><span className="font-medium">{selectedApp.profiles?.department || 'N/A'}</span></div>
                </div>

                {selectedApp.profiles?.skills && selectedApp.profiles.skills.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedApp.profiles.skills.map((skill, i) => <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>)}
                    </div>
                  </div>
                )}

                {selectedApp.profiles?.cv_url && (
                  <Button variant="outline" size="sm" className="rounded-lg gap-2" onClick={() => window.open(selectedApp.profiles?.cv_url as string, '_blank')}>
                    <Download className="w-4 h-4" />Download CV
                  </Button>
                )}

                {selectedApp.cover_letter && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Cover Letter</p>
                    <div className="bg-muted/50 rounded-lg p-3"><p className="text-sm whitespace-pre-wrap">{selectedApp.cover_letter}</p></div>
                  </div>
                )}

                {selectedApp.status === 'pending' && (
                  <div className="space-y-3 pt-3 border-t">
                    <div>
                      <label className="text-xs text-muted-foreground">Rejection Reason (if rejecting)</label>
                      <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Reason..." className="rounded-lg mt-1 text-sm" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="destructive" size="sm" onClick={() => handleReject(selectedApp)} disabled={actionLoading} className="rounded-lg">
                        {actionLoading && <Loader2 className="w-3 h-3 animate-spin mr-1" />}Reject
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(selectedApp)} disabled={actionLoading} className="rounded-lg bg-green-600 hover:bg-green-700">
                        {actionLoading && <Loader2 className="w-3 h-3 animate-spin mr-1" />}Approve
                      </Button>
                    </div>
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
      </div>
    </IndustryLayout>
  );
}
