import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import { prepareAvatarImage } from "@/lib/avatarImage";
import SupervisorLayout from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatLagos } from "@/lib/dateUtils";
import {
  User as UserIcon,
  Mail,
  Building2,
  Loader2,
  Save,
  Camera,
  Phone,
  Calendar,
  GraduationCap,
  Users,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Sparkles,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  IdCard,
  Award,
} from "lucide-react";

export default function SupervisorProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    bio: "",
    department: "",
    avatar_url: "",
    phone_number: "",
    created_at: "",
    is_verified: false,
    fields_of_interest: [] as string[],
  });
  const [supervisorDetails, setSupervisorDetails] = useState({
    id: "",
    academic_rank: "",
    staff_id: "",
  });
  const [institution, setInstitution] = useState<string>("");
  const [stats, setStats] = useState({ students: 0, pending: 0, approved: 0, total: 0 });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchProfile(user.id);
      fetchStats(user.id);
    });
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, email, bio, department, avatar_url, institution_id, phone_number, created_at, is_verified, fields_of_interest")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileData) {
      setProfile({
        full_name: profileData.full_name || "",
        email: profileData.email || "",
        bio: profileData.bio || "",
        department: profileData.department || "",
        avatar_url: profileData.avatar_url || "",
        phone_number: profileData.phone_number || "",
        created_at: profileData.created_at || "",
        is_verified: !!profileData.is_verified,
        fields_of_interest: profileData.fields_of_interest || [],
      });

      if (profileData.institution_id) {
        const { data: instData } = await supabase
          .from("institutions")
          .select("name")
          .eq("id", profileData.institution_id)
          .maybeSingle();
        if (instData) setInstitution(instData.name);
      }
    }

    const { data: supervisorData } = await supabase
      .from("supervisors")
      .select("id, academic_rank, staff_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (supervisorData) {
      setSupervisorDetails({
        id: supervisorData.id || "",
        academic_rank: supervisorData.academic_rank || "",
        staff_id: supervisorData.staff_id || "",
      });
    }
    setLoading(false);
  };

  const fetchStats = async (userId: string) => {
    const [{ count: total }, { count: pending }, { count: approved }] = await Promise.all([
      supabase.from("research_papers").select("id", { count: "exact", head: true })
        .eq("supervisor_id", userId).eq("research_type", "student"),
      supabase.from("research_papers").select("id", { count: "exact", head: true })
        .eq("supervisor_id", userId).eq("research_type", "student").eq("supervisor_approval_status", "pending"),
      supabase.from("research_papers").select("id", { count: "exact", head: true })
        .eq("supervisor_id", userId).eq("research_type", "student").eq("supervisor_approval_status", "approved"),
    ]);

    const { data: studentRows } = await supabase
      .from("research_papers")
      .select("author_id")
      .eq("supervisor_id", userId)
      .eq("research_type", "student");
    const uniqueStudents = new Set((studentRows || []).map((r: any) => r.author_id)).size;

    setStats({
      students: uniqueStudents,
      pending: pending || 0,
      approved: approved || 0,
      total: total || 0,
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
          department: profile.department,
          phone_number: profile.phone_number,
        })
        .eq("user_id", user.id);
      if (error) throw error;

      const supervisorPayload = {
        academic_rank: supervisorDetails.academic_rank.trim() || null,
        staff_id: supervisorDetails.staff_id.trim() || null,
        department: profile.department.trim() || null,
      };

      if (supervisorDetails.id) {
        const { error: supervisorError } = await supabase
          .from("supervisors")
          .update(supervisorPayload)
          .eq("id", supervisorDetails.id);
        if (supervisorError) throw supervisorError;
      } else {
        const { data: existingSupervisor } = await supabase
          .from("supervisors")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingSupervisor?.id) {
          const { error: supervisorError } = await supabase
            .from("supervisors")
            .update(supervisorPayload)
            .eq("id", existingSupervisor.id);
          if (supervisorError) throw supervisorError;
          setSupervisorDetails((current) => ({ ...current, id: existingSupervisor.id }));
        } else {
          const { data: createdSupervisor, error: supervisorError } = await supabase
            .from("supervisors")
            .insert({
              id: crypto.randomUUID(),
              user_id: user.id,
              ...supervisorPayload,
            })
            .select("id")
            .maybeSingle();
          if (supervisorError) throw supervisorError;
          if (createdSupervisor?.id) {
            setSupervisorDetails((current) => ({ ...current, id: createdSupervisor.id }));
          }
        }
      }

      toast({ title: "Profile updated successfully" });
    } catch (error: any) {
      toast({ title: "Error updating profile", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const avatarFile = await prepareAvatarImage(file);
      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { data: updateData, error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
      if (updateError) throw updateError;
      if (updateData?.affected === 0) {
        throw new Error("Profile row was not found, so the avatar could not be saved.");
      }
      setProfile((current) => ({ ...current, avatar_url: avatarUrl }));
      toast({ title: "Avatar updated!" });
    } catch (error: any) {
      toast({ title: "Error uploading avatar", description: error.message, variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({ title: "Please fill in all password fields", variant: "destructive" });
      return;
    }

    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        currentPassword: oldPassword,
        password: newPassword,
      });
      if (error) throw error;

      toast({ title: "Password changed successfully" });
      setPasswordDialogOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowOldPassword(false);
      setShowNewPassword(false);
    } catch (error: any) {
      toast({ title: "Error changing password", description: error.message, variant: "destructive" });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <SupervisorLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </SupervisorLayout>
    );
  }

  const statCards = [
    { label: "Students", value: stats.students, icon: Users, color: "from-indigo-500 to-purple-600" },
    { label: "Pending", value: stats.pending, icon: Sparkles, color: "from-amber-500 to-orange-500" },
    { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "from-emerald-500 to-teal-500" },
    { label: "Total Research", value: stats.total, icon: FileText, color: "from-sky-500 to-blue-600" },
  ];

  return (
    <SupervisorLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground">Your supervisor details and activity</p>
        </div>

        {/* Header card */}
        <Card className="rounded-2xl overflow-hidden border-0 shadow-lg">
          <div className="h-24 md:h-32 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500" />
          <CardContent className="p-6 -mt-12 md:-mt-16">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="relative">
                <Avatar className="w-24 h-24 md:w-28 md:h-28 border-4 border-background shadow-xl">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl font-bold">
                    {profile.full_name?.charAt(0)?.toUpperCase() || "S"}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md">
                  <Camera className="w-4 h-4 text-primary-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground truncate">
                    {profile.full_name || "Supervisor"}
                  </h2>
                  {profile.is_verified && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </Badge>
                  )}
                  <Badge variant="secondary" className="gap-1">
                    <GraduationCap className="w-3 h-3" /> Supervisor
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{profile.email}</span>
                  {institution && (
                    <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{institution}</span>
                  )}
                  {profile.created_at && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />Joined {formatLagos(profile.created_at, "date")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {profile.bio && (
              <>
                <Separator className="my-5" />
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {statCards.map((s) => (
            <Card key={s.label} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 shadow-md`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Details summary */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <DetailRow icon={UserIcon} label="Full name" value={profile.full_name || "—"} />
            <DetailRow icon={Mail} label="Email" value={profile.email} />
            <DetailRow icon={Phone} label="Phone" value={profile.phone_number || "—"} />
            <DetailRow icon={Building2} label="Institution" value={institution || "—"} />
            <DetailRow icon={GraduationCap} label="Department" value={profile.department || "—"} />
            <DetailRow icon={Award} label="Academic Rank" value={supervisorDetails.academic_rank || "—"} />
            <DetailRow icon={IdCard} label="Staff ID" value={supervisorDetails.staff_id || "—"} />
            <DetailRow icon={Calendar} label="Member since" value={profile.created_at ? formatLagos(profile.created_at, "date") : "—"} />
          </CardContent>
        </Card>

        {/* Edit form */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="w-5 h-5" /> Edit Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="rounded-xl" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile.email} disabled className="rounded-xl bg-muted" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={profile.phone_number}
                  onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                  placeholder="+234..." className="rounded-xl" />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input id="department" value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  placeholder="e.g., Computer Science" className="rounded-xl" />
              </div>
              <div>
                <Label htmlFor="academic_rank">Academic Rank</Label>
                <Input id="academic_rank" value={supervisorDetails.academic_rank}
                  onChange={(e) => setSupervisorDetails({ ...supervisorDetails, academic_rank: e.target.value })}
                  placeholder="e.g., Senior Lecturer" className="rounded-xl" />
              </div>
              <div>
                <Label htmlFor="staff_id">Staff ID</Label>
                <Input id="staff_id" value={supervisorDetails.staff_id}
                  onChange={(e) => setSupervisorDetails({ ...supervisorDetails, staff_id: e.target.value })}
                  placeholder="Institution staff ID" className="rounded-xl" />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Tell students about your research interests and expertise..."
                rows={4} className="rounded-xl" />
            </div>

            <Button onClick={handleSave} disabled={saving}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90">
              {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>) : (<><Save className="w-4 h-4 mr-2" />Save Changes</>)}
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-5 h-5" /> Security
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">Password</p>
              <p className="text-sm text-muted-foreground">Update your account password.</p>
            </div>
            <Button variant="outline" className="rounded-xl gap-2" onClick={() => setPasswordDialogOpen(true)}>
              <KeyRound className="w-4 h-4" />
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Change Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative mt-1">
                <Input
                  id="currentPassword"
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative mt-1">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="rounded-xl mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleChangePassword} disabled={passwordLoading} className="rounded-xl">
                {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Change Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SupervisorLayout>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium text-foreground truncate">{value}</div>
      </div>
    </div>
  );
}
