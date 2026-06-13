import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import InstitutionLayout from "@/components/layout/InstitutionLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  FileText,
  Eye,
  Download,
  Calendar,
  BadgeCheck,
  GraduationCap,
} from "lucide-react";
import { formatLagos } from "@/lib/dateUtils";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  bio: string | null;
  department: string | null;
  level: string | null;
  is_verified: boolean;
  researcher_type: string | null;
  created_at: string;
}

interface Institution {
  id: string;
  name: string;
  logo_url: string | null;
}

interface ResearchPaper {
  id: string;
  title: string;
  status: string;
  views_count: number;
  downloads_count: number;
  created_at: string;
}

export default function ResearcherProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    setLoading(true);

    // Fetch profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !profileData) {
      setLoading(false);
      return;
    }

    setProfile(profileData);

    // Fetch institution if available
    if (profileData.institution_id) {
      const { data: instData } = await supabase
        .from("institutions")
        .select("id, name, logo_url")
        .eq("id", profileData.institution_id)
        .maybeSingle();

      if (instData) {
        setInstitution(instData);
      }
    }

    // Fetch research papers
    const { data: papersData } = await supabase
      .from("research_papers")
      .select("id, title, status, views_count, downloads_count, created_at")
      .eq("author_id", userId)
      .order("created_at", { ascending: false });

    if (papersData) {
      setPapers(papersData);
    }

    setLoading(false);
  };

  const totalViews = papers.reduce((sum, p) => sum + (p.views_count || 0), 0);
  const totalDownloads = papers.reduce((sum, p) => sum + (p.downloads_count || 0), 0);

  if (loading) {
    return (
      <InstitutionLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </InstitutionLayout>
    );
  }

  if (!profile) {
    return (
      <InstitutionLayout>
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Profile Not Found</h2>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4 rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </InstitutionLayout>
    );
  }

  return (
    <InstitutionLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Researcher Profile</h1>
            <p className="text-muted-foreground">View researcher details and publications</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="rounded-2xl border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-accent p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-white/30 shadow-lg">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
                <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                  {profile.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h2 className="text-2xl font-bold text-white">{profile.full_name}</h2>
                  {profile.is_verified && (
                    <BadgeCheck className="w-6 h-6 text-white fill-blue-400" />
                  )}
                </div>
                <p className="text-white/80 mt-1">{profile.researcher_type || "Researcher"}</p>
                {institution && (
                  <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                    <Building2 className="w-4 h-4 text-white/70" />
                    <span className="text-white/80 text-sm">{institution.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium text-foreground">{profile.email}</p>
                    </div>
                  </div>
                  {profile.phone_number && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium text-foreground">{profile.phone_number}</p>
                      </div>
                    </div>
                  )}
                  {profile.department && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                      <GraduationCap className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Department</p>
                        <p className="font-medium text-foreground">{profile.department}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Institution Info */}
              {institution && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Institution
                  </h3>
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-16 h-16 rounded-xl bg-white border flex items-center justify-center overflow-hidden">
                      {institution.logo_url ? (
                        <img src={institution.logo_url} alt={institution.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{institution.name}</p>
                      <Badge variant="secondary" className="mt-1 rounded-full">
                        {profile.is_verified ? "Verified Member" : "Member"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="mt-6">
                <h3 className="font-semibold text-foreground mb-2">Bio</h3>
                <p className="text-muted-foreground">{profile.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 rounded-xl bg-primary/10 border-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{papers.length}</p>
                <p className="text-sm text-muted-foreground">Papers</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 rounded-xl bg-secondary/10 border-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalViews}</p>
                <p className="text-sm text-muted-foreground">Views</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 rounded-xl bg-accent/10 border-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <Download className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalDownloads}</p>
                <p className="text-sm text-muted-foreground">Downloads</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 rounded-xl bg-warning/10 border-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {formatLagos(profile.created_at, "monthYear")}
                </p>
                <p className="text-sm text-muted-foreground">Joined</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Research Papers */}
        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Research Papers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {papers.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No research papers yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {papers.map((paper) => (
                  <div
                    key={paper.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{paper.title}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {paper.views_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" /> {paper.downloads_count || 0}
                        </span>
                        <span>{formatLagos(paper.created_at)}</span>
                      </div>
                    </div>
                    <Badge
                      variant={paper.status === "published" ? "default" : "secondary"}
                      className="rounded-full capitalize"
                    >
                      {paper.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </InstitutionLayout>
  );
}
