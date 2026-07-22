import { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import SupervisorLayout from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ArrowLeft, FileText, Download, CheckCircle, AlertTriangle, Loader2, Calendar, Tag, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ResearchProgressTracker from "@/components/ResearchProgressTracker";
import SupervisorAIReview from "@/components/SupervisorAIReview";
import ResearchIntegrityIndicators from "@/components/ResearchIntegrityIndicators";
import SupervisorIntegrityCheck, { type IntegrityCheckResult } from "@/components/SupervisorIntegrityCheck";
import SupervisorFeedbackUpload from "@/components/SupervisorFeedbackUpload";
import SupervisorReviewHistory from "@/components/SupervisorReviewHistory";
import SupervisorFeedbackFiles from "@/components/SupervisorFeedbackFiles";
import VersionComparisonView from "@/components/VersionComparisonView";
import ChapterReviewPanel from "@/components/ChapterReviewPanel";
import SharedAIReviewHistory from "@/components/ai-supervisor/SharedAIReviewHistory";
import { createAppNotification } from "@/lib/notifications";

interface ResearchDetail {
  id: string;
  title: string;
  abstract: string | null;
  problem_statement: string | null;
  solution_approach: string | null;
  research_field: string | null;
  research_stage: string | null;
  keywords: string[] | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
  year_completed: number | null;
  status: string;
  supervisor_approval_status: string | null;
  supervisor_comments: string | null;
  // Integrity fields
  plagiarism_score: number | null;
  plagiarism_status: string | null;
  ai_usage_declared: boolean | null;
  ai_tools_used: string | null;
  ai_content_risk: string | null;
  author: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    assigned_supervisor_id?: string | null;
  };
}

interface InstitutionThresholds {
  plagiarism_threshold: number;
  ai_content_threshold: string;
}

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      // Legacy rows may store comma-separated keywords.
    }

    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

const normalizeRecommendations = (value: IntegrityCheckResult["recommendations"]): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\n|;/)
      .map((item) => item.replace(/^[-*\d.)\s]+/, "").trim())
      .filter(Boolean);
  }

  return [];
};

export default function SupervisorResearchDetail() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [research, setResearch] = useState<ResearchDetail | null>(null);
  const [thresholds, setThresholds] = useState<InstitutionThresholds | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [integrityResult, setIntegrityResult] = useState<IntegrityCheckResult | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      if (id) fetchResearch(id, user.id);
    });
  }, [navigate, id]);

  const fetchResearch = async (researchId: string, userId: string) => {
    setLoading(true);

    const { data: paper, error } = await supabase
      .from("research_papers")
      .select("*")
      .eq("id", researchId)
      .maybeSingle();

    if (error || !paper) {
      toast({ title: "Error", description: "Research not found", variant: "destructive" });
      setResearch(null);
      setLoading(false);
      return;
    }

    // Fetch author profile. The assigned supervisor check covers papers created before supervisor_id was saved.
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, assigned_supervisor_id")
      .eq("user_id", paper.author_id)
      .maybeSingle();

    let hasAccess =
      paper.supervisor_id === userId ||
      paper.co_supervisor_id === userId ||
      profile?.assigned_supervisor_id === userId;

    if (!hasAccess) {
      const { data: supervisorProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", userId)
        .maybeSingle();

      const supervisorEmail = String(supervisorProfile?.email || user?.email || "").toLowerCase();
      if (supervisorEmail) {
        const { data: externalInvite } = await supabase
          .from("external_supervisor_invites")
          .select("id")
          .eq("student_id", paper.author_id)
          .eq("email", supervisorEmail)
          .eq("status", "accepted")
          .maybeSingle();

        hasAccess = Boolean(externalInvite);
      }
    }

    if (!hasAccess) {
      toast({ title: "Access denied", description: "This research is not assigned to your supervisor account.", variant: "destructive" });
      setResearch(null);
      setLoading(false);
      return;
    }

    // Fetch institution thresholds via supervisor's profile
    const { data: supervisorProfile } = await supabase
      .from("profiles")
      .select("institution_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (supervisorProfile?.institution_id) {
      const { data: institutionData } = await supabase
        .from("institutions")
        .select("plagiarism_threshold, ai_content_threshold")
        .eq("id", supervisorProfile.institution_id)
        .maybeSingle();

      if (institutionData) {
        setThresholds({
          plagiarism_threshold: institutionData.plagiarism_threshold ?? 30,
          ai_content_threshold: institutionData.ai_content_threshold ?? "medium",
        });
      }
    }

    setResearch({
      ...paper,
      keywords: toStringArray(paper.keywords),
      author: profile || { user_id: paper.author_id, full_name: "Unknown", avatar_url: null },
    });
    setComments("");
    setLoading(false);
  };

  const handleIntegrityCheckComplete = (result?: IntegrityCheckResult) => {
    if (result) {
      setIntegrityResult(result);
      setResearch((current) => current ? {
        ...current,
        plagiarism_score: typeof result.plagiarism_score === "number" ? result.plagiarism_score : current.plagiarism_score,
        plagiarism_status: result.plagiarism_status || current.plagiarism_status || "low",
        ai_content_risk: result.ai_content_risk || current.ai_content_risk,
      } : current);
    }

    if (id && user) fetchResearch(id, user.id);
  };

  const handleAction = async (action: "approve" | "revision" | "reject") => {
    if (!research || !user) return;

    if ((action === "revision" || action === "reject") && !comments.trim()) {
      toast({ title: "Comments Required", description: "Please provide feedback for the student", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const previousStatus = research.supervisor_approval_status;
      let newStatus = "";
      
      // Get supervisor's institution_id
      const { data: supervisorData } = await supabase
        .from('supervisors')
        .select('institution_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const updateData: any = {
        supervisor_comments: comments || null,
        supervisor_reviewed_at: new Date().toISOString(),
      };

      if (action === "approve") {
        updateData.supervisor_approval_status = "approved";
        updateData.supervisor_approved_at = new Date().toISOString();
        // Set status to under_review so it appears in institution pending reviews
        updateData.status = "under_review";
        // Set institution_id from supervisor's institution
        if (supervisorData?.institution_id) {
          updateData.institution_id = supervisorData.institution_id;
        }
        newStatus = "approved";
      } else if (action === "revision") {
        updateData.supervisor_approval_status = "revision_requested";
        newStatus = "revision_requested";
      } else if (action === "reject") {
        updateData.supervisor_approval_status = "rejected";
        newStatus = "rejected";
      }

      const { error } = await supabase
        .from("research_papers")
        .update(updateData)
        .eq("id", research.id);

      if (error) throw error;

      // Record review history with timestamp
      await supabase
        .from("supervisor_review_history")
        .insert({
          research_id: research.id,
          supervisor_id: user.id,
          action: action,
          previous_status: previousStatus,
          new_status: newStatus,
          comments: comments || null,
        });

      // Get student and supervisor profiles for notifications
      const { data: studentProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", research.author.user_id)
        .maybeSingle();

      const { data: supervisorProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (studentProfile?.email) {
        // Send email notification based on action
        let emailType = "";
        let notificationType = "info";
        let notificationTitle = "";
        let notificationMessage = "";

        if (action === "approve") {
          emailType = "research_approved";
          notificationType = "success";
          notificationTitle = "Research Approved!";
          notificationMessage = `Your research "${research.title}" has been approved by your supervisor.`;
        } else if (action === "revision") {
          emailType = "revision_requested";
          notificationType = "warning";
          notificationTitle = "Revision Requested";
          notificationMessage = `Your supervisor has requested revisions for "${research.title}".`;
        } else if (action === "reject") {
          emailType = "research_rejected";
          notificationType = "error";
          notificationTitle = "Research Update";
          notificationMessage = `Your research "${research.title}" was not approved. Please check supervisor feedback.`;
        }

        // Send email
        await supabase.functions.invoke("send-email", {
          body: {
            type: emailType,
            to: studentProfile.email,
            data: {
              title: research.title,
              studentName: studentProfile.full_name || research.author.full_name,
              supervisorName: supervisorProfile?.full_name || "Your Supervisor",
              comments: comments,
            },
          },
        });

        // Create in-app notification for student
        const { error: notificationError } = await createAppNotification({
          userId: research.author.user_id,
          title: notificationTitle,
          message: notificationMessage,
          type: notificationType,
          link: "/dashboard/research",
        });
        if (notificationError) console.error("Student notification failed:", notificationError);
      }

      toast({
        title: action === "approve" ? "Research Approved" : action === "revision" ? "Revision Requested" : "Research Rejected",
        description: `${research.title} has been ${action === "approve" ? "approved" : action === "revision" ? "sent back for revision" : "rejected"}`,
      });

      navigate("/supervisor/pending");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedbackUploadComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <SupervisorLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </SupervisorLayout>
    );
  }

  if (!research) {
    return (
      <SupervisorLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Research not found</p>
        </div>
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/supervisor/pending">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{research.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Avatar className="w-6 h-6">
                <AvatarImage src={research.author.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {research.author.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">by {research.author.full_name}</span>
            </div>
          </div>
          <Badge variant="secondary" className="rounded-full">
            {research.supervisor_approval_status === "pending" ? "Pending Review" : research.supervisor_approval_status}
          </Badge>
        </div>

        {/* Progress Tracker */}
        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Research Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResearchProgressTracker
              researchType="student"
              status={research.status}
              supervisorApprovalStatus={research.supervisor_approval_status}
            />
          </CardContent>
        </Card>

        {/* Supervisor Integrity Check Button */}
        <SupervisorIntegrityCheck
          researchId={research.id}
          title={research.title}
          abstract={research.abstract || ""}
          fileUrl={research.file_url}
          hasExistingCheck={!!research.plagiarism_status || research.plagiarism_score !== null || !!research.ai_content_risk}
          onCheckComplete={handleIntegrityCheckComplete}
        />

        {/* Research Integrity Indicators - Show after check is run */}
        {(research.plagiarism_status || research.plagiarism_score !== null || research.ai_content_risk) && (
          <ResearchIntegrityIndicators
            plagiarismScore={research.plagiarism_score}
            plagiarismStatus={research.plagiarism_status}
            aiUsageDeclared={research.ai_usage_declared}
            aiToolsUsed={research.ai_tools_used}
            aiContentRisk={research.ai_content_risk}
            showForSupervisor={true}
            institutionPlagiarismThreshold={thresholds?.plagiarism_threshold}
            institutionAiThreshold={thresholds?.ai_content_threshold}
          />
        )}

        {integrityResult && (
          <Card className="rounded-2xl border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Integrity Check Response
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrityResult.summary && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Summary</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {integrityResult.summary}
                  </p>
                </div>
              )}
              {normalizeRecommendations(integrityResult.recommendations).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Recommendations</h3>
                  <ul className="space-y-2">
                    {normalizeRecommendations(integrityResult.recommendations).map((recommendation, index) => (
                      <li key={`${recommendation}-${index}`} className="flex gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Supervisor Feedback Section - Large Box */}
        {research.supervisor_approval_status === "pending" && (
          <Card className="rounded-2xl border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Your Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Comments / Feedback</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Use the formatting toolbar to add numbered lists, bullet points, and other styling.
                </p>
                <RichTextEditor
                  value={comments}
                  onChange={setComments}
                  placeholder="Provide detailed feedback for the student. Use formatting to organize your comments..."
                  minHeight="250px"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleAction("approve")}
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-secondary to-emerald-600"
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleAction("revision")}
                  disabled={submitting || !comments.trim()}
                  variant="outline"
                  className="rounded-xl text-warning border-warning/30 hover:bg-warning/10"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Request Revision
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Research Details */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Abstract */}
            <Card className="rounded-2xl border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Abstract
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {research.abstract || "No abstract provided"}
                </p>
              </CardContent>
            </Card>

            {/* Problem & Solution */}
            {(research.problem_statement || research.solution_approach) && (
              <Card className="rounded-2xl border-none shadow-lg">
                <CardContent className="p-6 space-y-4">
                  {research.problem_statement && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Problem Statement</h4>
                      <p className="text-muted-foreground text-sm">{research.problem_statement}</p>
                    </div>
                  )}
                  {research.solution_approach && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Solution Approach</h4>
                      <p className="text-muted-foreground text-sm">{research.solution_approach}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Review History */}
            <SupervisorReviewHistory key={`history-${refreshKey}`} researchId={research.id} collapsible={true} />

            {/* Supervisor Feedback Files */}
            <SupervisorFeedbackFiles key={`files-${refreshKey}`} researchId={research.id} />

            {/* Version Comparison View */}
            <VersionComparisonView
              key={`comparison-${refreshKey}`}
              researchId={research.id}
              studentFileUrl={research.file_url}
              studentFileName={research.file_name}
              researchTitle={research.title}
              researchAbstract={research.abstract}
            />

            {/* Chapter Review Panel - Supervisor can view student's AI chapter reviews */}
            <ChapterReviewPanel
              researchId={research.id}
              researchStatus={research.status}
              isOwner={false}
              isSupervisor={true}
            />
            <SharedAIReviewHistory researchId={research.id} viewerRole="supervisor" />
            {/* AI Review */}
            <Card className="rounded-2xl border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">AI Review Assistant</CardTitle>
              </CardHeader>
              <CardContent>
                <SupervisorAIReview
                  researchId={research.id}
                  title={research.title}
                  abstract={research.abstract || ""}
                  problemStatement={research.problem_statement}
                  solutionApproach={research.solution_approach}
                  researchField={research.research_field}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Metadata */}
            <Card className="rounded-2xl border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {research.research_field && (
                  <div className="flex items-center gap-3">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{research.research_field}</span>
                  </div>
                )}
                {research.year_completed && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Year: {research.year_completed}</span>
                  </div>
                )}
                {research.keywords && research.keywords.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {research.keywords.map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs rounded-full">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Student's Original Document */}
                {research.file_url && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Student Submission</p>
                    <a href={research.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="w-full rounded-xl">
                        <Download className="w-4 h-4 mr-2" />
                        Download Original
                      </Button>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Annotated Feedback */}
            {user && (research.supervisor_approval_status === "pending" || research.supervisor_approval_status === "revision_requested") && (
              <SupervisorFeedbackUpload
                researchId={research.id}
                supervisorId={user.id}
                currentStatus={research.supervisor_approval_status}
                onUploadComplete={handleFeedbackUploadComplete}
              />
            )}

          </div>
        </div>
      </div>
    </SupervisorLayout>
  );
}
