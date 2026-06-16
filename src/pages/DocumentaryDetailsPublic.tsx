import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { DocumentaryComments } from "@/components/DocumentaryComments";
import { Play, Eye, Calendar, ArrowLeft, Building2, FileText, User, Bell, BellOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";
import { formatLagos } from "@/lib/dateUtils";
import { getSignedUrl, isFullUrl } from "@/hooks/useSignedUrl";

interface Documentary {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  views_count: number;
  created_at: string;
  researcher_id: string | null;
}

interface ResearchPaper {
  id: string;
  title: string;
  views_count: number;
}

export default function DocumentaryDetailsPublic() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [documentary, setDocumentary] = useState<Documentary | null>(null);

  useSEO({
    title: documentary ? `${documentary.title} | Documentary` : "Documentary Details",
    description: documentary?.description
      ? documentary.description.substring(0, 155) + (documentary.description.length > 155 ? "…" : "")
      : "Watch research documentaries on R2PConnect.",
    url: documentary ? `/documentaries/${documentary.id}` : "/documentaries",
  });
  const [researcher, setResearcher] = useState<{
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
  } | null>(null);
  const [institution, setInstitution] = useState<{ name: string } | null>(null);
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [relatedDocs, setRelatedDocs] = useState<Documentary[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (id) fetchDocumentary();
  }, [id]);

  useEffect(() => {
    if (currentUser && researcher?.user_id) {
      checkSubscription();
    }
  }, [currentUser, researcher?.user_id]);

  const checkSubscription = async () => {
    if (!currentUser || !researcher?.user_id) return;
    const { data } = await supabase
      .from("researcher_subscriptions")
      .select("id")
      .eq("follower_id", currentUser)
      .eq("researcher_id", researcher.user_id)
      .maybeSingle();
    setIsSubscribed(!!data);
  };

  const toggleSubscription = async () => {
    if (!currentUser) {
      toast({ title: "Sign in required", description: "Please sign in to subscribe to researchers", variant: "destructive" });
      return;
    }
    if (!researcher?.user_id) return;

    setSubscribing(true);
    try {
      if (isSubscribed) {
        await supabase
          .from("researcher_subscriptions")
          .delete()
          .eq("follower_id", currentUser)
          .eq("researcher_id", researcher.user_id);
        setIsSubscribed(false);
        toast({ title: "Unsubscribed", description: `You unfollowed ${researcher.full_name}` });
      } else {
        await supabase
          .from("researcher_subscriptions")
          .insert({ follower_id: currentUser, researcher_id: researcher.user_id });
        setIsSubscribed(true);
        toast({ title: "Subscribed!", description: `You're now following ${researcher.full_name}` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update subscription", variant: "destructive" });
    } finally {
      setSubscribing(false);
    }
  };

  const fetchDocumentary = async () => {
    setLoading(true);
    const { data: docData } = await supabase.from("documentaries").select("*").eq("id", id).maybeSingle();
    if (!docData) {
      setLoading(false);
      return;
    }
    setDocumentary(docData);

    // Get signed URL if needed (for non-YouTube videos)
    if (docData.video_url && !docData.video_url.includes("youtube") && !docData.video_url.includes("youtu.be")) {
      const { data } = await supabase.storage.from("documentaries").createSignedUrl(docData.video_url, 3600);
      if (data?.signedUrl) setVideoUrl(data.signedUrl);
    }

    // Track view via edge function
    try {
      const { data: viewData } = await supabase.functions.invoke("track-documentary-view", {
        body: { documentary_id: id },
      });
      if (viewData?.views_count) {
        setDocumentary((prev) => (prev ? { ...prev, views_count: viewData.views_count } : prev));
      }
    } catch (viewError) {
      console.error("Error tracking view:", viewError);
    }

    // Fetch researcher profile and related data
    if (docData.researcher_id) {
      const { data: rData } = await supabase
        .from("public_profiles")
        .select("user_id, full_name, avatar_url, bio, institution_id")
        .eq("user_id", docData.researcher_id)
        .maybeSingle();

      if (rData) {
        setResearcher({
          user_id: rData.user_id || "",
          full_name: rData.full_name || "Researcher",
          avatar_url: rData.avatar_url,
          bio: rData.bio,
        });

        // Fetch institution
        if (rData.institution_id) {
          const { data: iData } = await supabase
            .from("institutions")
            .select("name")
            .eq("id", rData.institution_id)
            .maybeSingle();
          if (iData) setInstitution(iData);
        }

        // Fetch researcher's published papers
        const { data: pData } = await supabase
          .from("research_papers")
          .select("id, title, views_count")
          .eq("author_id", docData.researcher_id)
          .eq("status", "published")
          .order("views_count", { ascending: false })
          .limit(5);
        if (pData) setPapers(pData);

        // Fetch related documentaries from same researcher
        const { data: relatedData } = await supabase
          .from("documentaries")
          .select("id, title, description, video_url, thumbnail_url, views_count, created_at, researcher_id")
          .eq("researcher_id", docData.researcher_id)
          .neq("id", docData.id)
          .order("views_count", { ascending: false })
          .limit(4);
        if (relatedData) setRelatedDocs(await resolveThumbnails(relatedData));
      }
    }

    // If no related docs from same researcher, fetch popular ones
    if (relatedDocs.length === 0) {
      const { data: popularDocs } = await supabase
        .from("documentaries")
        .select("id, title, description, video_url, thumbnail_url, views_count, created_at, researcher_id")
        .neq("id", docData.id)
        .order("views_count", { ascending: false })
        .limit(4);
      if (popularDocs) setRelatedDocs(await resolveThumbnails(popularDocs));
    }

    setLoading(false);
  };

  const getYouTubeId = (url: string) =>
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || null;
  const isYouTube = documentary?.video_url?.includes("youtube") || documentary?.video_url?.includes("youtu.be");
  const youtubeId = isYouTube && documentary ? getYouTubeId(documentary.video_url) : null;

  const getYouTubeThumbnail = (url: string) => {
    const videoId = getYouTubeId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  };

  const resolveThumbnail = async (doc: Documentary): Promise<Documentary> => {
    if (doc.thumbnail_url) {
      if (isFullUrl(doc.thumbnail_url)) {
        return doc;
      }

      const signedUrl = await getSignedUrl("documentaries", doc.thumbnail_url);
      if (signedUrl) {
        return { ...doc, thumbnail_url: signedUrl };
      }
    }

    const youtubeThumbnail = doc.video_url ? getYouTubeThumbnail(doc.video_url) : null;
    return youtubeThumbnail ? { ...doc, thumbnail_url: youtubeThumbnail } : doc;
  };

  const resolveThumbnails = async (docs: Documentary[]) => {
    const resolved = await Promise.all(docs.map(resolveThumbnail));
    return resolved;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="aspect-video w-full rounded-2xl mb-4" />
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!documentary) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="container mx-auto px-4 py-12 text-center">
          <Play className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Documentary Not Found</h1>
          <Link to="/documentaries">
            <Button variant="outline" className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Documentaries
            </Button>
          </Link>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="container mx-auto px-4 py-4 sm:py-6">
        {/* Back Button */}
        <Link
          to="/documentaries"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Documentaries
        </Link>

        {/* Desktop: Two Column Layout / Mobile: Stacked */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content - Video & Info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Video Player - Clean card container with shadow */}
            <Card className="rounded-2xl overflow-hidden shadow-xl border-0 bg-card">
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <div className="absolute inset-0">
                  {isYouTube && youtubeId ? (
                    <YouTubePlayer videoId={youtubeId} className="w-full h-full" />
                  ) : videoUrl ? (
                    <video src={videoUrl} controls className="w-full h-full object-contain bg-black" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20">
                      <Play className="w-16 h-16 sm:w-20 sm:h-20 text-primary" />
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Title and Stats */}
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-2">{documentary.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {documentary.views_count} views
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatLagos(documentary.created_at)}
                </span>
              </div>
            </div>

            {/* Description */}
            {documentary.description && (
              <Card className="rounded-xl">
                <CardContent className="p-4">
                  <p className="text-muted-foreground whitespace-pre-wrap text-sm sm:text-base">{documentary.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Comments Section */}
            <DocumentaryComments documentaryId={documentary.id} />

            {/* Related Documentaries - Below comments */}
            {relatedDocs.length > 0 && (
              <Card className="rounded-xl">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Play className="w-4 h-4 text-primary" />
                    More Documentaries
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {relatedDocs.map((doc) => {
                      const thumbnail = doc.thumbnail_url || (doc.video_url ? getYouTubeThumbnail(doc.video_url) : null);
                      return (
                        <Link key={doc.id} to={`/documentary/${doc.id}`}>
                          <div className="group">
                            <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-2">
                              {thumbnail ? (
                                <img src={thumbnail} alt={doc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                                  <Play className="w-6 h-6 text-primary" />
                                </div>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-2">{doc.title}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Eye className="w-3 h-3" />
                              {doc.views_count} views
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Researcher Profile Card */}
            {researcher && (
              <Card className="rounded-xl overflow-hidden">
                <div className="h-16 sm:h-20 bg-gradient-to-r from-primary to-accent" />
                <CardContent className="p-4 -mt-8 sm:-mt-10">
                  <div className="flex items-end gap-3 mb-3">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-background shadow-lg">
                      <AvatarImage src={researcher.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl sm:text-2xl">
                        {researcher.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 pb-1 sm:pb-2">
                      <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">{researcher.full_name}</h3>
                      {institution && (
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span className="truncate">{institution.name}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {researcher.bio && (
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-3">{researcher.bio}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant={isSubscribed ? "outline" : "default"}
                      size="sm"
                      onClick={toggleSubscription}
                      disabled={subscribing}
                      className="flex-1 rounded-lg text-xs sm:text-sm"
                    >
                      {subscribing ? (
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                      ) : isSubscribed ? (
                        <>
                          <BellOff className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Subscribed
                        </>
                      ) : (
                        <>
                          <Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Subscribe
                        </>
                      )}
                    </Button>
                    <Link to={`/researcher/${researcher.user_id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full rounded-lg text-xs sm:text-sm">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        Profile
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Related Research Papers */}
            {papers.length > 0 && (
              <Card className="rounded-xl">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <FileText className="w-4 h-4 text-primary" />
                    Research by {researcher?.full_name?.split(" ")[0]}
                  </h3>
                  <div className="space-y-2">
                    {papers.map((paper) => (
                      <Link key={paper.id} to={`/research/${paper.id}`}>
                        <div className="flex items-start gap-2 p-2 sm:p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-2">{paper.title}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Eye className="w-3 h-3" />
                              {paper.views_count} views
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
