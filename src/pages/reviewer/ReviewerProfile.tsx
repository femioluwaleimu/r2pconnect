import { useState, useEffect } from "react";
import ReviewerLayout from "@/components/layout/ReviewerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  User,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  Award,
  Save,
  Camera,
  BookOpen,
  Loader2
} from "lucide-react";

interface ProfileData {
  full_name: string;
  email: string;
  phone_number: string | null;
  bio: string | null;
  department: string | null;
  avatar_url: string | null;
  fields_of_interest: string[] | null;
  institution_name?: string;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
}

export default function ReviewerProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ReviewStats>({ totalReviews: 0, averageRating: 0 });
  const [newExpertise, setNewExpertise] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile with institution
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(`
          full_name,
          email,
          phone_number,
          bio,
          department,
          avatar_url,
          fields_of_interest,
          institution_id
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // Fetch institution name if exists
      let institutionName = "";
      if (profileData?.institution_id) {
        const { data: instData } = await supabase
          .from("institutions")
          .select("name")
          .eq("id", profileData.institution_id)
          .maybeSingle();
        institutionName = instData?.name || "";
      }

      // Fetch review stats
      const { data: reviews } = await supabase
        .from("paper_reviews")
        .select("overall_rating")
        .eq("reviewer_id", user.id);

      const totalReviews = reviews?.length || 0;
      const ratings = reviews?.map(r => r.overall_rating).filter(r => r !== null) || [];
      const averageRating = ratings.length > 0 
        ? Math.round((ratings.reduce((a, b) => a + (b || 0), 0) / ratings.length) * 10) / 10
        : 0;

      setProfile({
        ...profileData,
        institution_name: institutionName,
      } as ProfileData);
      setStats({ totalReviews, averageRating });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          bio: profile.bio,
          department: profile.department,
          fields_of_interest: profile.fields_of_interest,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddExpertise = () => {
    if (!newExpertise.trim() || !profile) return;
    const updated = [...(profile.fields_of_interest || []), newExpertise.trim()];
    setProfile({ ...profile, fields_of_interest: updated });
    setNewExpertise("");
  };

  const handleRemoveExpertise = (index: number) => {
    if (!profile) return;
    const updated = (profile.fields_of_interest || []).filter((_, i) => i !== index);
    setProfile({ ...profile, fields_of_interest: updated });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <ReviewerLayout>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          </div>
        </div>
      </ReviewerLayout>
    );
  }

  return (
    <ReviewerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Profile Settings</h2>
          <p className="text-muted-foreground">Manage your reviewer profile and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="border-none shadow-lg lg:col-span-1">
            <CardContent className="p-6 text-center">
              <div className="relative inline-block mb-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-stat-green text-white text-2xl font-bold">
                    {profile?.full_name ? getInitials(profile.full_name) : "R"}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-stat-blue flex items-center justify-center text-white hover:opacity-90">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-xl font-semibold text-foreground">{profile?.full_name || "Reviewer"}</h3>
              <p className="text-sm text-muted-foreground mb-2">{profile?.department || "Reviewer"}</p>
              <Badge className="bg-stat-green text-white">Verified Reviewer</Badge>
              
              <div className="mt-6 pt-6 border-t border-border">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalReviews}</p>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.averageRating || "-"}</p>
                    <p className="text-xs text-muted-foreground">Avg Rating</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Form */}
          <Card className="border-none shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-foreground">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="fullName" 
                      value={profile?.full_name || ""} 
                      onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                      className="pl-9 rounded-xl" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      value={profile?.email || ""} 
                      disabled
                      className="pl-9 rounded-xl bg-muted" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      value={profile?.phone_number || ""} 
                      onChange={(e) => setProfile(prev => prev ? { ...prev, phone_number: e.target.value } : null)}
                      className="pl-9 rounded-xl" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution">Institution</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="institution" 
                      value={profile?.institution_name || ""} 
                      disabled
                      className="pl-9 rounded-xl bg-muted" 
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="department">Department / Title</Label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="department" 
                      value={profile?.department || ""} 
                      onChange={(e) => setProfile(prev => prev ? { ...prev, department: e.target.value } : null)}
                      className="pl-9 rounded-xl" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea 
                  id="bio" 
                  placeholder="Tell us about your expertise and research interests..."
                  value={profile?.bio || ""}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
                  className="rounded-xl min-h-[100px]"
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-stat-blue hover:bg-stat-blue/90">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Expertise */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Award className="w-5 h-5" />
              Areas of Expertise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {(profile?.fields_of_interest || []).map((item, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="px-3 py-1 text-sm cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleRemoveExpertise(index)}
                >
                  {item} ×
                </Badge>
              ))}
              {(!profile?.fields_of_interest || profile.fields_of_interest.length === 0) && (
                <p className="text-sm text-muted-foreground">No expertise areas added yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="Add new expertise..." 
                value={newExpertise}
                onChange={(e) => setNewExpertise(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddExpertise()}
                className="rounded-xl flex-1" 
              />
              <Button variant="outline" onClick={handleAddExpertise} className="rounded-xl">Add</Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-stat-green rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Profile Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Keep your expertise areas updated for better paper matching</li>
                  <li>• A complete profile helps authors understand your background</li>
                  <li>• Verified reviewers get priority for high-impact papers</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ReviewerLayout>
  );
}
