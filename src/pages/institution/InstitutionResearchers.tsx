import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import InstitutionLayout from "@/components/layout/InstitutionLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Users,
  FileText,
  Eye,
  UserCheck,
  BadgeCheck
} from "lucide-react";

interface Researcher {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
  papers_count: number;
  total_views: number;
}

export default function InstitutionResearchers() {
  const [user, setUser] = useState<User | null>(null);
  const [researchers, setResearchers] = useState<Researcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchResearchers(user.id);
    });
  }, [navigate]);

  const fetchResearchers = async (userId: string) => {
    setLoading(true);
    const { data: institution } = await supabase
      .from('institutions')
      .select('id')
      .eq('admin_user_id', userId)
      .maybeSingle();

    if (!institution) {
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, is_verified')
      .eq('institution_id', institution.id);

    const researchersWithStats = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: papers } = await supabase
          .from('research_papers')
          .select('views_count')
          .eq('author_id', profile.user_id);

        return {
          id: profile.user_id,
          user_id: profile.user_id,
          full_name: profile.full_name || 'Unknown',
          email: '',
          avatar_url: profile.avatar_url,
          is_verified: profile.is_verified || false,
          created_at: '',
          papers_count: papers?.length || 0,
          total_views: papers?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0
        };
      })
    );

    setResearchers(researchersWithStats);
    setLoading(false);
  };

  const filteredResearchers = researchers.filter(r =>
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <InstitutionLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Researchers</h1>
            <p className="text-muted-foreground">View researchers registered under your institution</p>
          </div>
          <Badge className="w-fit rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 px-4 py-1">
            {researchers.length} Total Researchers
          </Badge>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-7 h-7 text-white" />
              </div>
              <div className="text-white">
                <h4 className="font-bold text-lg mb-1">Researcher Management</h4>
                <ul className="text-sm text-white/80 space-y-1">
                  <li>• Researchers register using your institution verification code</li>
                  <li>• Track each researcher's publication count and views</li>
                  <li>• View detailed profiles and research history</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search researchers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 rounded-xl h-12 border-none shadow-md"
          />
        </div>

        {/* Researchers List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading researchers...</p>
          </div>
        ) : filteredResearchers.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-none shadow-lg">
            <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No researchers yet</h3>
            <p className="text-muted-foreground">Researchers will appear here when they register with your institution code</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredResearchers.map((researcher) => (
              <Card key={researcher.id} className="hover:shadow-lg transition-all rounded-2xl border-none shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-14 h-14 border-2 border-primary/20 shadow-lg">
                        <AvatarImage src={researcher.avatar_url || undefined} alt={researcher.full_name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold text-xl">
                          {researcher.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-foreground">{researcher.full_name}</h3>
                          {researcher.is_verified && (
                            <BadgeCheck className="w-5 h-5 text-blue-500 fill-blue-100" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Researcher</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="text-2xl font-bold text-foreground">{researcher.papers_count}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Papers</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Eye className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="text-2xl font-bold text-foreground">{researcher.total_views}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Views</p>
                      </div>
                      <Link to={`/institution/researcher/${researcher.user_id}`}>
                        <Button className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0 shadow-md">
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </InstitutionLayout>
  );
}
