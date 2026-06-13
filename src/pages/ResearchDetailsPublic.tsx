import { useState, useEffect } from "react";
import MiniFAQBlock from "@/components/faq/MiniFAQBlock";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DownloadAgreementDialog from "@/components/DownloadAgreementDialog";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { useSEO } from "@/hooks/useSEO";
import ResearchCredentialLabel from "@/components/ResearchCredentialLabel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  FileText, 
  Eye, 
  Download, 
  Calendar, 
  Tag,
  Sparkles,
  FlaskConical,
  User,
  Video,
  Play,
  Building2,
  Lightbulb,
  Target,
  Rocket,
  Copy,
  Check,
  GraduationCap
} from "lucide-react";
import { formatLagos } from "@/lib/dateUtils";

interface ResearchPaper {
  id: string;
  title: string;
  abstract: string | null;
  ai_summary: string | null;
  status: string;
  views_count: number;
  downloads_count: number;
  created_at: string;
  published_at: string | null;
  file_url: string | null;
  file_name: string | null;
  keywords: string[] | null;
  industry_tags: string[] | null;
  research_field: string | null;
  research_stage: string | null;
  author_id: string;
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

interface Documentary {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  views_count: number | null;
}

interface Author {
  full_name: string | null;
  avatar_url: string | null;
  institution_id: string | null;
}

interface Institution {
  id: string;
  name: string;
  logo_url: string | null;
}

interface ParsedAISummary {
  problem: string;
  solution: string;
  application: string;
}

function parseAISummary(summary: string | null): ParsedAISummary | null {
  if (!summary) return null;
  
  const problemMatch = summary.match(/(?:Problem|Issue|Challenge):\s*([\s\S]*?)(?=(?:Solution|Approach|Method):|$)/i);
  const solutionMatch = summary.match(/(?:Solution|Approach|Method):\s*([\s\S]*?)(?=(?:Application|Impact|Result):|$)/i);
  const applicationMatch = summary.match(/(?:Application|Impact|Result):\s*([\s\S]*?)$/i);
  
  if (problemMatch || solutionMatch || applicationMatch) {
    return {
      problem: problemMatch?.[1]?.trim() || "",
      solution: solutionMatch?.[1]?.trim() || "",
      application: applicationMatch?.[1]?.trim() || "",
    };
  }
  
  // Fallback: split by paragraphs if no headers found
  const paragraphs = summary.split(/\n\n+/).filter(p => p.trim());
  if (paragraphs.length >= 3) {
    return {
      problem: paragraphs[0]?.trim() || "",
      solution: paragraphs[1]?.trim() || "",
      application: paragraphs.slice(2).join("\n\n").trim() || "",
    };
  }
  
  return null;
}

export default function ResearchDetailsPublic() {
  const { id } = useParams<{ id: string }>();
  const [paper, setPaper] = useState<ResearchPaper | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [documentary, setDocumentary] = useState<Documentary | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [supervisorName, setSupervisorName] = useState<string | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (id) {
      fetchPaper();
    }
  }, [id]);

  // Dynamic SEO
  useSEO({
    title: paper ? `${paper.title} | Research` : "Research Details",
    description: paper?.abstract
      ? paper.abstract.substring(0, 155) + (paper.abstract.length > 155 ? "…" : "")
      : "Read research papers on R2PConnect – Africa's AI-powered research platform.",
    url: paper ? `/research/${paper.id}` : "/research",
    type: "article",
    keywords: paper ? [
      ...(paper.keywords || []),
      ...(paper.industry_tags || []),
      paper.research_field,
      "research",
      "R2PConnect",
    ].filter(Boolean).join(", ") : undefined,
  });

  const fetchPaper = async () => {
    setLoading(true);
    
    const { data: paperData, error: paperError } = await supabase
      .from('research_papers')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle();

    if (paperError || !paperData) {
      setLoading(false);
      return;
    }

    setPaper(paperData);
    
    try {
      await supabase.functions.invoke('track-research-view', {
        body: { research_id: id, action: 'view' }
      });
    } catch (e) {
      console.error('Failed to track view:', e);
    }

    const { data: authorData } = await supabase
      .from('public_profiles')
      .select('full_name, avatar_url, institution_id')
      .eq('user_id', paperData.author_id)
      .maybeSingle();

    if (authorData) {
      setAuthor(authorData);

      if (authorData.institution_id) {
        const { data: instData } = await supabase
          .from('institutions')
          .select('id, name, logo_url, download_credit_cost')
          .eq('id', authorData.institution_id)
          .maybeSingle();
        if (instData) {
          // Override paper download_credit_cost with institution setting
          if (instData.download_credit_cost !== null && instData.download_credit_cost !== undefined) {
            setPaper(prev => prev ? { ...prev, download_credit_cost: instData.download_credit_cost } : prev);
          }
          setInstitution(instData);
        }
      }
    }

    // Fetch supervisor name
    if (paperData.supervisor_id) {
      const { data: supProfile } = await supabase
        .from('public_profiles')
        .select('full_name')
        .eq('user_id', paperData.supervisor_id)
        .maybeSingle();
      if (supProfile) setSupervisorName(supProfile.full_name);
    }

    // Fetch department
    if (paperData.department_id) {
      const { data: deptData } = await supabase
        .from('departments')
        .select('name')
        .eq('id', paperData.department_id)
        .maybeSingle();
      if (deptData) setDepartment(deptData.name);
    }

    const { data: docData } = await supabase
      .from('documentaries')
      .select('*')
      .eq('researcher_id', paperData.author_id)
      .limit(1)
      .maybeSingle();

    if (docData) {
      setDocumentary(docData);
    }

    setLoading(false);
  };

  const handleDownloadClick = () => {
    if (!paper?.file_url) return;
    if (!currentUser) {
      // Redirect to login
      window.location.href = `/auth?redirect=/research/${paper.id}`;
      return;
    }
    setShowDownloadDialog(true);
  };

  const handleCopy = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const parsedSummary = paper?.ai_summary ? parseAISummary(paper.ai_summary) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="max-w-6xl mx-auto px-4 py-20">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Research Not Found</h2>
          <p className="text-muted-foreground mb-6">This research paper may not exist or is not publicly available.</p>
          <Link to="/research">
            <Button className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Research
            </Button>
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      
      {/* Video Modal */}
      {playingVideo && documentary && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" 
          onClick={() => setPlayingVideo(false)}
        >
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-background rounded-xl overflow-hidden">
              <div className="aspect-video">
                <iframe
                  src={documentary.video_url}
                  className="w-full h-full"
                  allowFullScreen
                  title={documentary.title}
                />
              </div>
              <div className="p-4">
                <h3 className="text-xl font-bold text-foreground">{documentary.title}</h3>
                {documentary.description && (
                  <p className="text-muted-foreground mt-2">{documentary.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-24 pb-12 gradient-hero">
        <div className="max-w-6xl mx-auto px-4">
          <Link to="/research" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Research
          </Link>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">{paper.title}</h1>

          {/* Author Names */}
          {paper.author_names && paper.author_names.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {paper.author_names.map((name, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-sm text-white/90">
                  <User className="w-3 h-3" />
                  {name}
                </span>
              ))}
            </div>
          )}
          
          {/* Author & Institution Cards */}
          <div className="flex flex-wrap items-center gap-4">
            {author && (
              <Link to={`/researcher/${paper.author_id}`}>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4 hover:bg-white/20 transition-colors">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/30">
                    {author.avatar_url ? (
                      <img src={author.avatar_url} alt={author.full_name || ''} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg">{author.full_name || 'Anonymous Researcher'}</p>
                    <p className="text-white/70 text-sm">Researcher</p>
                  </div>
                </div>
              </Link>
            )}
            
            {institution && (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4">
                <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                  {institution.logo_url ? (
                    <img src={institution.logo_url} alt={institution.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <Building2 className="w-7 h-7 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">{institution.name}</p>
                  <p className="text-white/70 text-sm">Institution</p>
                </div>
              </div>
            )}
          </div>
        </div>
        </section>

      {/* Credential Label */}
      <section className="max-w-6xl mx-auto px-4 -mt-4 mb-4">
        <ResearchCredentialLabel
          institutionId={paper.institution_id}
          supervisorId={paper.supervisor_id}
          department={author?.institution_id ? undefined : undefined}
        />
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <Card className="p-5 rounded-2xl stat-blue border-none shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{paper.views_count}</p>
                  <p className="text-sm text-white/70">Views</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 rounded-2xl stat-mint border-none shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{paper.downloads_count}</p>
                  <p className="text-sm text-white/70">Downloads</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 rounded-2xl stat-yellow border-none shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <FlaskConical className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white capitalize">
                    {paper.research_stage || 'N/A'}
                  </p>
                  <p className="text-sm text-white/70">Stage</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 rounded-2xl stat-green border-none shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {paper.published_at ? formatLagos(paper.published_at) : 'N/A'}
                  </p>
                  <p className="text-sm text-white/70">Published</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Research Field */}
              {paper.research_field && (
                <Card className="rounded-2xl border-none shadow-tick">
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground mb-3">Research Field</p>
                    <Badge variant="secondary" className="rounded-full text-sm px-4 py-1">
                      {paper.research_field}
                    </Badge>
                  </CardContent>
                </Card>
              )}

              {/* Abstract */}
              <Card className="rounded-2xl border-none shadow-tick">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Abstract</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {paper.abstract || "No abstract provided"}
                  </p>
                </CardContent>
              </Card>

              {/* AI Summary Cards */}
              {parsedSummary && (parsedSummary.problem || parsedSummary.solution || parsedSummary.application) ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold text-foreground">AI Summary</h2>
                  </div>
                  
                  {/* Problem Card */}
                  {parsedSummary.problem && (
                    <Card className="rounded-2xl border-none shadow-tick overflow-hidden">
                      <div className="h-2 bg-gradient-to-r from-red-500 to-orange-500" />
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <Target className="w-5 h-5 text-red-500" />
                          </div>
                          <span>Problem</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto"
                            onClick={() => handleCopy(parsedSummary.problem, 'problem')}
                          >
                            {copiedSection === 'problem' ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div 
                          className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: parsedSummary.problem.replace(/\n/g, '<br/>') }}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Solution Card */}
                  {parsedSummary.solution && (
                    <Card className="rounded-2xl border-none shadow-tick overflow-hidden">
                      <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500" />
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Lightbulb className="w-5 h-5 text-blue-500" />
                          </div>
                          <span>Solution</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto"
                            onClick={() => handleCopy(parsedSummary.solution, 'solution')}
                          >
                            {copiedSection === 'solution' ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div 
                          className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: parsedSummary.solution.replace(/\n/g, '<br/>') }}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Application Card */}
                  {parsedSummary.application && (
                    <Card className="rounded-2xl border-none shadow-tick overflow-hidden">
                      <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500" />
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <Rocket className="w-5 h-5 text-green-500" />
                          </div>
                          <span>Application</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto"
                            onClick={() => handleCopy(parsedSummary.application, 'application')}
                          >
                            {copiedSection === 'application' ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div 
                          className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: parsedSummary.application.replace(/\n/g, '<br/>') }}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : paper.ai_summary ? (
                <Card className="rounded-2xl border-none shadow-tick bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      AI Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {paper.ai_summary}
                    </p>
                  </CardContent>
                </Card>
              ) : null}

              {/* Documentary Section */}
              {documentary && (
                <Card className="rounded-2xl border-none shadow-tick overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="w-5 h-5 text-primary" />
                      Related Documentary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="relative aspect-video bg-muted rounded-xl overflow-hidden cursor-pointer group"
                      onClick={() => setPlayingVideo(true)}
                    >
                      {documentary.thumbnail_url ? (
                        <img 
                          src={documentary.thumbnail_url} 
                          alt={documentary.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                          <Video className="w-12 h-12 text-primary/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
                        </div>
                      </div>
                    </div>
                    <h4 className="font-semibold text-foreground mt-3">{documentary.title}</h4>
                    {documentary.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{documentary.description}</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              {/* Author Info Card */}
              {author && (
                <Card className="rounded-2xl border-none shadow-tick overflow-hidden">
                  <div className="h-16 bg-gradient-to-r from-primary/80 to-accent/80" />
                  <CardContent className="p-5 -mt-8">
                    <div className="flex items-end gap-3 mb-4">
                      <Link to={`/researcher/${paper.author_id}`}>
                        <div className="w-16 h-16 rounded-full border-4 border-background bg-muted flex items-center justify-center overflow-hidden shadow-md">
                          {author.avatar_url ? (
                            <img src={author.avatar_url} alt={author.full_name || ''} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-7 h-7 text-muted-foreground" />
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0 pb-1">
                        <Link to={`/researcher/${paper.author_id}`} className="hover:underline">
                          <p className="font-bold text-foreground truncate">{author.full_name || 'Anonymous Researcher'}</p>
                        </Link>
                        <p className="text-xs text-muted-foreground">Author</p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {institution && (
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                            {institution.logo_url ? (
                              <img src={institution.logo_url} alt={institution.name} className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-sm text-foreground truncate">{institution.name}</span>
                        </div>
                      )}

                      {department && (
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm text-muted-foreground truncate">{department}</span>
                        </div>
                      )}

                      {supervisorName && (
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Supervisor</p>
                            <p className="text-sm text-foreground truncate">{supervisorName}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Download Button */}
              {paper.file_url && paper.allow_download !== false && (
                <Card className="rounded-2xl border-none shadow-tick">
                  <CardHeader>
                    <CardTitle>Research File</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 p-4 bg-muted rounded-xl mb-4">
                      <FileText className="w-10 h-10 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{paper.file_name || 'Research Paper'}</p>
                        {(paper.download_credit_cost || 0) > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {paper.download_credit_cost} credit{(paper.download_credit_cost || 0) > 1 ? 's' : ''} to download
                          </p>
                        )}
                      </div>
                    </div>
                    <Button onClick={handleDownloadClick} className="w-full rounded-xl gradient-hero text-white">
                      <Download className="w-4 h-4 mr-2" />
                      {!currentUser ? 'Login to Download' : (paper.download_credit_cost || 0) > 0 ? `Download (${paper.download_credit_cost} Credits)` : 'Download Paper'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {paper && (
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
                  authorName={author?.full_name || null}
                  onDownloaded={() => {
                    setPaper({ ...paper, downloads_count: (paper.downloads_count || 0) + 1 });
                  }}
                />
              )}

              {/* Keywords */}
              {paper.keywords && paper.keywords.length > 0 && (
                <Card className="rounded-2xl border-none shadow-tick">
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
                <Card className="rounded-2xl border-none shadow-tick">
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
      </section>

      <MiniFAQBlock
        displayLocation="research_public"
        title="About Published Research"
        fallbackQuestions={[
          { question: "Who approves research before it becomes public?", answer: "Research goes through a multi-step approval process: first by the assigned supervisor, then by institutional peer reviewers. Only after passing these quality checks is it published publicly." },
          { question: "How is quality validated?", answer: "R2PConnect uses a combination of supervisor review, peer review, plagiarism checks, and AI content analysis to ensure research meets academic standards before publication." },
          { question: "Can industry contact researchers directly?", answer: "Yes. Industry partners can view published research and send collaboration invites or challenge matches directly to researchers through the platform." },
        ]}
      />

      <PublicFooter />
    </div>
  );
}
