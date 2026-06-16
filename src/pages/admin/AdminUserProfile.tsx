import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Building2, 
  Calendar,
  FileText,
  GraduationCap,
  Briefcase,
  Shield,
  CreditCard,
  Sparkles
} from "lucide-react";
import { formatLagos } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["app_role"];

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  bio: string | null;
  avatar_url: string | null;
  institution_id: string | null;
  institution_name?: string;
  department: string | null;
  level: string | null;
  researcher_type: string | null;
  is_verified: boolean;
  created_at: string;
  role: UserRole;
  subscription_tier?: string;
  ai_credits_used?: number;
  ai_credits_limit?: number;
  papers_count?: number;
}

export default function AdminUserProfile() {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserProfile(userId);
    } else {
      setLoading(false);
    }
  }, [userId]);

  const fetchUserProfile = async (id: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        setProfile(null);
        return;
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', id)
        .maybeSingle();

      // Fetch institution name if applicable
      let institutionName = null;
      if (profileData.institution_id) {
        const { data: instData } = await supabase
          .from('institutions')
          .select('name')
          .eq('id', profileData.institution_id)
          .maybeSingle();
        institutionName = instData?.name;
      }

      // Fetch subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('tier')
        .eq('user_id', id)
        .maybeSingle();

      // Fetch AI credits
      const { data: creditsData } = await supabase
        .from('ai_credits')
        .select('credits_used, credits_limit')
        .eq('user_id', id)
        .maybeSingle();

      // Fetch papers count
      const { count: papersCount } = await supabase
        .from('research_papers')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', id);

      setProfile({
        ...profileData,
        institution_name: institutionName,
        role: roleData?.role || 'researcher',
        subscription_tier: subData?.tier || 'free',
        ai_credits_used: creditsData?.credits_used || 0,
        ai_credits_limit: creditsData?.credits_limit || 0,
        papers_count: papersCount || 0,
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      admin: "bg-red-600 text-white",
      researcher: "bg-blue-600 text-white",
      institution: "bg-purple-600 text-white",
      industry: "bg-amber-600 text-white",
      investor: "bg-teal-600 text-white",
      reviewer: "bg-emerald-600 text-white",
      supervisor: "bg-indigo-600 text-white",
      ipn: "bg-orange-600 text-white",
      job_applicant: "bg-gray-600 text-white",
    };
    return colors[role] || "bg-secondary";
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!profile) {
    return (
      <AdminLayout>
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold">User not found</h2>
          <Button onClick={() => navigate('/admin/users')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/admin/users')}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Profile</h1>
            <p className="text-muted-foreground">Viewing profile details</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="w-24 h-24 rounded-2xl">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-accent text-white rounded-2xl">
                  {profile.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      {profile.full_name}
                      {profile.is_verified && (
                        <Shield className="w-5 h-5 text-green-500" />
                      )}
                    </h2>
                    <Badge className={`mt-1 ${getRoleBadgeColor(profile.role)}`}>
                      {profile.role}
                    </Badge>
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-muted-foreground mb-4">{profile.bio}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{profile.email}</span>
                  </div>
                  {profile.phone_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{profile.phone_number}</span>
                    </div>
                  )}
                  {profile.institution_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>{profile.institution_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Joined {formatLagos(profile.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card rounded-2xl border-border/50 bg-gradient-to-br from-blue-500/10 to-blue-600/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Research Papers</span>
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{profile.papers_count}</p>
            </CardContent>
          </Card>

          <Card className="shadow-card rounded-2xl border-border/50 bg-gradient-to-br from-purple-500/10 to-purple-600/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Subscription</span>
                <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground capitalize">{profile.subscription_tier}</p>
            </CardContent>
          </Card>

          <Card className="shadow-card rounded-2xl border-border/50 bg-gradient-to-br from-amber-500/10 to-amber-600/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">AI Credits</span>
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {profile.ai_credits_used}/{profile.ai_credits_limit}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card rounded-2xl border-border/50 bg-gradient-to-br from-green-500/10 to-green-600/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Level</span>
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{profile.level || 'N/A'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Details */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Department</label>
                <p className="text-foreground">{profile.department || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Researcher Type</label>
                <p className="text-foreground capitalize">{profile.researcher_type || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Verification Status</label>
                <p className="text-foreground">{profile.is_verified ? 'Verified' : 'Not Verified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">User ID</label>
                <p className="text-foreground text-sm font-mono">{profile.user_id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
