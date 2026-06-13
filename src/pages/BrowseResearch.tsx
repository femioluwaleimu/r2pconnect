import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ResearchCredentialLabel from "@/components/ResearchCredentialLabel";
import { Search, Filter, FileText, BookOpen, Eye, User } from "lucide-react";
import { formatLagos } from "@/lib/dateUtils";

interface ResearchPaper {
  id: string;
  title: string;
  abstract: string | null;
  views_count: number;
  published_at: string | null;
  keywords: string[] | null;
  institution_id: string | null;
  supervisor_id: string | null;
  author_names: string[] | null;
  profiles?: { full_name: string } | null;
}

export default function BrowseResearch() {
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPapers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredPapers(papers.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.abstract?.toLowerCase().includes(query) ||
        p.keywords?.some(k => k.toLowerCase().includes(query))
      ));
    } else {
      setFilteredPapers(papers);
    }
  }, [searchQuery, papers]);

  const fetchPapers = async () => {
    const { data } = await supabase
      .from('research_papers')
      .select('id, title, abstract, views_count, published_at, keywords, author_id, institution_id, supervisor_id, author_names')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    
    if (data) {
      setPapers(data);
      setFilteredPapers(data);
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Browse Research</h1>
          <p className="text-muted-foreground">Discover research papers from across the platform</p>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by title, author, or keywords..." 
              className="rounded-xl pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Discover Research</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Search across published research papers</li>
                  <li>• Filter by topic or keywords</li>
                  <li>• Connect with authors for collaboration</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : filteredPapers.length === 0 ? (
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mb-4">
                  <FileText className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Research Papers Found</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  {searchQuery ? 'Try a different search term' : 'No published research papers yet.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPapers.map(paper => (
              <Link key={paper.id} to={`/dashboard/research/${paper.id}`}>
                <Card className="hover:shadow-md transition-shadow rounded-xl cursor-pointer">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg text-foreground hover:text-primary mb-2">{paper.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{paper.abstract || "No abstract"}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{paper.views_count} views</span>
                      {paper.published_at && <span>{formatLagos(paper.published_at)}</span>}
                    </div>
                    {paper.author_names && paper.author_names.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {paper.author_names.map((name, i) => (
                          <Badge key={i} variant="outline" className="rounded-full text-xs">
                            <User className="w-3 h-3 mr-1" />{name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {paper.keywords && paper.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {paper.keywords.slice(0, 5).map((k, i) => (
                          <Badge key={i} variant="secondary" className="rounded-full text-xs">{k}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="mt-2">
                      <ResearchCredentialLabel
                        institutionId={paper.institution_id}
                        supervisorId={paper.supervisor_id}
                        compact
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
