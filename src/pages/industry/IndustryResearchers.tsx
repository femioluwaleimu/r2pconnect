import { useState, useEffect } from "react";
import IndustryLayout from "@/components/layout/IndustryLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InfoCard } from "@/components/ui/info-card";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, FileText, ShieldCheck, Building2, Loader2, Lightbulb, Eye, Mail } from "lucide-react";
import { Link } from "react-router-dom";

interface Researcher {
  user_id: string;
  full_name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  institution_id: string | null;
  is_verified: boolean;
  department: string | null;
  institution_name?: string;
  papers_count?: number;
}

interface Institution {
  id: string;
  name: string;
}

export default function IndustryResearchers() {
  const [researchers, setResearchers] = useState<Researcher[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch institutions
      const { data: instData } = await supabase
        .from("institutions")
        .select("id, name")
        .eq("is_verified", true)
        .order("name");
      if (instData) setInstitutions(instData);

      // Fetch researchers (users with researcher role)
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "researcher");

      if (!rolesData || rolesData.length === 0) {
        setResearchers([]);
        setLoading(false);
        return;
      }

      const userIds = rolesData.map((r) => r.user_id);

      // Fetch profiles for these users
      const { data: profilesData } = await supabase
        .from("public_profiles")
        .select("user_id, full_name, avatar_url, bio, institution_id")
        .in("user_id", userIds);

      if (!profilesData) {
        setResearchers([]);
        setLoading(false);
        return;
      }

      // Enrich with institution names and paper counts
      const enrichedResearchers = await Promise.all(
        profilesData.map(async (profile) => {
          let institution_name = "";
          if (profile.institution_id) {
            const inst = instData?.find((i) => i.id === profile.institution_id);
            institution_name = inst?.name || "";
          }

          const { count } = await supabase
            .from("research_papers")
            .select("*", { count: "exact", head: true })
            .eq("author_id", profile.user_id)
            .eq("status", "published");

          return {
            user_id: profile.user_id,
            full_name: profile.full_name || "Unknown",
            email: "",
            bio: profile.bio,
            avatar_url: profile.avatar_url,
            institution_id: profile.institution_id,
            is_verified: false,
            department: null,
            institution_name,
            papers_count: count || 0,
          } as Researcher;
        })
      );

      setResearchers(enrichedResearchers);
    } catch (error) {
      console.error("Error fetching researchers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResearchers = researchers.filter((r) => {
    const matchesSearch =
      r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.bio && r.bio.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.institution_name && r.institution_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesInstitution = institutionFilter === "all" || r.institution_id === institutionFilter;
    const matchesVerified = verifiedFilter === "all" || (verifiedFilter === "verified" && r.is_verified) || (verifiedFilter === "unverified" && !r.is_verified);
    return matchesSearch && matchesInstitution && matchesVerified;
  });

  const verifiedCount = researchers.filter((r) => r.is_verified).length;
  const totalPapers = researchers.reduce((a, r) => a + (r.papers_count || 0), 0);

  return (
    <IndustryLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Find Researchers</h1>
          <p className="text-sm text-muted-foreground">Browse and connect with researchers</p>
        </div>

        {/* Stats */}
        <div className="grid gap-2 grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-xl font-bold">{researchers.length}</p>
                  <p className="text-xs opacity-80">Researchers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-xl font-bold">{verifiedCount}</p>
                  <p className="text-xs opacity-80">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-xl font-bold">{totalPapers}</p>
                  <p className="text-xs opacity-80">Papers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search researchers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 rounded-lg text-sm" />
          </div>
          <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
            <SelectTrigger className="w-full sm:w-40 h-9 rounded-lg text-sm">
              <SelectValue placeholder="Institution" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Institutions</SelectItem>
              {institutions.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Info Card */}
        <InfoCard
          icon={Lightbulb}
          title="Discover Research Talent"
          description="Browse researcher profiles and their published work. Use AI matching from your challenges to find the best fit for your needs."
        />

        {/* Researchers List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredResearchers.length === 0 ? (
          <Card className="shadow-sm rounded-xl">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-base font-semibold mb-1">No researchers found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredResearchers.map((researcher) => (
              <Card key={researcher.user_id} className="shadow-sm rounded-xl hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={researcher.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">{researcher.full_name?.charAt(0) || "R"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm">{researcher.full_name}</span>
                        {researcher.is_verified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                      </div>
                      {researcher.institution_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {researcher.institution_name}
                        </p>
                      )}
                      {researcher.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{researcher.bio}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          <FileText className="w-3 h-3 mr-1" />
                          {researcher.papers_count || 0} papers
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link to={`/researcher/${researcher.user_id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full rounded-lg text-xs h-8">
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View Profile
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </IndustryLayout>
  );
}
