import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/CurrencyContext";
import AIUsageDeclaration from "@/components/AIUsageDeclaration";
import StyleReferenceUpload from "@/components/ai-supervisor/StyleReferenceUpload";
import SupervisionTypeSelector from "@/components/ai-supervisor/SupervisionTypeSelector";
import EthicsBanner from "@/components/ai-supervisor/EthicsBanner";
import InviteExternalSupervisor from "@/components/InviteExternalSupervisor";
import { 
  Upload, FileText, Sparkles, Loader2, ArrowLeft, Save, 
  GraduationCap, Globe, Users, Lock, DollarSign, Eye, 
  Target, Wrench, Lightbulb, Shield, Brain, Info, Bot, UserPlus, BookOpen, ShieldCheck
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

const RESEARCH_FIELDS = [
  "Engineering", "Medicine & Health Sciences", "Computer Science", "Agriculture",
  "Environmental Science", "Business & Economics", "Social Sciences", "Physical Sciences",
  "Biological Sciences", "Arts & Humanities", "Law", "Education", "Other"
];

const RESEARCH_STAGES_STUDENT = [
  { value: "concept", label: "Concept/Idea" },
  { value: "proposal", label: "Proposal" },
  { value: "ongoing", label: "Ongoing Research" },
];

const RESEARCH_STAGES_COMPLETED = [
  { value: "completed", label: "Completed" }
];

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

const FUNDING_STATUSES = [
  { value: "unfunded", label: "Unfunded" },
  { value: "seeking_funding", label: "Seeking Funding" },
  { value: "funded", label: "Funded" }
];

interface Supervisor {
  user_id: string;
  full_name: string;
  department: string | null;
  isExternal?: boolean;
}

export default function ResearchEdit() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [comprehensiveAnalyzing, setComprehensiveAnalyzing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [existingFile, setExistingFile] = useState<{ name: string; url: string } | null>(null);
  const [researchType, setResearchType] = useState<'student' | 'completed'>('completed');
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [invitedSupervisors, setInvitedSupervisors] = useState<Supervisor[]>([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const [supervisionType, setSupervisionType] = useState<'ai_only' | 'human_only' | 'hybrid_ai_human'>('human_only');
  const [aiStyleSource, setAiStyleSource] = useState<'institution' | 'student'>('student');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currency } = useCurrency();

  const [formData, setFormData] = useState({
    title: "",
    abstract: "",
    aiSummary: "",
    problemStatement: "",
    solutionApproach: "",
    practicalApplications: [] as string[],
    keywords: "",
    researchField: "",
    researchStage: "concept",
    researchLevel: "",
    researchPurpose: "",
    fundingStatus: "unfunded",
    fundingRequired: 0,
    supervisorId: "",
    coSupervisorId: "",
    yearCompleted: new Date().getFullYear(),
    aiUsageDeclared: null as boolean | null,
    aiToolsUsed: "",
    allowDownload: true,
    downloadCreditCost: 0,
    isPublishedJournal: false,
    journalName: "",
    journalUrl: "",
    isPatented: false,
    patentNumber: "",
    authorNames: [] as string[],
  });
  const [newAuthorName, setNewAuthorName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
    });
  }, [navigate]);

  useEffect(() => {
    if (id && user) {
      fetchPaper();
    }
  }, [id, user]);

  const fetchPaper = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('research_papers')
        .select('*')
        .eq('id', id)
        .eq('author_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({ title: "Paper not found", variant: "destructive" });
        navigate('/dashboard/research');
        return;
      }

      // Set research type based on the paper
      const type = data.research_type === 'student' ? 'student' : 'completed';
      setResearchType(type);

      setFormData({
        title: data.title || "",
        abstract: data.abstract || "",
        aiSummary: data.ai_summary || "",
        problemStatement: data.problem_statement || "",
        solutionApproach: data.solution_approach || "",
        practicalApplications: data.practical_applications || [],
        keywords: (data.keywords || []).join(', '),
        researchField: data.research_field || "",
        researchStage: data.research_stage || "concept",
        researchLevel: (data as any).research_level || "",
        researchPurpose: (data as any).research_purpose || "",
        fundingStatus: data.funding_status || "unfunded",
        fundingRequired: data.funding_required || 0,
        supervisorId: data.supervisor_id || "",
        coSupervisorId: data.co_supervisor_id || "",
        yearCompleted: data.year_completed || new Date().getFullYear(),
        aiUsageDeclared: data.ai_usage_declared,
        aiToolsUsed: data.ai_tools_used || "",
        allowDownload: data.allow_download !== false,
        downloadCreditCost: data.download_credit_cost || 0,
        isPublishedJournal: data.is_published_journal || false,
        journalName: data.journal_name || "",
        journalUrl: data.journal_url || "",
        isPatented: data.is_patented || false,
        patentNumber: data.patent_number || "",
        authorNames: data.author_names || [],
      });

      // Set supervision type from paper data - map old values to new modes
      if (data.supervision_type) {
        const modeMap: Record<string, 'ai_only' | 'human_only' | 'hybrid_ai_human'> = {
          'ai': 'ai_only',
          'institution': 'human_only',
          'ai_only': 'ai_only',
          'human_only': 'human_only',
          'hybrid_ai_human': 'hybrid_ai_human',
        };
        setSupervisionType(modeMap[data.supervision_type] || 'human_only');
      }
      if (data.ai_style_source) {
        setAiStyleSource(data.ai_style_source as 'institution' | 'student');
      }

      if (data.file_url && data.file_name) {
        setExistingFile({ name: data.file_name, url: data.file_url });
      }

      // Fetch supervisors if student research with institution supervision
      if (type === 'student') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('institution_id')
          .eq('user_id', user?.id)
          .maybeSingle();
        
        if (profile?.institution_id) {
          fetchSupervisors(profile.institution_id);
        }
        // Fetch invited external supervisors
        fetchInvitedSupervisors();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      navigate('/dashboard/research');
    } finally {
      setFetching(false);
    }
  };

  const fetchSupervisors = async (institutionId: string) => {
    setLoadingSupervisors(true);
    try {
      const { data: supervisorData, error } = await supabase
        .from('supervisors')
        .select('user_id, department')
        .eq('institution_id', institutionId)
        .eq('is_active', true);

      if (error) throw error;

      if (supervisorData && supervisorData.length > 0) {
        const userIds = supervisorData.map(s => s.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const supervisorList: Supervisor[] = supervisorData.map(s => ({
          user_id: s.user_id,
          department: s.department,
          full_name: profiles?.find(p => p.user_id === s.user_id)?.full_name || 'Unknown'
        }));

        setSupervisors(supervisorList);
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    } finally {
      setLoadingSupervisors(false);
    }
  };

  const fetchInvitedSupervisors = async () => {
    try {
      if (!user) return;
      const { data: invites, error: invErr } = await supabase
        .from('external_supervisor_invites')
        .select('email, full_name, department')
        .eq('student_id', user.id)
        .eq('status', 'accepted');

      if (invErr || !invites || invites.length === 0) return;

      const emails = invites.map(i => i.email);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, department')
        .in('email', emails);

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
        toast({ title: "Invalid file type", description: "Please upload PDF or DOC files only", variant: "destructive" });
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
        return;
      }
      setFile(selectedFile);
      setExistingFile(null);
    }
  };

  const handleAnalyzeWithAI = async () => {
    if (!formData.abstract.trim()) {
      toast({ title: "Enter abstract first", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-research', {
        body: { type: 'summarize', content: formData.abstract }
      });

      if (error) throw error;
      if (data.error) {
        toast({ title: "AI Error", description: data.message || data.error, variant: "destructive" });
        return;
      }

      setFormData({ ...formData, aiSummary: data.result });
      toast({ title: "Analysis complete!", description: `Credits remaining: ${data.credits_remaining}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleComprehensiveAnalysis = async () => {
    if (!formData.abstract.trim()) {
      toast({ title: "Enter abstract first", variant: "destructive" });
      return;
    }

    setComprehensiveAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-research', {
        body: { type: 'comprehensive_analysis', content: formData.abstract }
      });

      if (error) throw error;
      if (data.error) {
        toast({ title: "AI Error", description: data.message || data.error, variant: "destructive" });
        return;
      }

      try {
        let jsonString = data.result
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim();
        
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonString = jsonMatch[0];
        
        const analysisResult = JSON.parse(jsonString);
        setFormData({
          ...formData,
          problemStatement: analysisResult.problem || "",
          solutionApproach: analysisResult.solution || "",
          practicalApplications: Array.isArray(analysisResult.applications) ? analysisResult.applications : []
        });
        toast({ title: "Analysis complete!", description: `Credits remaining: ${data.credits_remaining}` });
      } catch {
        toast({ title: "Parse Error", description: "Could not parse AI response", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setComprehensiveAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'under_review') => {
    e.preventDefault();
    if (!user || !id) return;

    // Validate based on research type and supervision type
    if (researchType === 'student') {
      // Only require supervisor selection for institution supervision
      if (supervisionType !== 'ai_only' && !formData.supervisorId) {
        toast({ title: "Supervisor Required", description: "Please select a supervisor", variant: "destructive" });
        return;
      }
      if (status !== 'draft' && formData.aiUsageDeclared === null) {
        toast({ title: "AI Usage Declaration Required", variant: "destructive" });
        return;
      }
      if (status !== 'draft' && (!formData.researchLevel || !formData.researchPurpose)) {
        toast({ title: "Required", description: "Please select Research Level and Purpose", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      let fileUrl = existingFile?.url || null;
      let fileName = existingFile?.name || null;

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

        fileUrl = signedUrlData?.signedUrl || null;
        fileName = file.name;
      }

      const keywordsArray = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const updateData: any = {
        title: formData.title,
        abstract: formData.abstract,
        ai_summary: formData.aiSummary || null,
        problem_statement: formData.problemStatement || null,
        solution_approach: formData.solutionApproach || null,
        practical_applications: formData.practicalApplications.length > 0 ? formData.practicalApplications : null,
        keywords: keywordsArray,
        file_url: fileUrl,
        file_name: fileName,
        status,
        research_field: formData.researchField || null,
        allow_download: formData.allowDownload,
        download_credit_cost: researchType === 'completed' && formData.allowDownload
          ? Math.max(0, formData.downloadCreditCost)
          : 0,
        author_names: formData.authorNames.length > 0 ? formData.authorNames : null,
      };

      // Add type-specific fields
      if (researchType === 'student') {
        updateData.research_stage = formData.researchStage;
        updateData.research_level = formData.researchLevel || null;
        updateData.research_purpose = formData.researchPurpose || null;
        updateData.supervision_type = supervisionType === 'ai_only' ? 'ai' : 'institution';
        updateData.supervision_mode = supervisionType;
        updateData.ai_style_source = supervisionType !== 'human_only' ? aiStyleSource : null;
        
        if (supervisionType !== 'ai_only') {
          updateData.supervisor_id = formData.supervisorId;
          updateData.co_supervisor_id = formData.coSupervisorId || null;
        } else {
          // AI Only - no human supervisor assigned
          updateData.supervisor_id = null;
          updateData.co_supervisor_id = null;
          updateData.supervisor_approval_status = 'ai_supervised';
        }
        
        updateData.ai_usage_declared = formData.aiUsageDeclared;
        updateData.ai_tools_used = formData.aiToolsUsed || null;
      } else {
        updateData.research_stage = 'completed';
        updateData.funding_status = formData.fundingStatus;
        updateData.funding_required = formData.fundingStatus === 'seeking_funding' ? formData.fundingRequired : 0;
        updateData.funding_currency = currency;
        updateData.year_completed = formData.yearCompleted;
        updateData.is_published_journal = formData.isPublishedJournal;
        updateData.journal_name = formData.isPublishedJournal ? formData.journalName || null : null;
        updateData.journal_url = formData.isPublishedJournal ? formData.journalUrl || null : null;
        updateData.is_patented = formData.isPatented;
        updateData.patent_number = formData.isPatented ? formData.patentNumber || null : null;
      }

      const { error } = await supabase
        .from('research_papers')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({ 
        title: status === 'draft' ? "Saved as Draft" : "Submitted",
        description: status === 'draft' 
          ? "Your changes have been saved" 
          : supervisionType === 'ai_only' 
            ? "Your research is now under AI supervision. You can start chapter reviews." 
            : researchType === 'student' 
              ? "Your supervisor will review your research" 
              : "A reviewer will evaluate your research"
      });
      navigate("/dashboard/research");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  const isStudent = researchType === 'student';

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
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">Edit Research</h1>
              <Badge 
                className={`rounded-full ${isStudent 
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}
              >
                {isStudent ? (
                  <><GraduationCap className="w-3 h-3 mr-1" /> Student Research</>
                ) : (
                  <><Globe className="w-3 h-3 mr-1" /> Completed Research</>
                )}
              </Badge>
            </div>
            <p className="text-muted-foreground">Update your research details</p>
          </div>
        </div>

        {/* Research Type Info Banner */}
        <Card className={`border-none shadow-lg rounded-2xl ${isStudent 
          ? 'bg-gradient-to-r from-indigo-500 to-purple-600' 
          : 'bg-gradient-to-r from-emerald-500 to-teal-600'}`}>
          <CardContent className="p-5">
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                {isStudent ? (
                  <GraduationCap className="w-6 h-6 text-white" />
                ) : (
                  <Globe className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="text-white space-y-2 flex-1">
                <h4 className="font-bold text-lg">{isStudent ? 'Student Research' : 'Completed Research'}</h4>
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-white/90">
                  {isStudent ? (
                    <>
                      <div className="flex items-center gap-2"><Lock className="w-4 h-4" /><span>Private until approved</span></div>
                      <div className="flex items-center gap-2"><Users className="w-4 h-4" /><span>Requires supervisor</span></div>
                      <div className="flex items-center gap-2"><Shield className="w-4 h-4" /><span>Integrity checks enabled</span></div>
                      <div className="flex items-center gap-2"><Brain className="w-4 h-4" /><span>AI declaration required</span></div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2"><Eye className="w-4 h-4" /><span>Visible to industry</span></div>
                      <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /><span>Monetization eligible</span></div>
                      <div className="flex items-center gap-2"><Globe className="w-4 h-4" /><span>Public after approval</span></div>
                      <div className="flex items-center gap-2"><Target className="w-4 h-4" /><span>Challenge matching</span></div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={(e) => handleSubmit(e, 'under_review')}>
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="w-full grid grid-cols-3 sm:grid-cols-5 h-auto p-1 bg-muted/50 rounded-xl">
              <TabsTrigger value="basic" className="rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <FileText className="w-4 h-4 mr-2 hidden sm:block" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="document" className="rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Upload className="w-4 h-4 mr-2 hidden sm:block" />
                Document
              </TabsTrigger>
              {isStudent ? (
                <TabsTrigger value="supervisor" className="rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Users className="w-4 h-4 mr-2 hidden sm:block" />
                  Supervisor
                </TabsTrigger>
              ) : (
                <TabsTrigger value="funding" className="rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <DollarSign className="w-4 h-4 mr-2 hidden sm:block" />
                  Funding
                </TabsTrigger>
              )}
              {isStudent && supervisionType !== 'human_only' && (
                <TabsTrigger value="ai-style" className="rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Bot className="w-4 h-4 mr-2 hidden sm:block" />
                  Style Ref
                </TabsTrigger>
              )}
              {isStudent && (
                <TabsTrigger value="declaration" className="rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Brain className="w-4 h-4 mr-2 hidden sm:block" />
                  AI Usage
                </TabsTrigger>
              )}
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6 mt-0">
              <Card className="rounded-2xl shadow-lg border-border/50">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-2xl border-b">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Research Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
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

                  {/* Author Names */}
                  <div>
                    <Label className="text-sm font-medium">
                      Author Names <span className="text-muted-foreground">(add multiple authors)</span>
                    </Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        placeholder="Enter author name"
                        value={newAuthorName}
                        onChange={(e) => setNewAuthorName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newAuthorName.trim()) {
                              setFormData({ ...formData, authorNames: [...formData.authorNames, newAuthorName.trim()] });
                              setNewAuthorName("");
                            }
                          }
                        }}
                        className="rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => {
                          if (newAuthorName.trim()) {
                            setFormData({ ...formData, authorNames: [...formData.authorNames, newAuthorName.trim()] });
                            setNewAuthorName("");
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    {formData.authorNames.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.authorNames.map((name, idx) => (
                          <Badge key={idx} variant="secondary" className="px-3 py-1 text-sm rounded-full">
                            {name}
                            <button
                              type="button"
                              className="ml-2 text-muted-foreground hover:text-destructive"
                              onClick={() => setFormData({ ...formData, authorNames: formData.authorNames.filter((_, i) => i !== idx) })}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="abstract" className="text-sm font-medium">
                      Abstract <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="abstract"
                      placeholder="Provide a comprehensive summary of your research"
                      value={formData.abstract}
                      onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                      rows={5}
                      required
                      className="mt-1.5 rounded-xl"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">
                        Research Field <span className="text-destructive">*</span>
                      </Label>
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

                    {isStudent ? (
                      <div>
                        <Label className="text-sm font-medium">
                          Research Stage <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.researchStage}
                          onValueChange={(value) => setFormData({ ...formData, researchStage: value })}
                        >
                          <SelectTrigger className="mt-1.5 rounded-xl">
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                          <SelectContent>
                            {RESEARCH_STAGES_STUDENT.map((stage) => (
                              <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div>
                        <Label className="text-sm font-medium">
                          Year Completed <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="1900"
                          max={new Date().getFullYear()}
                          value={formData.yearCompleted}
                          onChange={(e) => setFormData({ ...formData, yearCompleted: parseInt(e.target.value) || new Date().getFullYear() })}
                          className="mt-1.5 rounded-xl"
                        />
                      </div>
                    )}
                  </div>

                  {isStudent && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">
                          Research Level / Category <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.researchLevel}
                          onValueChange={(value) => setFormData({ ...formData, researchLevel: value })}
                        >
                          <SelectTrigger className="mt-1.5 rounded-xl">
                            <SelectValue placeholder="Select your academic level" />
                          </SelectTrigger>
                          <SelectContent>
                            {RESEARCH_LEVELS.map((l) => (
                              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Research Purpose <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.researchPurpose}
                          onValueChange={(value) => setFormData({ ...formData, researchPurpose: value })}
                        >
                          <SelectTrigger className="mt-1.5 rounded-xl">
                            <SelectValue placeholder="What's the goal of this research?" />
                          </SelectTrigger>
                          <SelectContent>
                            {RESEARCH_PURPOSES.map((p) => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="keywords" className="text-sm font-medium">
                      Keywords <span className="text-muted-foreground">(comma-separated)</span>
                    </Label>
                    <Input
                      id="keywords"
                      placeholder="e.g., Machine Learning, Agriculture, IoT"
                      value={formData.keywords}
                      onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Document Tab */}
            <TabsContent value="document" className="space-y-6 mt-0">
              <Card className="rounded-2xl shadow-lg border-border/50">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-2xl border-b">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Upload className="w-5 h-5 text-primary" />
                    Research Document
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div>
                    <Label className="text-sm font-medium">
                      Upload Document <span className="text-muted-foreground">(PDF, DOCX)</span>
                    </Label>
                    <div className="mt-2">
                      <label className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                        {file ? (
                          <>
                            <FileText className="w-5 h-5 text-primary" />
                            <span className="text-sm text-foreground font-medium">{file.name}</span>
                          </>
                        ) : existingFile ? (
                          <>
                            <FileText className="w-5 h-5 text-primary" />
                            <span className="text-sm text-foreground">{existingFile.name}</span>
                            <Badge variant="outline" className="ml-auto">Current</Badge>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Click to choose file</span>
                          </>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAnalyzeWithAI}
                      disabled={analyzing || !formData.abstract.trim()}
                      className="w-full rounded-xl border-dashed hover:bg-primary/5"
                    >
                      {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      AI Summary
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleComprehensiveAnalysis}
                      disabled={comprehensiveAnalyzing || !formData.abstract.trim()}
                      className="w-full rounded-xl border-dashed border-primary/50 text-primary hover:bg-primary/5"
                    >
                      {comprehensiveAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Target className="w-4 h-4 mr-2" />}
                      Extract Problem/Solution
                    </Button>
                  </div>

                  {formData.aiSummary && (
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                      <Label className="text-sm font-medium text-primary flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI-Generated Summary
                      </Label>
                      <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{formData.aiSummary}</p>
                    </div>
                  )}

                  {(formData.problemStatement || formData.solutionApproach || formData.practicalApplications.length > 0) && (
                    <div className="space-y-4">
                      {formData.problemStatement && (
                        <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/20">
                          <Label className="text-sm font-medium text-destructive flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            Problem Statement
                          </Label>
                          <p className="mt-2 text-sm text-muted-foreground">{formData.problemStatement}</p>
                        </div>
                      )}
                      {formData.solutionApproach && (
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                          <Label className="text-sm font-medium text-primary flex items-center gap-2">
                            <Wrench className="w-4 h-4" />
                            Solution Approach
                          </Label>
                          <p className="mt-2 text-sm text-muted-foreground">{formData.solutionApproach}</p>
                        </div>
                      )}
                      {formData.practicalApplications.length > 0 && (
                        <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                          <Label className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Practical Applications
                          </Label>
                          <ul className="mt-2 space-y-1">
                            {formData.practicalApplications.map((app, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-emerald-500 mt-1">•</span>
                                {app}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Supervisor Tab (Student only) */}
            {isStudent && (
              <TabsContent value="supervisor" className="space-y-6 mt-0">
                <Card className="rounded-2xl shadow-lg border-primary/20">
                  <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-t-2xl border-b">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <Users className="w-5 h-5 text-primary" />
                      Supervision Type
                      <Badge className="ml-2 bg-destructive/10 text-destructive border-destructive/20">Required</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                    {/* Supervision Type Selector */}
                    <SupervisionTypeSelector
                      value={supervisionType}
                      onChange={setSupervisionType}
                      hasInstitutionSupervisors={supervisors.length > 0}
                    />

                    {/* Ethics Banner for AI Supervisor */}
                    {supervisionType !== 'human_only' && (
                      <EthicsBanner />
                    )}

                    {/* Human Supervisor Selection */}
                    {supervisionType !== 'ai_only' && (
                      <>
                        <Alert className="border-indigo-500/20 bg-indigo-500/5">
                          <Shield className="w-4 h-4 text-primary" />
                          <AlertDescription>
                            Your research will be reviewed by your supervisor before any further action can be taken.
                          </AlertDescription>
                        </Alert>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">
                              Primary Supervisor <span className="text-destructive">*</span>
                            </Label>
                            <Select
                              value={formData.supervisorId || "none"}
                              onValueChange={(value) => setFormData({ ...formData, supervisorId: value === "none" ? "" : value })}
                            >
                              <SelectTrigger className="mt-1.5 rounded-xl">
                                <SelectValue placeholder={loadingSupervisors ? "Loading..." : "Select supervisor"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None selected</SelectItem>
                                {supervisors.length > 0 && (
                                  <SelectGroup>
                                    <SelectLabel>Institution Supervisors</SelectLabel>
                                    {supervisors.map((sup) => (
                                      <SelectItem key={sup.user_id} value={sup.user_id}>
                                        {sup.full_name} {sup.department && `(${sup.department})`}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                )}
                                {invitedSupervisors.length > 0 && (
                                  <SelectGroup>
                                    <SelectLabel>Invited Supervisors</SelectLabel>
                                    {invitedSupervisors.map((sup) => (
                                      <SelectItem key={sup.user_id} value={sup.user_id}>
                                        {sup.full_name} {sup.department && `(${sup.department})`}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-sm font-medium">
                              Co-Supervisor <span className="text-muted-foreground">(Optional)</span>
                            </Label>
                            <Select
                              value={formData.coSupervisorId || "none"}
                              onValueChange={(value) => setFormData({ ...formData, coSupervisorId: value === "none" ? "" : value })}
                            >
                              <SelectTrigger className="mt-1.5 rounded-xl">
                                <SelectValue placeholder="Select co-supervisor" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {supervisors.filter(s => s.user_id !== formData.supervisorId).length > 0 && (
                                  <SelectGroup>
                                    <SelectLabel>Institution Supervisors</SelectLabel>
                                    {supervisors
                                      .filter(s => s.user_id !== formData.supervisorId)
                                      .map((sup) => (
                                        <SelectItem key={sup.user_id} value={sup.user_id}>
                                          {sup.full_name} {sup.department && `(${sup.department})`}
                                        </SelectItem>
                                      ))}
                                  </SelectGroup>
                                )}
                                {invitedSupervisors.filter(s => s.user_id !== formData.supervisorId).length > 0 && (
                                  <SelectGroup>
                                    <SelectLabel>Invited Supervisors</SelectLabel>
                                    {invitedSupervisors
                                      .filter(s => s.user_id !== formData.supervisorId)
                                      .map((sup) => (
                                        <SelectItem key={sup.user_id} value={sup.user_id}>
                                          {sup.full_name} {sup.department && `(${sup.department})`}
                                        </SelectItem>
                                      ))}
                                  </SelectGroup>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Invite External Supervisor */}
                        <div className="mt-4 p-4 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5">
                          <div className="flex items-center gap-2 mb-2">
                            <UserPlus className="w-4 h-4 text-primary" />
                            <p className="text-sm font-medium text-foreground">Invite External Supervisor</p>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            Invite a supervisor who is not yet on the platform. Once they register, they'll appear in the dropdown above.
                          </p>
                          <InviteExternalSupervisor onInviteSent={() => fetchInvitedSupervisors()} />
                        </div>
                      </>
                    )}

                    {/* AI Supervisor Info */}
                    {supervisionType === 'ai_only' && (
                      <Alert className="border-violet-500/20 bg-violet-500/5">
                        <Bot className="w-4 h-4 text-violet-600" />
                        <AlertDescription>
                          AI Supervisor will provide chapter-by-chapter feedback and recommendations. 
                          You can switch to a human supervisor later when they're available on the platform.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* AI Style Reference Tab (AI Supervisor only) */}
            {isStudent && supervisionType !== 'human_only' && (
              <TabsContent value="ai-style" className="space-y-6 mt-0">
                <StyleReferenceUpload
                  onStyleSourceChange={setAiStyleSource}
                  hasInstitutionStyle={false}
                  currentSource={aiStyleSource}
                />
              </TabsContent>
            )}

            {/* Funding Tab (Completed only) */}
            {!isStudent && (
              <TabsContent value="funding" className="space-y-6 mt-0">
                <Card className="rounded-2xl shadow-lg border-border/50">
                  <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-t-2xl border-b">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Funding Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Funding Status</Label>
                        <Select
                          value={formData.fundingStatus}
                          onValueChange={(value) => setFormData({ ...formData, fundingStatus: value })}
                        >
                          <SelectTrigger className="mt-1.5 rounded-xl">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {FUNDING_STATUSES.map((status) => (
                              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Funding Required ({currency})</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.fundingRequired || ''}
                          onChange={(e) => setFormData({ ...formData, fundingRequired: parseFloat(e.target.value) || 0 })}
                          disabled={formData.fundingStatus !== 'seeking_funding'}
                          className="mt-1.5 rounded-xl"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Publication & Patent */}
                <Card className="rounded-2xl shadow-lg border-border/50">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-2xl border-b">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Publication & Patent
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Published in a Journal?</Label>
                          <p className="text-xs text-muted-foreground">Has this research been published in an online journal?</p>
                        </div>
                        <Switch
                          checked={formData.isPublishedJournal}
                          onCheckedChange={(checked) => setFormData({ ...formData, isPublishedJournal: checked })}
                        />
                      </div>
                      {formData.isPublishedJournal && (
                        <div className="grid sm:grid-cols-2 gap-4 pl-0 sm:pl-4 border-l-0 sm:border-l-2 border-primary/20">
                          <div>
                            <Label className="text-sm font-medium">Journal Name</Label>
                            <Input
                              placeholder="e.g., Nature, IEEE Access"
                              value={formData.journalName}
                              onChange={(e) => setFormData({ ...formData, journalName: e.target.value })}
                              className="mt-1.5 rounded-xl"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Publication URL</Label>
                            <Input
                              placeholder="https://doi.org/..."
                              value={formData.journalUrl}
                              onChange={(e) => setFormData({ ...formData, journalUrl: e.target.value })}
                              className="mt-1.5 rounded-xl"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Patented?</Label>
                          <p className="text-xs text-muted-foreground">Has this research been patented?</p>
                        </div>
                        <Switch
                          checked={formData.isPatented}
                          onCheckedChange={(checked) => setFormData({ ...formData, isPatented: checked })}
                        />
                      </div>
                      {formData.isPatented && (
                        <div className="pl-0 sm:pl-4 border-l-0 sm:border-l-2 border-amber-500/20">
                          <Label className="text-sm font-medium">Patent Number</Label>
                          <Input
                            placeholder="e.g., US12345678"
                            value={formData.patentNumber}
                            onChange={(e) => setFormData({ ...formData, patentNumber: e.target.value })}
                            className="mt-1.5 rounded-xl"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div>
                        <Label className="text-sm font-medium">Allow Download</Label>
                        <p className="text-xs text-muted-foreground">Allow others to download the research paper</p>
                      </div>
                      <Switch
                        checked={formData.allowDownload}
                        onCheckedChange={(checked) => setFormData({ ...formData, allowDownload: checked })}
                      />
                    </div>
                    {formData.allowDownload && !isStudent && (
                      <div className="pt-3 border-t">
                        <Label className="text-sm font-medium">Download Cost (credits)</Label>
                        <p className="text-xs text-muted-foreground mb-2">Set how many credits others need to download this completed research.</p>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={formData.downloadCreditCost}
                          onChange={(e) => setFormData({ ...formData, downloadCreditCost: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                          className="mt-1.5 rounded-xl"
                        />
                      </div>
                    )}
                    {formData.allowDownload && isStudent && (
                      <p className="text-xs text-muted-foreground pt-3 border-t">
                        Download credit cost is set by your institution.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* AI Declaration Tab (Student only) */}
            {isStudent && (
              <TabsContent value="declaration" className="space-y-6 mt-0">
                <Card className="rounded-2xl shadow-lg border-amber-500/20">
                  <CardHeader className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-t-2xl border-b">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <Brain className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      AI Usage Declaration
                      <Badge className="ml-2 bg-amber-500/10 text-amber-600 border-amber-500/20">Required for Submission</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <AIUsageDeclaration
                      aiUsageDeclared={formData.aiUsageDeclared}
                      aiToolsUsed={formData.aiToolsUsed}
                      onAiUsageChange={(value) => setFormData({ ...formData, aiUsageDeclared: value })}
                      onAiToolsChange={(value) => setFormData({ ...formData, aiToolsUsed: value })}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

          {/* Actions */}
          <div className="flex gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={loading || !formData.title.trim()}
              className="flex-1 rounded-xl h-12"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.abstract.trim() || (isStudent && supervisionType !== 'ai_only' && !formData.supervisorId)}
              className={`flex-1 rounded-xl h-12 text-white ${isStudent 
                ? supervisionType === 'ai_only' 
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700' 
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'}`}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isStudent 
                ? supervisionType === 'ai_only' 
                  ? 'Continue with AI Supervisor' 
                  : supervisionType === 'hybrid_ai_human'
                    ? 'Submit (Hybrid Mode)'
                    : 'Submit to Supervisor' 
                : 'Submit for Review'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
