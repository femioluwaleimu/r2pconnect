import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/CurrencyContext";
import { Upload, FileText, Sparkles, Loader2, ArrowLeft, Lightbulb, Wrench, Target, GraduationCap, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const RESEARCH_FIELDS = [
  "Engineering",
  "Medicine & Health Sciences",
  "Computer Science",
  "Agriculture",
  "Environmental Science",
  "Business & Economics",
  "Social Sciences",
  "Physical Sciences",
  "Biological Sciences",
  "Arts & Humanities",
  "Law",
  "Education",
  "Other"
];

const RESEARCH_STAGES = [
  { value: "concept", label: "Concept" },
  { value: "proposal", label: "Proposal" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" }
];

const FUNDING_STATUSES = [
  { value: "unfunded", label: "Unfunded" },
  { value: "seeking_funding", label: "Seeking Funding" },
  { value: "funded", label: "Funded" }
];

const RESEARCH_TYPES = [
  { value: "student", label: "Student Research", description: "In-progress work requiring supervisor approval" },
  { value: "completed", label: "Completed Research", description: "Finished research ready for reviewer approval" }
];

interface Supervisor {
  user_id: string;
  full_name: string;
  department: string | null;
  isExternal?: boolean;
}

export default function ResearchUpload() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [comprehensiveAnalyzing, setComprehensiveAnalyzing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [invitedSupervisors, setInvitedSupervisors] = useState<Supervisor[]>([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currency } = useCurrency();

  const [formData, setFormData] = useState({
    title: "",
    abstract: "",
    aiSummary: "",
    keywords: "",
    researchField: "",
    researchStage: "concept",
    fundingStatus: "unfunded",
    fundingRequired: 0,
    problemStatement: "",
    solutionApproach: "",
    practicalApplications: [] as string[],
    yearCompleted: new Date().getFullYear(),
    researchType: "completed" as "student" | "completed",
    supervisorId: "",
    coSupervisorId: "",
    allowDownload: true,
    downloadCreditCost: 0,
    authorNames: [] as string[],
  });
  const [newAuthorName, setNewAuthorName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      
      // Fetch user's institution
      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profile?.institution_id) {
        fetchSupervisors(profile.institution_id);
      }
      fetchInvitedSupervisors(user.id);
    });
  }, [navigate]);

  const fetchSupervisors = async (institutionId: string) => {
    setLoadingSupervisors(true);
    try {
      // Get supervisors from the supervisors table who belong to this institution
      const { data: supervisorData, error } = await supabase
        .from('supervisors')
        .select(`
          user_id,
          department
        `)
        .eq('institution_id', institutionId)
        .eq('is_active', true);

      if (error) throw error;

      if (supervisorData && supervisorData.length > 0) {
        // Fetch profile details for each supervisor
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

  const fetchInvitedSupervisors = async (userId: string) => {
    try {
      const { data: invites } = await supabase
        .from('external_supervisor_invites')
        .select('email, full_name, department')
        .eq('student_id', userId)
        .eq('status', 'accepted');

      if (!invites || invites.length === 0) return;

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
    }
  };

  const handleAnalyzeWithAI = async () => {
    if (!formData.abstract.trim()) {
      toast({ title: "Enter abstract first", description: "Please enter the research abstract to analyze", variant: "destructive" });
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
      toast({ title: "Enter abstract first", description: "Please enter the research abstract to analyze", variant: "destructive" });
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

      // Parse the JSON response
      try {
        const analysisResult = JSON.parse(data.result);
        setFormData({
          ...formData,
          problemStatement: analysisResult.problem || "",
          solutionApproach: analysisResult.solution || "",
          practicalApplications: analysisResult.applications || []
        });
        toast({ 
          title: "Comprehensive analysis complete!", 
          description: `Problem, solution, and applications extracted. Credits remaining: ${data.credits_remaining}` 
        });
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        toast({ title: "Parse Error", description: "Could not parse AI response. Please try again.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setComprehensiveAnalyzing(false);
    }
  };

  const removeApplication = (index: number) => {
    setFormData({
      ...formData,
      practicalApplications: formData.practicalApplications.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'under_review') => {
    e.preventDefault();
    if (!user) return;

    // Validate supervisor requirement for student research
    if (formData.researchType === 'student' && !formData.supervisorId) {
      toast({ 
        title: "Supervisor Required", 
        description: "Please select a supervisor for student research", 
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

        const { error: uploadError } = await supabase.storage
          .from('research-papers')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('research-papers')
          .createSignedUrl(filePath, 60 * 60 * 24 * 365);

        if (signedUrlError) throw signedUrlError;

        fileUrl = signedUrlData.signedUrl;
        fileName = file.name;
      }

      const keywordsArray = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      // Determine the actual status based on research type
      let actualStatus = status;
      if (formData.researchType === 'student' && status === 'under_review') {
        actualStatus = 'draft'; // Student research starts as draft, goes through supervisor approval
      }

      const { error } = await supabase
        .from('research_papers')
        .insert({
          title: formData.title,
          abstract: formData.abstract,
          ai_summary: formData.aiSummary || null,
          keywords: keywordsArray,
          file_url: fileUrl,
          file_name: fileName,
          author_id: user.id,
          status: actualStatus,
          research_field: formData.researchField || null,
          research_stage: formData.researchStage,
          funding_status: formData.fundingStatus,
          funding_required: formData.fundingStatus === 'seeking_funding' ? formData.fundingRequired : 0,
          funding_currency: currency,
          problem_statement: formData.problemStatement || null,
          solution_approach: formData.solutionApproach || null,
          practical_applications: formData.practicalApplications.length > 0 ? formData.practicalApplications : null,
          year_completed: formData.yearCompleted,
          research_type: formData.researchType,
          supervisor_id: formData.researchType === 'student' ? formData.supervisorId : null,
          co_supervisor_id: formData.researchType === 'student' && formData.coSupervisorId ? formData.coSupervisorId : null,
          supervisor_approval_status: formData.researchType === 'student' ? 'pending' : null,
          allow_download: formData.allowDownload,
          author_names: formData.authorNames.length > 0 ? formData.authorNames : null,
        });

      if (error) throw error;

      toast({ 
        title: status === 'draft' ? "Saved as draft" : formData.researchType === 'student' ? "Submitted for Supervisor Review" : "Submitted for review",
        description: status === 'draft' ? "You can continue editing later" : formData.researchType === 'student' ? "Your supervisor will review your research" : "Your research is now under review"
      });
      navigate("/dashboard/research");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-foreground">Upload Research</h1>
            <p className="text-muted-foreground">Share your research with the world</p>
          </div>
        </div>

        <form onSubmit={(e) => handleSubmit(e, 'under_review')}>
          {/* Research Type Selection */}
          <Card className="rounded-2xl shadow-tick mb-6 border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl border-b">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <GraduationCap className="w-5 h-5 text-primary" />
                Research Type
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {RESEARCH_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, researchType: type.value as "student" | "completed" })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.researchType === type.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <h4 className="font-semibold text-foreground">{type.label}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                  </button>
                ))}
              </div>

              {/* Supervisor Selection for Student Research */}
              {formData.researchType === 'student' && (
                <div className="space-y-4 pt-4 border-t">
                  <Alert className="border-primary/20 bg-primary/5">
                    <Users className="w-4 h-4" />
                    <AlertDescription>
                      Student research requires supervisor approval before it can be published or shown to industry.
                    </AlertDescription>
                  </Alert>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">
                        Primary Supervisor <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.supervisorId}
                        onValueChange={(value) => setFormData({ ...formData, supervisorId: value })}
                      >
                        <SelectTrigger className="mt-1.5 rounded-xl">
                          <SelectValue placeholder={loadingSupervisors ? "Loading..." : "Select supervisor"} />
                        </SelectTrigger>
                        <SelectContent>
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
                              <SelectLabel>Invited External Supervisors</SelectLabel>
                              {invitedSupervisors.map((sup) => (
                                <SelectItem key={sup.user_id} value={sup.user_id}>
                                  {sup.full_name} {sup.department && `(${sup.department})`}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                        </SelectContent>
                      </Select>
                      {supervisors.length === 0 && invitedSupervisors.length === 0 && !loadingSupervisors && (
                        <p className="text-xs text-muted-foreground mt-1">
                          No supervisors available. Contact your institution.
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Co-Supervisor (Optional)</Label>
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
                              <SelectLabel>Invited External Supervisors</SelectLabel>
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
                </div>
              )}
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="rounded-2xl shadow-tick mb-6">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl border-b">
              <CardTitle className="text-lg font-semibold">Basic Information</CardTitle>
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
                  placeholder="Provide a brief summary of your research"
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
                      {RESEARCH_STAGES.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    Year of Research {formData.researchType === 'completed' && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={formData.yearCompleted}
                    onChange={(e) => setFormData({ ...formData, yearCompleted: parseInt(e.target.value) || new Date().getFullYear() })}
                    className="mt-1.5 rounded-xl"
                    placeholder="e.g., 2024"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Year the research was completed/started</p>
                </div>
              </div>

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

          {/* Research Document */}
          <Card className="rounded-2xl shadow-tick mb-6">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl border-b">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <FileText className="w-5 h-5 text-primary" />
                Research Document
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium">
                  Upload Document <span className="text-muted-foreground">(PDF, DOCX)</span>
                </Label>
                <div className="mt-2">
                  <label className="flex items-center gap-3 p-3 border border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
                    {file ? (
                      <>
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-sm text-foreground">{file.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Choose File</span>
                        <span className="text-sm text-muted-foreground">No file chosen</span>
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
                  className="w-full rounded-xl border-dashed"
                >
                  {analyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  AI Summary
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleComprehensiveAnalysis}
                  disabled={comprehensiveAnalyzing || !formData.abstract.trim()}
                  className="w-full rounded-xl border-dashed border-primary/50 text-primary hover:bg-primary/5"
                >
                  {comprehensiveAnalyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Target className="w-4 h-4 mr-2" />
                  )}
                  Extract Problem/Solution
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                AI will analyze your research to extract key insights and identify practical applications
              </p>

              {formData.aiSummary && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <Label className="text-sm font-medium text-primary">AI-Generated Summary</Label>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                    {formData.aiSummary}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis Results */}
          {(formData.problemStatement || formData.solutionApproach || formData.practicalApplications.length > 0) && (
            <Card className="rounded-2xl shadow-tick mb-6 border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  AI Research Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {formData.problemStatement && (
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Target className="w-4 h-4 text-destructive" />
                      Problem Statement
                    </Label>
                    <Textarea
                      value={formData.problemStatement}
                      onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
                      rows={3}
                      className="mt-1.5 rounded-xl bg-destructive/5 border-destructive/20"
                    />
                  </div>
                )}

                {formData.solutionApproach && (
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-accent" />
                      Solution Approach
                    </Label>
                    <Textarea
                      value={formData.solutionApproach}
                      onChange={(e) => setFormData({ ...formData, solutionApproach: e.target.value })}
                      rows={3}
                      className="mt-1.5 rounded-xl bg-accent/5 border-accent/20"
                    />
                  </div>
                )}

                {formData.practicalApplications.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      Practical Applications
                    </Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.practicalApplications.map((app, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-3 py-1.5 text-sm cursor-pointer hover:bg-destructive/20"
                          onClick={() => removeApplication(index)}
                        >
                          {app}
                          <span className="ml-2 text-muted-foreground">×</span>
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Click to remove an application</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Funding Information */}
          <Card className="rounded-2xl shadow-tick mb-6">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl border-b">
              <CardTitle className="text-lg font-semibold">Funding Information</CardTitle>
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
                  <Label className="text-sm font-medium">
                    Funding Required ({currency})
                  </Label>
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

          {/* Download Option */}
          <Card className="rounded-2xl shadow-lg mb-6">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Allow Download</Label>
                  <p className="text-xs text-muted-foreground">Allow others to download the research paper file</p>
                </div>
                <Switch
                  checked={formData.allowDownload}
                  onCheckedChange={(checked) => setFormData({ ...formData, allowDownload: checked })}
                />
              </div>
              {formData.allowDownload && (
                <p className="text-xs text-muted-foreground pt-3 border-t">
                  Download credit cost will be set by your institution.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={loading || !formData.title.trim()}
              className="flex-1 rounded-xl"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save as Draft
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.abstract.trim() || !formData.researchField || (formData.researchType === 'student' && !formData.supervisorId)}
              className="flex-1 rounded-xl gradient-hero"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Upload className="w-4 h-4 mr-2" />
              {formData.researchType === 'student' ? 'Submit for Approval' : 'Publish Research'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
