import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Video, Search, Filter, Play, User, Eye, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatLagos } from "@/lib/dateUtils";
import { Badge } from "@/components/ui/badge";
import { getSignedUrl, isFullUrl } from "@/hooks/useSignedUrl";
import { VideoPreviewModal } from "@/components/VideoPreviewModal";

interface Documentary {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  views_count: number;
  created_at: string;
  researcher?: { full_name: string; department?: string };
}

const researchFields = [
  { value: "all", label: "All Fields" },
  { value: "engineering", label: "Engineering" },
  { value: "science", label: "Science" },
  { value: "medicine", label: "Medicine & Health" },
  { value: "agriculture", label: "Agriculture" },
  { value: "education", label: "Education" },
  { value: "business", label: "Business & Economics" },
  { value: "arts", label: "Arts & Humanities" },
  { value: "technology", label: "Technology" },
  { value: "environment", label: "Environmental Science" },
];

export default function Documentaries() {
  const [documentaries, setDocumentaries] = useState<Documentary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedField, setSelectedField] = useState("all");
  const [signedThumbnails, setSignedThumbnails] = useState<Record<string, string>>({});
  const [videoPreviewOpen, setVideoPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Documentary | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string>("");

  useEffect(() => {
    fetchDocumentaries();
  }, []);

  const fetchDocumentaries = async () => {
    try {
      const { data, error } = await supabase
        .from('documentaries')
        .select('*, researcher:profiles!documentaries_researcher_id_fkey(full_name, department)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocumentaries(data || []);
    } catch (error) {
      console.error('Error fetching documentaries:', error);
    } finally {
      setLoading(false);
    }
  };
  
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
  
  const openVideoPreview = async (doc: Documentary) => {
    setPreviewDoc(doc);
    
    // Generate signed URL for video if it's a storage path
    if (doc.video_url && !isFullUrl(doc.video_url)) {
      const signedUrl = await getSignedUrl('documentaries', doc.video_url);
      setPreviewVideoUrl(signedUrl || doc.video_url);
    } else {
      setPreviewVideoUrl(doc.video_url);
    }
    
    setVideoPreviewOpen(true);
  };

  const filteredDocumentaries = documentaries.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.researcher?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesField = selectedField === "all" || 
      doc.researcher?.department?.toLowerCase().includes(selectedField.toLowerCase()) ||
      doc.description?.toLowerCase().includes(selectedField.toLowerCase());
    
    return matchesSearch && matchesField;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="gradient-hero rounded-2xl p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-2">
            <Video className="w-8 h-8 text-white" />
            <h1 className="text-2xl lg:text-3xl font-bold text-white">Research Documentaries</h1>
          </div>
          <p className="text-white/80">
            Watch research documentaries from leading scholars and institutions
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by title, researcher, or topic..." 
              className="rounded-xl pl-10 border-2 focus:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedField} onValueChange={setSelectedField}>
            <SelectTrigger className="w-full sm:w-[200px] rounded-xl border-2">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by field" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {researchFields.map((field) => (
                <SelectItem key={field.value} value={field.value}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-tick bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 rounded-xl">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-12 h-12 bg-rose-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-1">About Research Documentaries</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Watch documentaries from leading researchers</li>
                  <li>• Learn about cutting-edge research in various fields</li>
                  <li>• Connect research to real-world applications</li>
                  <li>• Share knowledge through visual storytelling</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {!loading && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredDocumentaries.length} {filteredDocumentaries.length === 1 ? 'documentary' : 'documentaries'} found
            </p>
            {(searchQuery || selectedField !== "all") && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setSearchQuery(""); setSelectedField("all"); }}
                className="text-xs"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Documentaries Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredDocumentaries.length === 0 ? (
          <Card className="shadow-soft rounded-2xl border-0">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 flex items-center justify-center mx-auto mb-4">
                <Play className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">No Documentaries Found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {searchQuery || selectedField !== "all" 
                  ? "Try adjusting your search or filter criteria."
                  : "Research documentaries will appear here once uploaded."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocumentaries.map((doc) => (
              <Link key={doc.id} to={`/documentary/${doc.id}`}>
              <Card className="shadow-tick shadow-tick-hover rounded-2xl overflow-hidden transition-all duration-300 group cursor-pointer h-full">
                <div className="aspect-video bg-muted relative">
                  {doc.thumbnail_url ? (
                    <img 
                      src={signedThumbnails[doc.thumbnail_url] || (isFullUrl(doc.thumbnail_url) ? doc.thumbnail_url : '')} 
                      alt={doc.title} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/50 dark:to-pink-900/50">
                      <Play className="w-12 h-12 text-rose-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-rose-500 ml-1" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{doc.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      {doc.researcher && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {doc.researcher.full_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {doc.views_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatLagos(doc.created_at)}
                      </span>
                    </div>
                  </div>
                  {doc.researcher?.department && (
                    <Badge variant="secondary" className="mt-3 text-xs">
                      {doc.researcher.department}
                    </Badge>
                  )}
                </CardContent>
              </Card>
              </Link>
            ))}
          </div>
        )}
        
        {/* Video Preview Modal */}
        {previewDoc && (
          <VideoPreviewModal
            isOpen={videoPreviewOpen}
            onClose={() => {
              setVideoPreviewOpen(false);
              setPreviewDoc(null);
              setPreviewVideoUrl("");
            }}
            videoUrl={previewVideoUrl || previewDoc.video_url}
            title={previewDoc.title}
          />
        )}
      </div>
    </DashboardLayout>
  );
}