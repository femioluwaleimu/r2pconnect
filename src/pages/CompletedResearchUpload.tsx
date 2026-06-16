import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/CurrencyContext";
import { 
  Upload, FileText, Sparkles, Loader2, ArrowLeft, 
  Lightbulb, Wrench, Target, Globe, DollarSign, Eye, BookOpen, ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const RESEARCH_FIELDS = [
  "Engineering", "Medicine & Health Sciences", "Computer Science", "Agriculture",
  "Environmental Science", "Business & Economics", "Social Sciences", "Physical Sciences",
  "Biological Sciences", "Arts & Humanities", "Law", "Education", "Other"
];

const FUNDING_STATUSES = [
  { value: "unfunded", label: "Unfunded" },
  { value: "seeking_funding", label: "Seeking Funding" },
  { value: "funded", label: "Funded" }
];

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

export default function CompletedResearchUpload() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [comprehensiveAnalyzing, setComprehensiveAnalyzing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currency } = useCurrency();

  const [formData, setFormData] = useState({
    title: "",
    abstract: "",
    aiSummary: "",
    keywords: "",
    researchField: "",
    fundingStatus: "unfunded",
    fundingRequired: 0,
    problemStatement: "",
    solutionApproach: "",
    practicalApplications: [] as string[],
    yearCompleted: new Date().getFullYear(),
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
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
    });
  }, [navigate]);

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

      if (error) {
        console.error("Edge function error:", error);
        toast({ title: "Error", description: error.message || "Failed to analyze", variant: "destructive" });
        return;
      }
      
      if (data.error) {
        toast({ title: "AI Error", description: data.message || data.error, variant: "destructive" });
        return;
      }

      try {
        // Clean the result - remove markdown code blocks if present
        let jsonString = data.result;
        
        // Remove various markdown patterns
        jsonString = jsonString
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim();
        
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
        toast({ title: "Analysis complete!", description: `Credits remaining: ${data.credits_remaining}` });
      } catch (parseError) {
        console.error("Parse error:", parseError, "Raw result:", data.result);
        toast({ title: "Parse Error", description: "Could not parse AI response. Please try again.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Comprehensive analysis error:", error);
      toast({ title: "Error", description: error.message || "An unexpected error occurred", variant: "destructive" });
    } finally {
      setComprehensiveAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'under_review') => {
    e.preventDefault();
    if (!user) return;

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

      const { error } = await supabase
        .from('research_papers')
        .insert({
          id: createUuid(),
          title: formData.title,
          abstract: formData.abstract,
          ai_summary: formData.aiSummary || null,
          keywords: keywordsArray,
          file_url: fileUrl,
          file_name: fileName,
          author_id: user.id,
          status: status,
          research_field: formData.researchField || null,
          research_stage: 'completed',
          funding_status: formData.fundingStatus,
          funding_required: formData.fundingStatus === 'seeking_funding' ? formData.fundingRequired : 0,
          funding_currency: currency,
          problem_statement: formData.problemStatement || null,
          solution_approach: formData.solutionApproach || null,
          practical_applications: formData.practicalApplications.length > 0 ? formData.practicalApplications : null,
          year_completed: formData.yearCompleted,
          research_type: 'completed',
          supervisor_id: null,
          supervisor_approval_status: null,
          allow_download: formData.allowDownload,
          download_credit_cost: formData.allowDownload ? Math.max(0, formData.downloadCreditCost) : 0,
          is_published_journal: formData.isPublishedJournal,
          journal_name: formData.isPublishedJournal ? formData.journalName || null : null,
          journal_url: formData.isPublishedJournal ? formData.journalUrl || null : null,
          is_patented: formData.isPatented,
          patent_number: formData.isPatented ? formData.patentNumber || null : null,
          author_names: formData.authorNames.length > 0 ? formData.authorNames : null,
        });

      if (error) throw error;

      toast({ 
        title: status === 'draft' ? "Saved as Draft" : "Submitted for Review",
        description: status === 'draft' ? "You can continue editing later" : "A reviewer will evaluate your research"
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
            <h1 className="text-2xl font-bold text-foreground">Upload Completed Research</h1>
            <p className="text-muted-foreground">Share your finished research with the world</p>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="border-none shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex gap-4 items-start">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <div className="text-white space-y-2">
                <h4 className="font-bold text-lg">Completed Research Benefits</h4>
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-white/90">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>Visible to industry & investors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Eligible for monetization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>Public after reviewer approval</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>Challenge matching enabled</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={(e) => handleSubmit(e, 'under_review')}>
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
          <Card className="rounded-2xl shadow-lg mb-6">
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
                  <Label className="text-sm font-medium text-primary">AI-Generated Summary</Label>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{formData.aiSummary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis Results */}
          {(formData.problemStatement || formData.solutionApproach || formData.practicalApplications.length > 0) && (
            <Card className="rounded-2xl shadow-lg mb-6 border-primary/20">
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
                        <Badge key={index} variant="secondary" className="px-3 py-1.5 text-sm">
                          {app}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Funding Information */}
          <Card className="rounded-2xl shadow-lg mb-6">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl border-b">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <DollarSign className="w-5 h-5 text-primary" />
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

          {/* Publication & Patent Information */}
          <Card className="rounded-2xl shadow-lg mb-6">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl border-b">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <BookOpen className="w-5 h-5 text-primary" />
                Publication & Patent
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Journal Publication */}
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

              {/* Patent */}
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
                    <div>
                      <Label className="text-sm font-medium">Patent Number</Label>
                      <Input
                        placeholder="e.g., US12345678"
                        value={formData.patentNumber}
                        onChange={(e) => setFormData({ ...formData, patentNumber: e.target.value })}
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Download Option */}
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
              {formData.allowDownload && (
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
              disabled={loading || !formData.title.trim() || !formData.abstract.trim() || !formData.researchField}
              className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Upload className="w-4 h-4 mr-2" />
              Submit for Review
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
