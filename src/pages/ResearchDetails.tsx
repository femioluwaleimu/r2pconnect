import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DownloadAgreementDialog from "@/components/DownloadAgreementDialog";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionError } from "@/lib/edgeFunctionError";
import { useCurrency } from "@/context/CurrencyContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import ResearchProgressTracker from "@/components/ResearchProgressTracker";
import ResearchCredentialLabel from "@/components/ResearchCredentialLabel";
import SupervisorReviewHistory from "@/components/SupervisorReviewHistory";
import SupervisorFeedbackFiles from "@/components/SupervisorFeedbackFiles";
import ChapterReviewPanel from "@/components/ChapterReviewPanel";
import SharedAIReviewHistory from "@/components/ai-supervisor/SharedAIReviewHistory";
import ConvertToCompleted from "@/components/ConvertToCompleted";
import StyleReferencesDisplay from "@/components/StyleReferencesDisplay";
import SupervisorStyleReferencesDisplay from "@/components/SupervisorStyleReferencesDisplay";
import {
  RefreshCw,
  ArrowLeft, 
  FileText, 
  Eye, 
  Download, 
  Calendar, 
  Tag,
  Edit,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Sparkles,
  FlaskConical,
  Banknote,
  Lightbulb,
  Target,
  Wrench,
  GraduationCap,
  UserCheck,
  Award,
  Loader2,
  Brain,
  User,
  Building2,
  BookOpen,
  Shield as ShieldIcon
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { formatLagos } from "@/lib/dateUtils";

interface ResearchPaper {
  id: string;
  title: string;
  abstract: string | null;
  ai_summary: string | null;
  problem_statement: string | null;
  solution_approach: string | null;
  practical_applications: string[] | null;
  status: string;
  views_count: number;
  downloads_count: number;
  created_at: string;
  published_at: string | null;
  file_url: string | null;
  file_name: string | null;
  keywords: string[] | null;
  industry_tags: string[] | null;
  reviewer_comments: string | null;
  research_field: string | null;
  research_stage: string | null;
  funding_status: string | null;
  funding_required: number | null;
  funding_currency: string | null;
  research_type: string | null;
  supervisor_approval_status: string | null;
  supervisor_comments: string | null;
  year_completed: number | null;
  author_id: string;
  supervision_type: string | null;
  ai_style_source: string | null;
  supervisor_id: string | null;
  institution_id: string | null;
  allow_download: boolean | null;
  download_credit_cost: number | null;
  is_published_journal: boolean | null;
  journal_name: string | null;
  journal_url: string | null;
  is_patented: boolean | null;
  patent_number: string | null;
  author_names: string[] | null;
}

interface AuthorInfo {
  full_name: string | null;
  avatar_url: string | null;
  institution_id: string | null;
}

interface InstitutionInfo {
  id: string;
  name: string;
  logo_url: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: FileText },
  under_review: { label: "Under Review", color: "bg-primary text-primary-foreground", icon: Clock },
  revision_requested: { label: "Revision Needed", color: "bg-orange-100 text-orange-600", icon: Clock },
  approved: { label: "Approved", color: "bg-stat-green/20 text-stat-green", icon: CheckCircle },
  published: { label: "Published", color: "bg-primary text-primary-foreground", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive", icon: XCircle }
};

// Special status for supervisor-approved student research
const supervisorApprovedConfig = {
  label: "Supervisor Approved",
  color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  icon: Award
};

const stageLabels: Record<string, string> = {
  concept: "Concept",
  proposal: "Proposal",
  ongoing: "Ongoing",
  completed: "Completed"
};

const fundingLabels: Record<string, { label: string; color: string }> = {
  unfunded: { label: "Unfunded", color: "bg-muted text-muted-foreground" },
  seeking_funding: { label: "Seeking Funding", color: "bg-stat-yellow/20 text-stat-yellow" },
  funded: { label: "Funded", color: "bg-stat-green/20 text-stat-green" }
};

// No longer need parseAISummary - using database fields directly

export default function ResearchDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const [paper, setPaper] = useState<ResearchPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [scanningAI, setScanningAI] = useState(false);
  const [authorInfo, setAuthorInfo] = useState<AuthorInfo | null>(null);
  const [institutionInfo, setInstitutionInfo] = useState<InstitutionInfo | null>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (id) {
      fetchPaper();
    }
  }, [id, currentUserId]);

  const fetchPaper = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('research_papers')
      .select('*, author_id, supervision_type, ai_style_source')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching paper:', error);
      navigate('/dashboard/research');
      return;
    }

    if (data) {
      setPaper(data);
      setIsOwner(currentUserId === data.author_id);

      // Fetch author profile
      const { data: authorData } = await supabase
        .from('public_profiles')
        .select('full_name, avatar_url, institution_id')
        .eq('user_id', data.author_id)
        .maybeSingle();

      if (authorData) {
        setAuthorInfo(authorData);
        if (authorData.institution_id) {
          const { data: instData } = await supabase
            .from('institutions')
            .select('id, name, logo_url, download_credit_cost')
            .eq('id', authorData.institution_id)
            .maybeSingle();
          if (instData) {
            setInstitutionInfo(instData);
            if (instData.download_credit_cost !== null && instData.download_credit_cost !== undefined) {
              setPaper(prev => prev ? { ...prev, download_credit_cost: instData.download_credit_cost } : prev);
            }
          }
        }
      }
    } else {
      navigate('/dashboard/research');
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!paper?.file_url) return;
    if (isOwner) {
      window.open(paper.file_url, '_blank');
    } else {
      setShowDownloadDialog(true);
    }
  };

  const handleAIScan = async () => {
    if (!paper?.abstract) {
      toast({ title: "No abstract to scan", variant: "destructive" });
      return;
    }

    setScanningAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-research', {
        body: { type: 'comprehensive_analysis', content: paper.abstract }
      });

      if (error) {
        const msg = getEdgeFunctionError(error, "Failed to scan research");
        toast({ title: "AI Scan Failed", description: msg, variant: "destructive" });
        return;
      }
      if (data.error) {
        toast({ title: "AI Error", description: data.message || data.error, variant: "destructive" });
        return;
      }

      let jsonString = data.result
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonString = jsonMatch[0];
      
      const analysisResult = JSON.parse(jsonString);

      // Save to database
      await supabase
        .from('research_papers')
        .update({
          problem_statement: analysisResult.problem || null,
          solution_approach: analysisResult.solution || null,
          practical_applications: Array.isArray(analysisResult.applications) ? analysisResult.applications : null,
        })
        .eq('id', paper.id);

      // Refresh
      fetchPaper();
      toast({ title: "AI Analysis Complete!", description: `Credits remaining: ${data.credits_remaining}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setScanningAI(false);
    }
  };

  // Determine if chapter review should be shown (students only, valid statuses)
  const showChapterReview = paper && 
    paper.research_type === 'student' && 
    ['draft', 'ongoing', 'revision_requested', 'approved', 'under_review'].includes(paper.status);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!paper) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Research paper not found</p>
          <Link to="/dashboard/research">
            <Button variant="outline" className="mt-4">Back to My Research</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Determine the display status - prioritize supervisor approval status for student research
  const isSupervisorApproved = paper.research_type === 'student' && paper.supervisor_approval_status === 'approved';
  const displayStatus = isSupervisorApproved ? supervisorApprovedConfig : (statusConfig[paper.status] || statusConfig.draft);
  const StatusIcon = displayStatus.icon;
  const fundingInfo = fundingLabels[paper.funding_status || 'unfunded'];
  
  // Use database fields directly
  const hasSummaryData = paper.problem_statement || paper.solution_approach || (paper.practical_applications && paper.practical_applications.length > 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl flex-shrink-0 mt-0.5">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground break-words">{paper.title}</h1>
                <Badge className={`${displayStatus.color} rounded-full flex-shrink-0`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {displayStatus.label}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Uploaded on {formatLagos(paper.created_at)}
              </p>
            </div>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2 flex-wrap pl-11 sm:pl-12">
              {(paper.supervisor_approval_status === 'revision_requested' || paper.status === 'revision_requested') && (
                <Link to={`/dashboard/research/resubmit/${paper.id}`}>
                  <Button size="sm" className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resubmit
                  </Button>
                </Link>
              )}
              {['draft', 'under_review', 'revision_requested'].includes(paper.status) && (
                <Link to={`/dashboard/research/edit/${paper.id}`}>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Author & Institution Info */}
        {authorInfo && (
          <Card className="rounded-2xl shadow-tick">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <Link to={`/researcher/${paper.author_id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarImage src={authorInfo.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {authorInfo.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{authorInfo.full_name || 'Unknown Researcher'}</p>
                    <p className="text-xs text-muted-foreground">Researcher</p>
                  </div>
                </Link>
                {institutionInfo && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center overflow-hidden border">
                      {institutionInfo.logo_url ? (
                        <img src={institutionInfo.logo_url} alt={institutionInfo.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{institutionInfo.name}</p>
                      <p className="text-xs text-muted-foreground">Institution</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Author Names */}
        {paper.author_names && paper.author_names.length > 0 && (
          <Card className="rounded-2xl shadow-tick">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2">Authors</p>
              <div className="flex flex-wrap gap-2">
                {paper.author_names.map((name, idx) => (
                  <Badge key={idx} variant="secondary" className="rounded-full text-sm px-3 py-1">
                    <User className="w-3 h-3 mr-1" />
                    {name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Research Credential Label */}
        <ResearchCredentialLabel
          institutionId={paper.institution_id}
          supervisorId={paper.supervisor_id}
        />

        {/* Progress Tracker for Student Research */}
        {paper.research_type === 'student' && (
          <Card className="rounded-2xl shadow-tick">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Research Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResearchProgressTracker
                researchType="student"
                status={paper.status}
                supervisorApprovalStatus={paper.supervisor_approval_status}
              />
              {paper.supervisor_comments && (
                <div className="mt-4 p-4 bg-warning/10 rounded-xl border border-warning/20">
                  <p className="text-sm font-medium text-warning mb-2">Supervisor Comments</p>
                  <div 
                    className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5"
                    dangerouslySetInnerHTML={{ __html: paper.supervisor_comments }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Convert to Completed Option - Show when supervisor approved */}
        {paper.research_type === 'student' && isSupervisorApproved && isOwner && (
          <ConvertToCompleted
            researchId={paper.id}
            title={paper.title}
            abstract={paper.abstract}
            supervisorApprovalStatus={paper.supervisor_approval_status}
            onConversionComplete={fetchPaper}
          />
        )}

        {/* Style References Display for AI Supervised Research */}
        {paper.research_type === 'student' && paper.supervision_type === 'ai' && (
          <StyleReferencesDisplay 
            userId={paper.author_id}
            supervisionType={paper.supervision_type}
            aiStyleSource={paper.ai_style_source}
          />
        )}

        {/* Supervisor Style References Display */}
        {paper.research_type === 'student' && isOwner && (
          <SupervisorStyleReferencesDisplay studentId={paper.author_id} />
        )}


        {paper.research_type === 'student' && (
          <div className="space-y-6">
            <SupervisorReviewHistory researchId={paper.id} collapsible={true} />
            <SupervisorFeedbackFiles researchId={paper.id} isStudent={true} />
          </div>
        )}

        {/* AI Chapter Review Panel for Student Research */}
        {showChapterReview && (
          <>
            <ChapterReviewPanel
              researchId={paper.id}
              researchStatus={paper.status}
              fileUrl={paper.file_url}
              isOwner={isOwner}
              isSupervisor={false}
            />
            {isOwner && (
              <SharedAIReviewHistory researchId={paper.id} viewerRole="student" />
            )}
          </>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 rounded-xl bg-stat-blue/10 shadow-tick">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{paper.views_count}</p>
                <p className="text-sm text-muted-foreground">Views</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 rounded-xl bg-stat-green/10 shadow-tick">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-secondary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{paper.downloads_count}</p>
                <p className="text-sm text-muted-foreground">Downloads</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 rounded-xl bg-stat-purple/10 shadow-tick">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-stat-purple" />
              <div>
                <p className="text-lg font-bold text-foreground">
                  {stageLabels[paper.research_stage || 'concept']}
                </p>
                <p className="text-sm text-muted-foreground">Stage</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 rounded-xl bg-stat-yellow/10 shadow-tick">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-warning" />
              <div>
                <p className="text-lg font-bold text-foreground">
                  {paper.published_at ? formatLagos(paper.published_at) : 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">Published</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Research Field & Funding Info */}
            <Card className="rounded-2xl shadow-tick">
              <CardContent className="p-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  {paper.research_field && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Research Field</p>
                      <Badge variant="secondary" className="rounded-full text-sm">
                        {paper.research_field}
                      </Badge>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Funding Status</p>
                    <Badge className={`${fundingInfo.color} rounded-full`}>
                      <Banknote className="w-3 h-3 mr-1" />
                      {fundingInfo.label}
                    </Badge>
                    {paper.funding_status === 'seeking_funding' && paper.funding_required && paper.funding_required > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Required: {formatCurrency(paper.funding_required, paper.funding_currency || 'NGN')}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Abstract */}
            <Card className="rounded-2xl shadow-tick">
              <CardHeader>
                <CardTitle>Abstract</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {paper.abstract || "No abstract provided"}
                </p>
              </CardContent>
            </Card>

            {/* AI Scan Button for approved/published research */}
            {isOwner && ['approved', 'published'].includes(paper.status) && (
              <Card className="rounded-2xl shadow-tick border-primary/20">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">AI Research Analysis</p>
                      <p className="text-xs text-muted-foreground">
                        {hasSummaryData ? "Rescan to update problem, solution & applications" : "Generate problem, solution & industry applications"}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleAIScan}
                    disabled={scanningAI}
                    className="rounded-xl"
                    size="sm"
                  >
                    {scanningAI ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Scanning...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-1" /> {hasSummaryData ? "Rescan" : "Scan"}</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* AI Summary - Using Database Fields */}
            {hasSummaryData && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Research Analysis</h3>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Problem Card */}
                  {paper.problem_statement && (
                    <Card className="rounded-2xl shadow-tick border-l-4 border-l-destructive bg-gradient-to-br from-destructive/5 to-destructive/10">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-destructive flex items-center justify-center flex-shrink-0">
                            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <h4 className="font-bold text-foreground text-sm sm:text-base">Problem</h4>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {paper.problem_statement}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Solution Card */}
                  {paper.solution_approach && (
                    <Card className="rounded-2xl shadow-tick border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-primary/10">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <h4 className="font-bold text-foreground text-sm sm:text-base">Solution</h4>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {paper.solution_approach}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Application Card */}
                  {paper.practical_applications && paper.practical_applications.length > 0 && (
                    <Card className="rounded-2xl shadow-tick border-l-4 border-l-stat-green bg-gradient-to-br from-stat-green/5 to-stat-green/10 sm:col-span-2 lg:col-span-1">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-stat-green flex items-center justify-center flex-shrink-0">
                            <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <h4 className="font-bold text-foreground text-sm sm:text-base">Applications</h4>
                        </div>
                        <ul className="space-y-1">
                          {paper.practical_applications.map((app, idx) => (
                            <li key={idx} className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                              <span className="text-stat-green mt-0.5">•</span>
                              {app}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Reviewer Comments */}
            {paper.reviewer_comments && (
              <Card className="rounded-2xl shadow-tick border-warning/50">
                <CardHeader>
                  <CardTitle>Reviewer Comments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {paper.reviewer_comments}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {/* Journal & Patent Info */}
            {paper.research_type === 'completed' && (paper.is_published_journal || paper.is_patented) && (
              <Card className="rounded-2xl shadow-tick">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Publication & Patent
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {paper.is_published_journal && (
                    <div className="p-3 bg-primary/5 rounded-xl">
                      <p className="text-xs text-muted-foreground mb-1">Published in Journal</p>
                      <p className="font-medium text-sm text-foreground">{paper.journal_name || 'Yes'}</p>
                      {paper.journal_url && (
                        <a href={paper.journal_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                          <ExternalLink className="w-3 h-3" /> View Publication
                        </a>
                      )}
                    </div>
                  )}
                  {paper.is_patented && (
                    <div className="p-3 bg-amber-500/5 rounded-xl">
                      <p className="text-xs text-muted-foreground mb-1">Patented</p>
                      <p className="font-medium text-sm text-foreground">{paper.patent_number || 'Yes'}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* File */}
            {paper.file_url && (isOwner || paper.allow_download !== false) && (
              <Card className="rounded-2xl shadow-tick">
                <CardHeader>
                  <CardTitle>Research File</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(isOwner || paper.allow_download !== false) && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                      <FileText className="w-8 h-8 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{paper.file_name || 'Research Paper'}</p>
                        {!isOwner && (paper.download_credit_cost || 0) > 0 && (
                          <p className="text-xs text-muted-foreground">{paper.download_credit_cost} credit{(paper.download_credit_cost || 0) > 1 ? 's' : ''}</p>
                        )}
                      </div>
                      <Button size="sm" onClick={handleDownload} className="rounded-xl">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  {isOwner && (paper.status === 'published' || paper.status === 'approved') && (
                    <>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">Allow Public Download</p>
                          <p className="text-xs text-muted-foreground">Let others download your research document</p>
                        </div>
                        <Switch
                          checked={paper.allow_download !== false}
                          onCheckedChange={async (checked) => {
                            const { error } = await supabase
                              .from('research_papers')
                              .update({ allow_download: checked })
                              .eq('id', paper.id);
                            if (error) {
                              toast({ title: "Error", description: error.message, variant: "destructive" });
                            } else {
                              setPaper({ ...paper, allow_download: checked });
                              toast({ title: checked ? "Download enabled" : "Download disabled" });
                            }
                          }}
                        />
                      </div>
                      {paper.allow_download !== false && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Download cost is set by your institution ({paper.download_credit_cost || 0} credits)
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {paper && !isOwner && (
              <DownloadAgreementDialog
                open={showDownloadDialog}
                onOpenChange={setShowDownloadDialog}
                paper={{
                  id: paper.id,
                  title: paper.title,
                  file_url: paper.file_url,
                  download_credit_cost: paper.download_credit_cost || 0,
                  author_id: paper.author_id,
                }}
                authorName={authorInfo?.full_name || null}
                onDownloaded={() => {
                  setPaper({ ...paper, downloads_count: (paper.downloads_count || 0) + 1 });
                }}
              />
            )}

            {/* Keywords */}
            {paper.keywords && paper.keywords.length > 0 && (
              <Card className="rounded-2xl shadow-tick">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Keywords
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {paper.keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="secondary" className="rounded-full">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Industry Tags */}
            {paper.industry_tags && paper.industry_tags.length > 0 && (
              <Card className="rounded-2xl shadow-tick">
                <CardHeader>
                  <CardTitle>Industry Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {paper.industry_tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="rounded-full">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
