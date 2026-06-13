import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Search, Video, Eye, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { getSignedUrl, isFullUrl } from "@/hooks/useSignedUrl";
import { useSEO } from "@/hooks/useSEO";
import { formatLagos } from "@/lib/dateUtils";

interface Documentary {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string;
  views_count: number | null;
  created_at: string | null;
}

export default function DocumentariesPublic() {
  useSEO({
    title: "Research Documentaries",
    description: "Watch research documentaries on R2PConnect. Explore video stories of groundbreaking research and innovation from Nigerian academics.",
    url: "/documentaries",
  });
  const [documentaries, setDocumentaries] = useState<Documentary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<Documentary | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>("");
  const [signedThumbnails, setSignedThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchDocumentaries = async () => {
      const { data } = await supabase
        .from('documentaries')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setDocumentaries(data);
      setLoading(false);
    };
    fetchDocumentaries();
  }, []);

  const filteredDocs = documentaries.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Load signed URLs for thumbnails
  useEffect(() => {
    const loadThumbnails = async () => {
      for (const doc of documentaries) {
        if (doc.thumbnail_url && !isFullUrl(doc.thumbnail_url) && !signedThumbnails[doc.thumbnail_url]) {
          const signedUrl = await getSignedUrl('documentaries', doc.thumbnail_url);
          if (signedUrl) {
            setSignedThumbnails(prev => ({ ...prev, [doc.thumbnail_url!]: signedUrl }));
          }
        }
      }
    };
    
    if (documentaries.length > 0) {
      loadThumbnails();
    }
  }, [documentaries]);

  const handleWatch = async (doc: Documentary) => {
    setSelectedVideo(doc);
    
    // Generate signed URL for video if it's a storage path
    if (doc.video_url && !isFullUrl(doc.video_url)) {
      const signedUrl = await getSignedUrl('documentaries', doc.video_url);
      setSelectedVideoUrl(signedUrl || doc.video_url);
    } else {
      setSelectedVideoUrl(doc.video_url);
    }
    
    // Increment view count
    await supabase
      .from('documentaries')
      .update({ views_count: (doc.views_count || 0) + 1 })
      .eq('id', doc.id);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <PublicHeader />

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => { setSelectedVideo(null); setSelectedVideoUrl(""); }}>
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-background rounded-xl overflow-hidden">
              <div className="aspect-video">
                {isFullUrl(selectedVideo.video_url) && selectedVideo.video_url.includes('youtube') ? (
                  <iframe
                    src={selectedVideoUrl}
                    className="w-full h-full"
                    allowFullScreen
                    title={selectedVideo.title}
                  />
                ) : (
                  <video
                    src={selectedVideoUrl || selectedVideo.video_url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-xl font-bold text-foreground">{selectedVideo.title}</h3>
                {selectedVideo.description && (
                  <p className="text-muted-foreground mt-2">{selectedVideo.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-32 pb-16 gradient-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Research Documentaries
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto mb-8">
            Watch documentaries showcasing groundbreaking research and the researchers behind them.
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search documentaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/60"
            />
          </div>
        </div>
      </section>

      {/* Documentaries */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading documentaries...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Documentaries Found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try adjusting your search query" : "No documentaries available yet"}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocs.map((doc) => (
                <Link key={doc.id} to={`/documentary/${doc.id}`}>
                <Card 
                  className="border-none shadow-lg hover:shadow-xl transition-shadow cursor-pointer group h-full"
                >
                  <div className="relative aspect-video bg-muted rounded-t-xl overflow-hidden">
                    {doc.thumbnail_url ? (
                      <img 
                        src={signedThumbnails[doc.thumbnail_url] || (isFullUrl(doc.thumbnail_url) ? doc.thumbnail_url : '')} 
                        alt={doc.title}
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
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-2">{doc.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {doc.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" /> {doc.views_count || 0} views
                      </span>
                      {doc.created_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatLagos(doc.created_at)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
