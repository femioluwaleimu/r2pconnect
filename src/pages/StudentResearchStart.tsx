import { useState, useEffect } from "react";
import MiniFAQBlock from "@/components/faq/MiniFAQBlock";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Sparkles, Loader2, ArrowLeft, GraduationCap, Users, Lock, Target, Wrench, Lightbulb, Shield, Brain, Bot, BookOpen, Zap } from "lucide-react";
import AIUsageDeclaration from "@/components/AIUsageDeclaration";
import SupervisionTypeSelector from "@/components/ai-supervisor/SupervisionTypeSelector";
import EthicsBanner from "@/components/ai-supervisor/EthicsBanner";
import StyleReferenceUpload from "@/components/ai-supervisor/StyleReferenceUpload";
import InviteExternalSupervisor from "@/components/InviteExternalSupervisor";
import { createAppNotification } from "@/lib/notifications";
const RESEARCH_FIELDS = ["Engineering", "Medicine & Health Sciences", "Computer Science", "Agriculture", "Environmental Science", "Business & Economics", "Social Sciences", "Physical Sciences", "Biological Sciences", "Arts & Humanities", "Law", "Education", "Other"];
const RESEARCH_STAGES = [{
  value: "concept",
  label: "Concept/Idea"
}, {
  value: "proposal",
  label: "Proposal"
}, {
  value: "ongoing",
  label: "Ongoing Research"
}];
const RESEARCH_LEVELS = [
  { value: "nd_hnd", label: "ND / HND (Polytechnic)" },
  { value: "undergraduate", label: "Undergraduate (University)" },
  { value: "pgd", label: "PGD (Postgraduate Diploma)" },
  { value: "msc", label: "MSc / M.Tech" },
  { value: "phd", label: "PhD" },
  { value: "lecturer", label: "Lecturer / Academic Research" },
  { value: "industry", label: "Industry / Applied Research" },
  { value: "independent", label: "Independent Research" },
];
const RESEARCH_PURPOSES = [
  { value: "academic_submission", label: "Academic Submission" },
  { value: "publication", label: "Publication" },
  { value: "commercialisation", label: "Commercialisation" },
  { value: "grant_application", label: "Grant Application" },
  { value: "personal_development", label: "Personal Development" },
];
interface Supervisor {
  user_id: string;
  full_name: string;
  department: string | null;
  isExternal?: boolean;
}

const isDatabaseQueryError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String((error as any)?.message || error || "");
  return message.includes("Database query failed") || message.includes("Database query error");
};

const createUuid = () => {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
};

export default function StudentResearchStart() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [comprehensiveAnalyzing, setComprehensiveAnalyzing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [invitedSupervisors, setInvitedSupervisors] = useState<Supervisor[]>([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const [studentProfile, setStudentProfile] = useState<{ institutionId: string | null; department: string | null }>({
    institutionId: null,
    department: null,
  });
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    abstract: "",
    aiSummary: "",
    keywords: "",
    researchField: "",
    researchStage: "concept",
    researchLevel: "",
    researchPurpose: "",
    problemStatement: "",
    solutionApproach: "",
    practicalApplications: [] as string[],
    supervisorId: "",
    coSupervisorId: "",
    supervisionType: "hybrid_ai_human" as "ai_only" | "human_only" | "hybrid_ai_human",
    // AI Usage Declaration fields
    aiUsageDeclared: null as boolean | null,
    aiToolsUsed: ""
  });
  useEffect(() => {
    supabase.auth.getUser().then(async ({
      data: {
        user
      }
    }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      const {
        data: profile
      } = await supabase.from('profiles').select('institution_id, researcher_type, assigned_supervisor_id, department').eq('user_id', user.id).maybeSingle();
      setStudentProfile({
        institutionId: profile?.institution_id || null,
        department: profile?.department || null,
      });

      // Redirect if researcher_type is explicitly set to something other than student
      // Allow null researcher_type (legacy users) and 'student' type
      if (profile?.researcher_type && profile.researcher_type !== 'student') {
        toast({
          title: "Access Restricted",
          description: "This page is for students only. Use 'Upload Completed Research' instead.",
          variant: "destructive"
        });
        navigate("/dashboard/research/upload-completed");
        return;
      }

      // Pre-select assigned supervisor from invite registration
      if (profile?.assigned_supervisor_id) {
        setFormData(prev => ({ ...prev, supervisorId: profile.assigned_supervisor_id! }));
      }

      if (profile?.institution_id) {
        fetchSupervisors(profile.institution_id, profile.department || null);
      }
      fetchInvitedSupervisors(user.id);
    });
  }, [navigate]);
  const fetchSupervisors = async (institutionId: string, department: string | null) => {
    setLoadingSupervisors(true);
    try {
      let query = supabase.from('supervisors').select('user_id, department').eq('institution_id', institutionId).eq('is_active', true);
      // Restrict to supervisors in the same department when the student has one
      if (department) {
        query = query.eq('department', department);
      }
      const { data: supervisorData, error } = await query;
      if (error) throw error;
      if (supervisorData && supervisorData.length > 0) {
        const userIds = supervisorData.map(s => s.user_id);
        const {
          data: profiles
        } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
        const supervisorList: Supervisor[] = supervisorData.map(s => ({
          user_id: s.user_id,
          department: s.department,
          full_name: profiles?.find(p => p.user_id === s.user_id)?.full_name || 'Unknown'
        }));
        setSupervisors(supervisorList);
      } else {
        setSupervisors([]);
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    } finally {
      setLoadingSupervisors(false);
    }
  };

  const fetchInvitedSupervisors = async (userId: string) => {
    try {
      const { data: invites, error: invitesError } = await supabase
        .from('external_supervisor_invites')
        .select('email, full_name, department')
        .eq('student_id', userId)
        .eq('status', 'accepted');

      if (invitesError) {
        if (isDatabaseQueryError(invitesError)) {
          console.warn('External supervisor invites are not available in this database yet.');
          setInvitedSupervisors([]);
          return;
        }
        throw invitesError;
      }

      if (!invites || invites.length === 0) return;

      const emails = invites.map(i => i.email);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, department')
        .in('email', emails);

      if (profilesError) throw profilesError;

      if (profiles && profiles.length > 0) {
        const list: Supervisor[] = profiles.map(p => ({
          user_id: p.user_id,
          full_name: p.full_name || 'Unknown',
          department: p.department || invites.find(i => i.email === p.email)?.department || null,
          isExternal: true,
        }));
        setInvitedSupervisors(list);
      }
    } catch (error) {
      console.error('Error fetching invited supervisors:', error);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload PDF or DOC files only",
          variant: "destructive"
        });
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
    }
  };
  const handleAnalyzeWithAI = async () => {
    if (!formData.abstract.trim()) {
      toast({
        title: "Enter abstract first",
        variant: "destructive"
      });
      return;
    }
    setAnalyzing(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('ai-research', {
        body: {
          type: 'summarize',
          content: formData.abstract
        }
      });
      if (error) throw error;
      if (data.error) {
        toast({
          title: "AI Error",
          description: data.message || data.error,
          variant: "destructive"
        });
        return;
      }
      setFormData({
        ...formData,
        aiSummary: data.result
      });
      toast({
        title: "Analysis complete!",
        description: `Credits remaining: ${data.credits_remaining}`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };
  const handleComprehensiveAnalysis = async () => {
    if (!formData.abstract.trim()) {
      toast({
        title: "Enter abstract first",
        variant: "destructive"
      });
      return;
    }
    setComprehensiveAnalyzing(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('ai-research', {
        body: {
          type: 'comprehensive_analysis',
          content: formData.abstract
        }
      });
      if (error) {
        console.error("Edge function error:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to analyze",
          variant: "destructive"
        });
        return;
      }
      if (data.error) {
        toast({
          title: "AI Error",
          description: data.message || data.error,
          variant: "destructive"
        });
        return;
      }
      try {
        // Clean the result - remove markdown code blocks if present
        let jsonString = data.result;

        // Remove various markdown patterns
        jsonString = jsonString.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

        // Try to find JSON object in the string
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
        const analysisResult = JSON.parse(jsonString);
        setFormData({
          ...formData,
          problemStatement: analysisResult.problem || "",
          solutionApproach: analysisResult.solution || "",
          practicalApplications: Array.isArray(analysisResult.applications) ? analysisResult.applications : []
        });
        toast({
          title: "Analysis complete!",
          description: `Credits remaining: ${data.credits_remaining}`
        });
      } catch (parseError) {
        console.error("Parse error:", parseError, "Raw result:", data.result);
        toast({
          title: "Parse Error",
          description: "Could not parse AI response. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Comprehensive analysis error:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setComprehensiveAnalyzing(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent, asDraft: boolean) => {
    e.preventDefault();
    if (!user) return;

    if (studentProfile.institutionId) {
      const { count, error: departmentCountError } = await supabase
        .from('departments')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', studentProfile.institutionId)
        .eq('is_active', true);

      if (departmentCountError) {
        toast({
          title: "Department validation failed",
          description: "Please try again before submitting your research.",
          variant: "destructive"
        });
        return;
      }

      if ((count || 0) > 0 && !studentProfile.department?.trim()) {
        toast({
          title: "Department Required",
          description: "Your institution has active departments. Please update your profile department before submitting research.",
          variant: "destructive"
        });
        return;
      }
    }

    // Require supervisor for non-AI-only supervision
    if (formData.supervisionType !== "ai_only" && !formData.supervisorId) {
      toast({
        title: "Supervisor Required",
        description: "Please select a supervisor or choose AI Only mode",
        variant: "destructive"
      });
      return;
    }

    // Require AI usage declaration for submission (not drafts)
    if (!asDraft && formData.aiUsageDeclared === null) {
      toast({
        title: "AI Usage Declaration Required",
        description: "Please declare whether you used AI tools",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      let fileUrl = null;
      let fileName = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const {
          error: uploadError
        } = await supabase.storage.from('research-papers').upload(filePath, file);
        if (uploadError) throw uploadError;
        const {
          data: signedUrlData
        } = await supabase.storage.from('research-papers').createSignedUrl(filePath, 60 * 60 * 24 * 365);
        fileUrl = signedUrlData?.signedUrl || null;
        fileName = file.name;
      }
      const keywordsArray = formData.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
      const {
        data: insertedPaper,
        error
      } = await supabase.from('research_papers').insert({
        id: createUuid(),
        title: formData.title,
        abstract: formData.abstract,
        ai_summary: formData.aiSummary || null,
        keywords: keywordsArray,
        file_url: fileUrl,
        file_name: fileName,
        author_id: user.id,
        status: 'draft',
        research_field: formData.researchField || null,
        research_stage: formData.researchStage,
        research_level: formData.researchLevel || null,
        research_purpose: formData.researchPurpose || null,
        problem_statement: formData.problemStatement || null,
        solution_approach: formData.solutionApproach || null,
        practical_applications: formData.practicalApplications.length > 0 ? formData.practicalApplications : null,
        research_type: 'student',
        supervisor_id: formData.supervisionType !== "ai_only" ? formData.supervisorId : null,
        co_supervisor_id: formData.supervisionType !== "ai_only" ? formData.coSupervisorId || null : null,
        supervision_type: formData.supervisionType === "ai_only" ? "ai" : "institution",
        supervision_mode: formData.supervisionType,
        supervisor_approval_status: formData.supervisionType === "ai_only" ? 'ai_supervised' : asDraft ? 'pending' : 'pending',
        funding_status: 'unfunded',
        funding_required: 0,
        // AI Usage Declaration fields
        ai_usage_declared: formData.aiUsageDeclared,
        ai_tools_used: formData.aiToolsUsed || null
      }).select('id').single();
      if (error) throw error;

      // Note: Integrity check is now run by supervisors only

      // Notify supervisor when research is submitted (not draft) - only for institution supervision
      if (!asDraft && formData.supervisionType !== "ai_only" && formData.supervisorId) {
        try {
          // Get supervisor profile and student name
          const [supervisorResult, studentResult] = await Promise.all([supabase.from('profiles').select('full_name, email').eq('user_id', formData.supervisorId).maybeSingle(), supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle()]);
          const supervisorProfile = supervisorResult.data;
          const studentProfile = studentResult.data;
          if (supervisorProfile?.email) {
            // Create in-app notification
            await createAppNotification({
              userId: formData.supervisorId,
              title: 'New Research Submission',
              message: `${studentProfile?.full_name || 'A student'} has submitted "${formData.title}" for your review.`,
              type: 'info',
              link: '/supervisor/pending'
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
                  researchStage: formData.researchStage
                }
              }
            });
          }
        } catch (notifyError) {
          console.error("Notification error:", notifyError);
          // Don't block submission if notification fails
        }
      }
      const successMessage = formData.supervisionType === "ai_only" ? "Research started with AI Supervisor. Use chapter review to get feedback." : "Your supervisor will review your research";
      toast({
        title: asDraft ? "Saved as Draft" : formData.supervisionType === "ai_only" ? "AI Supervised Research Started" : "Submitted to Supervisor",
        description: asDraft ? "You can continue editing later" : successMessage
      });
      navigate("/dashboard/research");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard/research">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Start Student Research</h1>
            <p className="text-muted-foreground">Begin your supervised academic research journey</p>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="border-none shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex gap-4 items-start">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div className="text-white space-y-2">
                <h4 className="font-bold text-lg">Student Research Workflow</h4>
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-white/90">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>Private until approved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Requires supervisor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>AI-assisted review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>Convert to published when ready</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={e => handleSubmit(e, false)}>
          {/* Supervision Type Selection */}
          <div className="mb-6">
            <SupervisionTypeSelector value={formData.supervisionType} onChange={type => setFormData({
            ...formData,
            supervisionType: type
          })} hasSupervisors={supervisors.length > 0} />
          </div>

          {/* AI Supervisor Ethics Banner and Style Reference */}
          {formData.supervisionType !== "human_only" && (
            <div className="mb-6 space-y-4">
              <EthicsBanner />
              <StyleReferenceUpload />
            </div>
          )}

          {/* Supervisor Selection - Only show for institution supervision */}
          {formData.supervisionType !== "ai_only" && <Card className="rounded-2xl shadow-lg mb-6 border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Users className="w-5 h-5 text-primary" />
                  Supervisor Assignment
                  <Badge className="ml-2 bg-destructive/10 text-destructive border-destructive/20">Required</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Alert className="border-primary/20 bg-primary/5">
                  <Shield className="w-4 h-4" />
                  <AlertDescription>
                    Your research will be reviewed by your supervisor before any further action can be taken.
                  </AlertDescription>
                </Alert>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Primary Supervisor <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formData.supervisorId} onValueChange={value => setFormData({
                  ...formData,
                  supervisorId: value
                })}>
                      <SelectTrigger className="mt-1.5 rounded-xl">
                        <SelectValue placeholder={loadingSupervisors ? "Loading..." : "Select supervisor"} />
                      </SelectTrigger>
                      <SelectContent>
                        {supervisors.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Institution Supervisors</SelectLabel>
                            {supervisors.map(sup => <SelectItem key={sup.user_id} value={sup.user_id}>
                                {sup.full_name} {sup.department && `(${sup.department})`}
                              </SelectItem>)}
                          </SelectGroup>
                        )}
                        {invitedSupervisors.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Invited External Supervisors</SelectLabel>
                            {invitedSupervisors.map(sup => <SelectItem key={sup.user_id} value={sup.user_id}>
                                {sup.full_name} {sup.department && `(${sup.department})`}
                              </SelectItem>)}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                    {supervisors.length === 0 && invitedSupervisors.length === 0 && !loadingSupervisors && <p className="text-xs text-muted-foreground mt-1">
                        No supervisors available. Consider AI Supervisor or invite an external supervisor.
                      </p>}
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Co-Supervisor (Optional)</Label>
                    <Select value={formData.coSupervisorId || "none"} onValueChange={value => setFormData({
                  ...formData,
                  coSupervisorId: value === "none" ? "" : value
                })}>
                      <SelectTrigger className="mt-1.5 rounded-xl">
                        <SelectValue placeholder="Select co-supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {supervisors.filter(s => s.user_id !== formData.supervisorId).length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Institution Supervisors</SelectLabel>
                            {supervisors.filter(s => s.user_id !== formData.supervisorId).map(sup => <SelectItem key={sup.user_id} value={sup.user_id}>
                                {sup.full_name} {sup.department && `(${sup.department})`}
                              </SelectItem>)}
                          </SelectGroup>
                        )}
                        {invitedSupervisors.filter(s => s.user_id !== formData.supervisorId).length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Invited External Supervisors</SelectLabel>
                            {invitedSupervisors.filter(s => s.user_id !== formData.supervisorId).map(sup => <SelectItem key={sup.user_id} value={sup.user_id}>
                                {sup.full_name} {sup.department && `(${sup.department})`}
                              </SelectItem>)}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Invite External Supervisor Option */}
                <div className="pt-3 border-t border-border/50">
                  <p className="text-sm text-muted-foreground mb-3">
                    Can't find your supervisor? Invite them to join the platform.
                  </p>
                  <InviteExternalSupervisor />
                </div>
              </CardContent>
            </Card>}

          {/* Basic Information */}
          <Card className="rounded-2xl shadow-lg mb-6">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl border-b">
              <CardTitle className="text-lg font-semibold">Research Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  Research Title <span className="text-destructive">*</span>
                </Label>
                <Input id="title" placeholder="Enter your research title" value={formData.title} onChange={e => setFormData({
                ...formData,
                title: e.target.value
              })} required className="mt-1.5 rounded-xl" />
              </div>

              <div>
                <Label htmlFor="abstract" className="text-sm font-medium">
                  Abstract / Description <span className="text-destructive">*</span>
                </Label>
                <Textarea id="abstract" placeholder="Describe your research objectives, methodology, and expected outcomes" value={formData.abstract} onChange={e => setFormData({
                ...formData,
                abstract: e.target.value
              })} rows={5} required className="mt-1.5 rounded-xl" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">
                    Research Field <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.researchField} onValueChange={value => setFormData({
                  ...formData,
                  researchField: value
                })}>
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESEARCH_FIELDS.map(field => <SelectItem key={field} value={field}>{field}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    Current Stage <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.researchStage} onValueChange={value => setFormData({
                  ...formData,
                  researchStage: value
                })}>
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESEARCH_STAGES.map(stage => <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">
                    Research Level / Category <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.researchLevel} onValueChange={value => setFormData({ ...formData, researchLevel: value })}>
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="Select your academic level" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESEARCH_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    Research Purpose <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.researchPurpose} onValueChange={value => setFormData({ ...formData, researchPurpose: value })}>
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="What's the goal of this research?" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESEARCH_PURPOSES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="keywords" className="text-sm font-medium">
                  Keywords <span className="text-muted-foreground">(comma-separated)</span>
                </Label>
                <Input id="keywords" placeholder="e.g., Machine Learning, Agriculture, IoT" value={formData.keywords} onChange={e => setFormData({
                ...formData,
                keywords: e.target.value
              })} className="mt-1.5 rounded-xl" />
              </div>
            </CardContent>
          </Card>

          {/* Research Document & AI Analysis */}
          <Card className="rounded-2xl shadow-lg mb-6">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl border-b">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <FileText className="w-5 h-5 text-primary" />
                Document & AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium">
                  Upload Document <span className="text-muted-foreground">(Optional - PDF, DOCX)</span>
                </Label>
                <div className="mt-2">
                  <label className="flex items-center gap-3 p-3 border border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
                    {file ? <>
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-sm text-foreground">{file.name}</span>
                      </> : <>
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Choose File</span>
                      </>}
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Button type="button" variant="outline" onClick={handleAnalyzeWithAI} disabled={analyzing || !formData.abstract.trim()} className="w-full rounded-xl border-dashed">
                  {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  AI Summary
                </Button>
                <Button type="button" variant="outline" onClick={handleComprehensiveAnalysis} disabled={comprehensiveAnalyzing || !formData.abstract.trim()} className="w-full rounded-xl border-dashed border-primary/50 text-primary hover:bg-primary/5">
                  {comprehensiveAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Target className="w-4 h-4 mr-2" />}
                  Extract Problem/Solution
                </Button>
              </div>

              {formData.aiSummary && <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <Label className="text-sm font-medium text-primary">AI-Generated Summary</Label>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{formData.aiSummary}</p>
                </div>}
            </CardContent>
          </Card>

          {/* AI Analysis Results */}
          {(formData.problemStatement || formData.solutionApproach || formData.practicalApplications.length > 0) && <Card className="rounded-2xl shadow-lg mb-6 border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  AI Research Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {formData.problemStatement && <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Target className="w-4 h-4 text-destructive" />
                      Problem Statement
                    </Label>
                    <Textarea value={formData.problemStatement} onChange={e => setFormData({
                ...formData,
                problemStatement: e.target.value
              })} rows={3} className="mt-1.5 rounded-xl bg-destructive/5 border-destructive/20" />
                  </div>}
                {formData.solutionApproach && <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-accent" />
                      Solution Approach
                    </Label>
                    <Textarea value={formData.solutionApproach} onChange={e => setFormData({
                ...formData,
                solutionApproach: e.target.value
              })} rows={3} className="mt-1.5 rounded-xl bg-accent/5 border-accent/20" />
                  </div>}
                {formData.practicalApplications.length > 0 && <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      Practical Applications
                    </Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.practicalApplications.map((app, index) => <Badge key={index} variant="secondary" className="px-3 py-1.5 text-sm">
                          {app}
                        </Badge>)}
                    </div>
                  </div>}
              </CardContent>
            </Card>}

          {/* AI Usage Declaration - Required for Student Research */}
          <AIUsageDeclaration aiUsageDeclared={formData.aiUsageDeclared} aiToolsUsed={formData.aiToolsUsed} onAiUsageChange={declared => setFormData({
          ...formData,
          aiUsageDeclared: declared
        })} onAiToolsChange={tools => setFormData({
          ...formData,
          aiToolsUsed: tools
        })} />

        {/* Actions */}
          <div className="flex gap-3 py-[20px]">
            <Button type="button" variant="outline" onClick={e => handleSubmit(e, true)} disabled={loading || !formData.title.trim()} className="flex-1 rounded-xl">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save as Draft
            </Button>
            <Button 
              type="submit" 
              disabled={
                loading || 
                !formData.title.trim() || 
                !formData.abstract.trim() || 
                !formData.researchField || 
                !formData.researchLevel || 
                !formData.researchPurpose || 
                (formData.supervisionType !== "ai_only" && !formData.supervisorId) || 
                formData.aiUsageDeclared === null
              } 
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {formData.supervisionType === "ai_only" ? (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  Start with AI Supervisor
                </>
              ) : formData.supervisionType === "hybrid_ai_human" ? (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Start Hybrid Mode
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Submit to Supervisor
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
      <MiniFAQBlock
        displayLocation="student_research"
        title="Student Research FAQ"
        fallbackQuestions={[
          { question: "Is my research public immediately?", answer: "No. Your research remains private until it is reviewed and approved by your supervisor. Only after approval and publication does it become publicly visible." },
          { question: "Can I choose an AI supervisor?", answer: "Yes. When starting your research, you can select AI Only supervision mode. The AI supervisor provides automated chapter reviews, style matching, and examiner readiness assessments." },
          { question: "Can I earn from my research?", answer: "Yes. Once your research is published, you can earn through industry challenges, collaboration invites, and job opportunities that match your research expertise." },
          { question: "Does my supervisor approve before publication?", answer: "Yes. For human and hybrid supervision modes, your supervisor must review and approve your research before it can be submitted for peer review and publication." },
        ]}
      />
    </DashboardLayout>;
}
