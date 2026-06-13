import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import InvestorLayout from "@/components/layout/InvestorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Play, Eye, Search, Calendar, User } from "lucide-react";
import { formatLagos } from "@/lib/dateUtils";

interface Documentary {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  views_count: number;
  created_at: string;
  researcher_id: string | null;
  researcher?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function InvestorDocumentaries() {
  const [documentaries, setDocumentaries] = useState<Documentary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDocumentaries();
  }, []);

  const fetchDocumentaries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("documentaries")
      .select(`
        id, title, description, video_url, thumbnail_url, views_count, created_at, researcher_id,
        researcher:public_profiles!documentaries_researcher_id_fkey(full_name, avatar_url)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDocumentaries(data.map(d => ({
        ...d,
        researcher: Array.isArray(d.researcher) ? d.researcher[0] : d.researcher
      })));
    }
    setLoading(false);
  };

  const getYouTubeId = (url: string) =>
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || null;

  const getYouTubeThumbnail = (url: string) => {
    const videoId = getYouTubeId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  };

  const filteredDocs = documentaries.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.researcher?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <InvestorLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Research Documentaries</h1>
            <p className="text-sm text-muted-foreground">Discover researchers through their documentaries</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documentaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
        </div>

        {/* Documentaries Grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {Array(8).fill(0).map((_, i) => (
              <Card key={i} className="rounded-xl overflow-hidden">
                <Skeleton className="aspect-video" />
                <CardContent className="p-3">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Play className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documentaries found</h3>
              <p className="text-sm text-muted-foreground text-center">
                {searchQuery ? "Try a different search term" : "Check back later for new content"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredDocs.map((doc) => {
              const thumbnail = doc.thumbnail_url || (doc.video_url ? getYouTubeThumbnail(doc.video_url) : null);
              return (
                <Link key={doc.id} to={`/documentary/${doc.id}`}>
                  <Card className="rounded-xl overflow-hidden group hover:shadow-lg transition-shadow h-full">
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={doc.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                          <Play className="w-10 h-10 text-primary" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-1.5">{doc.title}</h3>
                      {doc.researcher?.full_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                          <User className="w-3 h-3" />
                          {doc.researcher.full_name}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {doc.views_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatLagos(doc.created_at)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </InvestorLayout>
  );
}