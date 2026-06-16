import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, FileText, Clock, CheckCircle, XCircle, Eye, Download, MoreVertical, Lightbulb, Search, Edit, Trash2, Sparkles, TrendingUp, GraduationCap, BookOpen, RefreshCw, Bot, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SwitchToHumanSupervisor from "@/components/SwitchToHumanSupervisor";
import { formatLagos } from "@/lib/dateUtils";

interface ResearchPaper {
  id: string;
  title: string;
  abstract: string | null;
  status: string;
  views_count: number;
  downloads_count: number;
  created_at: string;
  file_name: string | null;
  research_type: string | null;
  supervisor_approval_status: string | null;
  supervision_type: string | null;
  research_level: string | null;
  research_purpose: string | null;
}

const LEVEL_LABELS: Record<string, string> = {
  nd_hnd: "ND / HND",
  undergraduate: "Undergraduate",
  pgd: "PGD",
  msc: "MSc / M.Tech",
  phd: "PhD",
  lecturer: "Lecturer",
  industry: "Industry",
  independent: "Independent",
};

const PURPOSE_LABELS: Record<string, string> = {
  academic_submission: "Academic Submission",
  publication: "Publication",
  commercialisation: "Commercialisation",
  grant_application: "Grant Application",
  personal_development: "Personal Development",
};

const sortPapersLatestFirst = (items: ResearchPaper[]) =>
  [...items].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

const normalizePapers = (value: unknown): ResearchPaper[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((paper): paper is Record<string, any> => Boolean(paper) && typeof paper === "object")
    .map((paper) => ({
      id: String(paper.id || ""),
      title: String(paper.title || "Untitled research"),
      abstract: paper.abstract == null ? null : String(paper.abstract),
      status: String(paper.status || "draft"),
      views_count: Number(paper.views_count || 0),
      downloads_count: Number(paper.downloads_count || 0),
      created_at: String(paper.created_at || new Date(0).toISOString()),
      file_name: paper.file_name == null ? null : String(paper.file_name),
      research_type: paper.research_type == null ? null : String(paper.research_type),
      supervisor_approval_status: paper.supervisor_approval_status == null ? null : String(paper.supervisor_approval_status),
      supervision_type: paper.supervision_type == null ? null : String(paper.supervision_type),
      research_level: paper.research_level == null ? null : String(paper.research_level),
      research_purpose: paper.research_purpose == null ? null : String(paper.research_purpose),
    }))
    .filter((paper) => paper.id);
};

const statusConfig: Record<string, { label: string; color: string; icon: any; gradient: string }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", icon: FileText, gradient: "from-slate-500 to-slate-600" },
  under_review: { label: "Under Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock, gradient: "from-amber-500 to-orange-500" },
  revision_requested: { label: "Revision Needed", color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", icon: RefreshCw, gradient: "from-orange-500 to-red-500" },
  supervisor_review: { label: "Supervisor Review", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: GraduationCap, gradient: "from-purple-500 to-violet-500" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle, gradient: "from-emerald-500 to-green-500" },
  published: { label: "Published", color: "bg-gradient-to-r from-primary to-accent text-white", icon: CheckCircle, gradient: "from-primary to-accent" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", icon: XCircle, gradient: "from-red-500 to-rose-500" }
};

export default function MyResearch() {
  const [user, setUser] = useState<User | null>(null);
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchPapers(user.id);
    });
  }, [navigate]);

  useEffect(() => {
    const latestFirst = sortPapersLatestFirst(papers);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredPapers(latestFirst.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.abstract?.toLowerCase().includes(query)
      ));
    } else {
      setFilteredPapers(latestFirst);
    }
  }, [searchQuery, papers]);

  const fetchPapers = async (userId: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('research_papers')
        .select('*')
        .eq('author_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        const latestFirst = sortPapersLatestFirst(normalizePapers(data));
        setPapers(latestFirst);
        setFilteredPapers(latestFirst);
      }
    } catch (error: any) {
      const message = error?.message || 'Failed to load research papers';
      setFetchError(message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
      setPapers([]);
      setFilteredPapers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('research_papers')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete research paper", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Research paper deleted successfully" });
      setPapers(papers.filter(p => p.id !== deleteId));
    }
    setDeleteId(null);
  };

  const statsData = [
    { 
      label: "Total Papers", 
      value: papers.length, 
      icon: FileText, 
      gradient: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30"
    },
    { 
      label: "Published", 
      value: papers.filter(p => p.status === 'published').length, 
      icon: CheckCircle, 
      gradient: "from-emerald-500 to-green-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30"
    },
    { 
      label: "Under Review", 
      value: papers.filter(p => p.status === 'under_review' || p.status === 'supervisor_review').length, 
      icon: Clock, 
      gradient: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/30"
    },
    { 
      label: "Drafts", 
      value: papers.filter(p => p.status === 'draft').length, 
      icon: BookOpen, 
      gradient: "from-slate-500 to-slate-600",
      bgColor: "bg-slate-50 dark:bg-slate-950/30"
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Research</h1>
            <p className="text-muted-foreground">Manage your research papers and submissions</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link to="/dashboard/research/start-student">
              <Button className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 w-full sm:w-auto shadow-lg shadow-blue-500/25 text-white">
                <GraduationCap className="w-4 h-4 mr-2" />
                Start Student Research
              </Button>
            </Link>
            <Link to="/dashboard/research/upload-completed">
              <Button className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 w-full sm:w-auto shadow-lg shadow-rose-500/25 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Upload Completed Research
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your research..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl pl-9 border-border/50 bg-card"
          />
        </div>

        {/* Stats with Beautiful Gradients */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => (
            <Card key={index} className={`p-5 rounded-2xl border-0 shadow-lg shadow-black/5 ${stat.bgColor} overflow-hidden relative group`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-10 rounded-full -translate-y-8 translate-x-8" />
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2 text-lg">Research Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Use AI tools to generate compelling abstracts and summaries</li>
                  <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Add relevant keywords to increase discoverability</li>
                  <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Keep your drafts updated before submitting for review</li>
                  <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Published papers can be discovered by industry partners</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Papers List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading your research...</p>
          </div>
        ) : fetchError ? (
          <Card className="p-12 text-center rounded-2xl border-dashed border-2 bg-muted/20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500/80" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Unable to load research</h3>
            <p className="text-muted-foreground mb-6">{fetchError}</p>
            <Button onClick={() => user && fetchPapers(user.id)} className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
              Retry
            </Button>
          </Card>
        ) : filteredPapers.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-dashed border-2 bg-muted/20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <FileText className="w-10 h-10 text-primary/50" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {searchQuery ? 'No matching papers' : 'No research papers yet'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery ? 'Try a different search term' : 'Start by uploading your first research paper'}
            </p>
            {!searchQuery && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/dashboard/research/start-student">
                  <Button className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg text-white">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Start Student Research
                  </Button>
                </Link>
                <Link to="/dashboard/research/upload-completed">
                  <Button className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 shadow-lg text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Completed Research
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPapers.map((paper, index) => {
              const status = statusConfig[paper.status] || statusConfig.draft;
              const StatusIcon = status.icon;
              return (
                <Card 
                  key={paper.id} 
                  className="group hover:shadow-xl transition-all duration-300 rounded-2xl border-border/50 overflow-hidden animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row">
                      {/* Left gradient accent */}
                      <div className={`w-full lg:w-1.5 h-1.5 lg:h-auto bg-gradient-to-r lg:bg-gradient-to-b ${status.gradient}`} />
                      
                      <div className="flex-1 p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              <Link 
                                to={`/dashboard/research/${paper.id}`}
                                className="font-semibold text-lg text-foreground hover:text-primary transition-colors line-clamp-1 group-hover:underline underline-offset-2"
                              >
                                {paper.title}
                              </Link>
                              <Badge className={`${status.color} rounded-full px-3 py-1 font-medium`}>
                                <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                                {status.label}
                              </Badge>
                              {paper.research_type === 'student' && (
                                <Badge variant="outline" className="rounded-full border-blue-500/50 text-blue-600 dark:text-blue-400">
                                  <GraduationCap className="w-3 h-3 mr-1" />
                                  Student
                                </Badge>
                              )}
                              {paper.supervision_type === 'ai' && paper.research_type === 'student' && (
                                <Badge variant="outline" className="rounded-full border-purple-500/50 text-purple-600 dark:text-purple-400">
                                  <Bot className="w-3 h-3 mr-1" />
                                  AI Supervised
                                </Badge>
                              )}
                              {paper.research_level && LEVEL_LABELS[paper.research_level] && (
                                <Badge variant="outline" className="rounded-full border-indigo-500/50 text-indigo-600 dark:text-indigo-400">
                                  <GraduationCap className="w-3 h-3 mr-1" />
                                  {LEVEL_LABELS[paper.research_level]}
                                </Badge>
                              )}
                              {paper.research_purpose && PURPOSE_LABELS[paper.research_purpose] && (
                                <Badge variant="outline" className="rounded-full border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
                                  <Lightbulb className="w-3 h-3 mr-1" />
                                  {PURPOSE_LABELS[paper.research_purpose]}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                              {paper.abstract || "No abstract provided"}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full">
                                <Eye className="w-4 h-4 text-primary" />
                                <span className="font-medium">{paper.views_count}</span>
                                <span className="text-muted-foreground">views</span>
                              </span>
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full">
                                <Download className="w-4 h-4 text-accent" />
                                <span className="font-medium">{paper.downloads_count}</span>
                                <span className="text-muted-foreground">downloads</span>
                              </span>
                              <span className="text-muted-foreground">
                                {formatLagos(paper.created_at)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                            {/* Switch to human supervisor button for AI-supervised research */}
                            {paper.supervision_type === 'ai' && paper.research_type === 'student' && paper.status === 'draft' && (
                              <SwitchToHumanSupervisor
                                researchId={paper.id}
                                onSwitched={() => user && fetchPapers(user.id)}
                              />
                            )}
                            <Link to={`/dashboard/research/${paper.id}`}>
                              <Button variant="outline" size="sm" className="rounded-xl border-primary/30 hover:border-primary hover:bg-primary/5">
                                <Eye className="w-4 h-4 mr-1.5" />
                                View
                              </Button>
                            </Link>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl">
                                <DropdownMenuItem onClick={() => navigate(`/dashboard/research/${paper.id}`)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {paper.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => navigate(`/dashboard/research/edit/${paper.id}`)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {(paper.supervisor_approval_status === 'revision_requested' || paper.status === 'revision_requested') && (
                                  <DropdownMenuItem 
                                    onClick={() => navigate(`/dashboard/research/resubmit/${paper.id}`)}
                                    className="text-orange-600 focus:text-orange-600"
                                  >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Resubmit
                                  </DropdownMenuItem>
                                )}
                                {paper.status === 'draft' && (
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteId(paper.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Research Paper?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your research paper.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground rounded-xl">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
