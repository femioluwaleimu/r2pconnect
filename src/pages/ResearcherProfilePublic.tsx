import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Building2, FileText, Eye, ShieldCheck, ArrowLeft, Users } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

interface ResearcherProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  institution_id: string | null;
}

interface Institution {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Paper {
  id: string;
  title: string;
  views_count: number;
  status: string;
}

export default function ResearcherProfilePublic() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<ResearcherProfile | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: profile ? `${profile.full_name} | Researcher Profile` : "Researcher Profile",
    description: profile?.bio
      ? profile.bio.substring(0, 155) + (profile.bio.length > 155 ? "…" : "")
      : "View researcher profiles on R2PConnect — Africa's AI-powered research platform.",
    url: profile ? `/researcher/${profile.user_id}` : "/research",
  });

  useEffect(() => {
    if (id) fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    
    // Fetch profile from public_profiles view
    const { data: profileData } = await supabase
      .from("public_profiles")
      .select("user_id, full_name, avatar_url, bio, institution_id")
      .eq("user_id", id)
      .maybeSingle();

    if (profileData) {
      setProfile({
        ...profileData,
        full_name: profileData.full_name || "Unknown Researcher",
        is_verified: false,
      });

      // Fetch institution
      if (profileData.institution_id) {
        const { data: instData } = await supabase
          .from("institutions")
          .select("id, name, logo_url")
          .eq("id", profileData.institution_id)
          .maybeSingle();
        
        if (instData) setInstitution(instData);
      }

      // Fetch follower count
      const { count } = await supabase
        .from("researcher_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("researcher_id", id);
      setFollowerCount(count || 0);
    }

    // Fetch published papers
    const { data: papersData } = await supabase
      .from("research_papers")
      .select("id, title, views_count, status")
      .eq("author_id", id)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(10);

    if (papersData) setPapers(papersData);
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="container mx-auto px-4 py-12">
          <Skeleton className="h-48 w-full rounded-2xl mb-6" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="container mx-auto px-4 py-12 text-center">
          <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Researcher Not Found</h1>
          <p className="text-muted-foreground mb-6">This profile doesn't exist or is not public.</p>
          <Link to="/research">
            <Button variant="outline" className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Research
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
      <main className="container mx-auto px-4 py-8 md:py-12">
        {/* Profile Header */}
        <Card className="rounded-2xl shadow-lg mb-8 overflow-hidden">
          <div className="h-24 md:h-32 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-4 md:p-6 -mt-12 md:-mt-16">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl md:text-3xl bg-primary text-primary-foreground">
                  {profile.full_name?.charAt(0) || "R"}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left flex-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">{profile.full_name}</h1>
                  {profile.is_verified && (
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
                {institution && (
                  <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
                    {institution.logo_url ? (
                      <img src={institution.logo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-muted-foreground text-sm">{institution.name}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="rounded-full">
                  <Users className="w-3 h-3 mr-1" />
                  {followerCount} Follower{followerCount !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="secondary" className="rounded-full">
                  {papers.length} Published Paper{papers.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
            {profile.bio && (
              <p className="mt-4 text-muted-foreground text-sm md:text-base">{profile.bio}</p>
            )}
          </CardContent>
        </Card>

        {/* Published Papers */}
        <h2 className="text-lg md:text-xl font-bold mb-4">Published Research</h2>
        {papers.length > 0 ? (
          <div className="grid gap-3 md:gap-4 md:grid-cols-2">
            {papers.map((paper) => (
              <Link key={paper.id} to={`/research/${paper.id}`}>
                <Card className="rounded-xl shadow-sm hover:shadow-md transition-all p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm md:text-base line-clamp-2">{paper.title}</h3>
                      <div className="flex items-center gap-2 mt-2 text-xs md:text-sm text-muted-foreground">
                        <Eye className="w-4 h-4" />
                        <span>{paper.views_count} views</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="rounded-xl p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No published research yet</p>
          </Card>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}