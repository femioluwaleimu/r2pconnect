import { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, FileText, Loader2, RefreshCw, 
  AlertTriangle, CheckCircle, Info, Upload
} from "lucide-react";
import AIUsageDeclaration from "@/components/AIUsageDeclaration";
import ResearchIntegrityIndicators from "@/components/ResearchIntegrityIndicators";
import SupervisorFeedbackFiles from "@/components/SupervisorFeedbackFiles";


const RESEARCH_FIELDS = [
  "Engineering", "Medicine & Health Sciences", "Computer Science", "Agriculture",
  "Environmental Science", "Business & Economics", "Social Sciences", "Physical Sciences",
  "Biological Sciences", "Arts & Humanities", "Law", "Education", "Other"
];

interface ResearchData {
  id: string;
  title: string;
  abstract: string | null;
  keywords: string[] | null;
  research_field: string | null;
  problem_statement: string | null;
  solution_approach: string | null;
  file_url: string | null;
  file_name: string | null;
  supervisor_comments: string | null;
  supervisor_approval_status: string | null;
  supervisor_id: string | null;
  reviewer_comments: string | null;
  reviewer_id: string | null;
  status: string | null;
  research_type: string | null;
  plagiarism_score: number | null;
  plagiarism_status: string | null;
  ai_usage_declared: boolean | null;
  ai_tools_used: string | null;
  ai_content_risk: string | null;
  resubmission_count: number | null;
}

export default function ResearchResubmit() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [research, setResearch] = useState<ResearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    abstract: "",
    keywords: "",
    researchField: "",
    problemStatement: "",
    solutionApproach: "",
    aiUsageDeclared: null as boolean | null,
    aiToolsUsed: "",
  });

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
    const { data, error } = await supabase
      .from("research_papers")
      .select("*")
      .eq("id", researchId)
      .eq("author_id", userId)
      .maybeSingle();

    if (error || !data) {
      toast({ title: "Error", description: "Research not found or access denied", variant: "destructive" });
      navigate("/dashboard/research");
      return;
    }

    // Allow resubmission for both supervisor and reviewer revision requests
    const canResubmit = 
      data.supervisor_approval_status === "revision_requested" || 
      data.status === "revision_requested";
    
    if (!canResubmit) {
      toast({ title: "Cannot Resubmit", description: "This research is not awaiting revision", variant: "destructive" });
      navigate("/dashboard/research");
      return;
    }

    setResearch(data as ResearchData);
    setFormData({
      title: data.title || "",
      abstract: data.abstract || "",
      keywords: data.keywords?.join(", ") || "",
      researchField: data.research_field || "",
      problemStatement: data.problem_statement || "",
      solutionApproach: data.solution_approach || "",
      aiUsageDeclared: data.ai_usage_declared,
      aiToolsUsed: data.ai_tools_used || "",
    });
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({ title: "Invalid file type", description: "Please upload PDF or DOC files only", variant: "destructive" });
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !research) return;

    if (formData.aiUsageDeclared === null) {
      toast({ title: "AI Usage Declaration Required", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let fileUrl = research.file_url;
      let fileName = research.file_name;

      // Upload new file if provided
      if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('research-papers')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: signedUrlData } = await supabase.storage
          .from('research-papers')
          .createSignedUrl(filePath, 60 * 60 * 24 * 365);

        fileUrl = signedUrlData?.signedUrl || fileUrl;
        fileName = file.name;
      }

      const keywordsArray = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      // Determine if this is student research (has supervisor) or completed research (has reviewer)
      const isStudentResearch = !!research.supervisor_id;
      const isCompletedResearch = research.research_type === 'completed' || !!research.reviewer_id;

      // Update research paper with appropriate status changes
      const updateData: Record<string, any> = {
        title: formData.title,
        abstract: formData.abstract,
        keywords: keywordsArray,
        research_field: formData.researchField || null,
        problem_statement: formData.problemStatement || null,
        solution_approach: formData.solutionApproach || null,
        file_url: fileUrl,
        file_name: fileName,
        ai_usage_declared: formData.aiUsageDeclared,
        ai_tools_used: formData.aiToolsUsed || null,
        resubmission_count: (research.resubmission_count || 0) + 1,
        last_resubmitted_at: new Date().toISOString(),
        // Reset integrity fields for re-check
        plagiarism_score: null,
        plagiarism_status: null,
        plagiarism_checked_at: null,
        ai_content_risk: null,
      };

      // Set appropriate status based on research type
      if (isStudentResearch) {
        updateData.supervisor_approval_status = 'pending';
      }
      if (isCompletedResearch || research.status === 'revision_requested') {
        updateData.status = 'under_review';
      }

      const { error } = await supabase
        .from('research_papers')
        .update(updateData)
        .eq('id', research.id);

      if (error) throw error;

      // Notify the appropriate person based on research type
      if (isStudentResearch && research.supervisor_id) {
        // Notify supervisor for student research
        try {
          const [supervisorResult, studentResult] = await Promise.all([
            supabase.from('profiles').select('full_name, email').eq('user_id', research.supervisor_id).maybeSingle(),
            supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle()
          ]);

          const supervisorProfile = supervisorResult.data;
          const studentProfile = studentResult.data;

          if (supervisorProfile?.email) {
            // Create in-app notification
            await supabase.rpc('create_notification', {
              _user_id: research.supervisor_id,
              _title: 'Research Resubmitted',
              _message: `${studentProfile?.full_name || 'A student'} has resubmitted "${formData.title}" for your review.`,
              _type: 'info',
              _link: '/supervisor/pending'
            });

            // Send email notification
            await supabase.functions.invoke('send-email', {
              body: {
                type: 'new_student_submission',
                to: supervisorProfile.email,
                data: {
                  supervisorName: supervisorProfile.full_name,
                  studentName: studentProfile?.full_name || 'A student',
                  title: formData.title,
                  researchField: formData.researchField,
                }
              }
            });
          }
        } catch (notifyError) {
          console.error("Supervisor notification error:", notifyError);
        }
      }
      
      if (research.reviewer_id && (isCompletedResearch || research.status === 'revision_requested')) {
        // Notify reviewer for completed research
        try {
          const [reviewerResult, researcherResult] = await Promise.all([
            supabase.from('profiles').select('full_name, email').eq('user_id', research.reviewer_id).maybeSingle(),
            supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle()
          ]);

          const reviewerProfile = reviewerResult.data;
          const researcherProfile = researcherResult.data;

          if (reviewerProfile?.email) {
            // Create in-app notification for reviewer
            await supabase.rpc('create_notification', {
              _user_id: research.reviewer_id,
              _title: 'Research Resubmitted for Review',
              _message: `${researcherProfile?.full_name || 'A researcher'} has resubmitted "${formData.title}" after addressing your revision request.`,
              _type: 'info',
              _link: '/reviewer/pending'
            });

            // Send email notification to reviewer
            await supabase.functions.invoke('send-email', {
              body: {
                type: 'research_resubmitted',
                to: reviewerProfile.email,
                data: {
                  reviewerName: reviewerProfile.full_name,
                  researcherName: researcherProfile?.full_name || 'A researcher',
                  title: formData.title,
                  researchField: formData.researchField,
                }
              }
            });
          }
        } catch (notifyError) {
          console.error("Reviewer notification error:", notifyError);
        }
      }

      const successMessage = isStudentResearch 
        ? "Your revised research has been sent for supervisor review"
        : "Your revised research has been sent back to the reviewer";

      toast({ 
        title: "Resubmitted Successfully", 
        description: successMessage
      });
      navigate("/dashboard/research");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!research) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Research not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard/research">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Resubmit Research</h1>
            <p className="text-muted-foreground">
              {research.supervisor_id ? 'Address supervisor feedback and resubmit' : 'Address reviewer feedback and resubmit'}
            </p>
          </div>
          <Badge className="ml-auto bg-warning/10 text-warning">
            Revision #{(research.resubmission_count || 0) + 1}
          </Badge>
        </div>

        {/* Reviewer Feedback Alert (for completed research) */}
        {research.reviewer_comments && (
          <Card className="rounded-2xl border-l-4 border-l-warning bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Latest Reviewer Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_p]:my-1"
                dangerouslySetInnerHTML={{ __html: research.reviewer_comments }}
              />
            </CardContent>
          </Card>
        )}

        {/* Supervisor Feedback Alert (for student research) */}
        {research.supervisor_comments && (
          <Card className="rounded-2xl border-l-4 border-l-warning bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Latest Supervisor Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_p]:my-1"
                dangerouslySetInnerHTML={{ __html: research.supervisor_comments }}
              />
            </CardContent>
          </Card>
        )}

        {/* Supervisor Feedback Files (only for student research) */}
        {research.supervisor_id && (
          <SupervisorFeedbackFiles researchId={research.id} isStudent={true} />
        )}

        {/* Previous Integrity Results */}
        {(research.plagiarism_status || research.ai_content_risk) && (
          <Card className="rounded-2xl border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="w-5 h-5 text-muted-foreground" />
                Previous Integrity Check Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResearchIntegrityIndicators
                plagiarismScore={research.plagiarism_score}
                plagiarismStatus={research.plagiarism_status}
                aiUsageDeclared={research.ai_usage_declared}
                aiToolsUsed={research.ai_tools_used}
                aiContentRisk={research.ai_content_risk}
              />
              <p className="text-sm text-muted-foreground mt-4">
                Integrity checks will be re-run upon resubmission.
              </p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          {/* Research Information */}
          <Card className="rounded-2xl shadow-lg mb-6">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl border-b">
              <CardTitle className="text-lg font-semibold">Research Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  Research Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Enter your research title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="abstract" className="text-sm font-medium">
                  Abstract / Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="abstract"
                  placeholder="Describe your research objectives, methodology, and expected outcomes"
                  value={formData.abstract}
                  onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                  rows={5}
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Research Field</Label>
                  <Select
                    value={formData.researchField}
                    onValueChange={(value) => setFormData({ ...formData, researchField: value })}
                  >
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESEARCH_FIELDS.map((field) => (
                        <SelectItem key={field} value={field}>{field}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="keywords" className="text-sm font-medium">Keywords</Label>
                  <Input
                    id="keywords"
                    placeholder="e.g., Machine Learning, Agriculture, IoT"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>

              {/* Problem & Solution */}
              <div>
                <Label className="text-sm font-medium">Problem Statement</Label>
                <Textarea
                  value={formData.problemStatement}
                  onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
                  rows={3}
                  className="mt-1.5 rounded-xl"
                  placeholder="What problem does your research address?"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Solution Approach</Label>
                <Textarea
                  value={formData.solutionApproach}
                  onChange={(e) => setFormData({ ...formData, solutionApproach: e.target.value })}
                  rows={3}
                  className="mt-1.5 rounded-xl"
                  placeholder="How does your research solve the problem?"
                />
              </div>
            </CardContent>
          </Card>

          {/* Document Upload */}
          <Card className="rounded-2xl shadow-lg mb-6">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl border-b">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <FileText className="w-5 h-5 text-primary" />
                Updated Document
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {research.file_name && (
                <p className="text-sm text-muted-foreground mb-3">
                  Current file: <span className="font-medium">{research.file_name}</span>
                </p>
              )}
              <label className="flex items-center gap-3 p-4 border border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
                {file ? (
                  <>
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-sm text-foreground">{file.name}</span>
                    <Badge variant="secondary" className="ml-auto">New</Badge>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload revised document (optional)</span>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                />
              </label>
            </CardContent>
          </Card>

          {/* AI Usage Declaration */}
          <div className="mb-6">
            <AIUsageDeclaration
              aiUsageDeclared={formData.aiUsageDeclared}
              aiToolsUsed={formData.aiToolsUsed}
              onAiUsageChange={(declared) => setFormData({ ...formData, aiUsageDeclared: declared })}
              onAiToolsChange={(tools) => setFormData({ ...formData, aiToolsUsed: tools })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link to="/dashboard/research" className="flex-1">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting || !formData.title.trim() || !formData.abstract.trim() || formData.aiUsageDeclared === null}
              className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <RefreshCw className="w-4 h-4 mr-2" />
              Resubmit for Review
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
