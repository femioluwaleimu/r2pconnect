import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Filter, Info, Eye, CheckCircle, Clock, XCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { formatLagos } from "@/lib/dateUtils";

type ResearchStatus = Database["public"]["Enums"]["research_status"];

interface ResearchPaper {
  id: string;
  title: string;
  abstract: string | null;
  status: ResearchStatus;
  author_id: string;
  file_url: string | null;
  views_count: number | null;
  downloads_count: number | null;
  created_at: string;
  published_at: string | null;
  author?: { full_name: string; email: string };
}

export default function AdminResearch() {
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const { data: papers, error: papersError } = await supabase
        .from('research_papers')
        .select('*')
        .order('created_at', { ascending: false });

      if (papersError) throw papersError;

      // Use public_profiles view for displaying other users' info
      const { data: profiles } = await supabase.from('public_profiles').select('user_id, full_name');
      const profilesMap = new Map(profiles?.map(p => [p.user_id, { full_name: p.full_name, email: '' }]));

      const papersWithAuthors = (papers || []).map(p => ({
        ...p,
        author: profilesMap.get(p.author_id),
      }));

      setPapers(papersWithAuthors);
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (paperId: string, newStatus: ResearchStatus) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'published') {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('research_papers')
        .update(updateData)
        .eq('id', paperId);

      if (error) throw error;
      toast({ title: `Paper ${newStatus === 'published' ? 'published' : newStatus === 'rejected' ? 'rejected' : 'updated'}` });
      fetchPapers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredPapers = papers.filter(paper => {
    const matchesSearch = paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          paper.author?.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || paper.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ResearchStatus) => {
    const styles: Record<string, string> = {
      draft: "bg-gray-500 text-white",
      under_review: "bg-amber-500 text-white",
      published: "bg-emerald-600 text-white",
      rejected: "bg-red-500 text-white",
      approved: "bg-blue-600 text-white",
      revision_requested: "bg-orange-500 text-white",
    };
    const labels: Record<string, string> = {
      draft: "Draft",
      under_review: "Under Review",
      published: "Published",
      rejected: "Rejected",
      approved: "Approved",
      revision_requested: "Revision Requested",
    };
    return <Badge className={styles[status] || "bg-gray-500 text-white"}>{labels[status] || status}</Badge>;
  };

  const researchStats = [
    { label: "Total Papers", value: papers.length.toString(), icon: FileText },
    { label: "Published", value: papers.filter(p => p.status === 'published').length.toString(), icon: CheckCircle },
    { label: "Under Review", value: papers.filter(p => p.status === 'under_review').length.toString(), icon: Clock },
    { label: "Rejected", value: papers.filter(p => p.status === 'rejected').length.toString(), icon: XCircle },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Research Management</h1>
          <p className="text-muted-foreground">Monitor and manage research papers</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {researchStats.map((stat) => (
            <Card key={stat.label} className="shadow-card rounded-2xl border-border/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-md">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search papers by title or author..."
              className="rounded-xl pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 rounded-xl">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Research Moderation</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Review flagged research papers</li>
                  <li>• Override reviewer decisions if needed</li>
                  <li>• Monitor publication quality metrics</li>
                  <li>• Handle copyright and plagiarism reports</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Papers Table */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle>All Research Papers ({filteredPapers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredPapers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mb-4">
                  <FileText className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Research Papers</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  {searchQuery || filterStatus !== "all" 
                    ? "No papers match your search criteria." 
                    : "Research papers will appear here once uploaded."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPapers.map((paper) => (
                  <div key={paper.id} className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-foreground truncate">{paper.title}</h4>
                          {getStatusBadge(paper.status)}
                        </div>
                        {paper.abstract && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{paper.abstract}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>By: {paper.author?.full_name || 'Unknown'}</span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {paper.views_count || 0} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {paper.downloads_count || 0} downloads
                          </span>
                          <span>
                            {formatLagos(paper.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {paper.status === 'under_review' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(paper.id, 'published')}
                              className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Publish
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(paper.id, 'rejected')}
                              className="rounded-xl text-destructive border-destructive hover:bg-destructive/10"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {paper.status === 'rejected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(paper.id, 'under_review')}
                            className="rounded-xl"
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            Re-review
                          </Button>
                        )}
                        {paper.file_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(paper.file_url!, '_blank')}
                            className="rounded-xl"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
