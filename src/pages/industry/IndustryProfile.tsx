import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import IndustryLayout from "@/components/layout/IndustryLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/CurrencyContext";
import { Building2, Mail, Camera, Shield, Info, Globe, MapPin, Loader2, Eye, EyeOff } from "lucide-react";
import { prepareAvatarImage } from "@/lib/avatarImage";

interface Profile {
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  company_address: string | null;
}

export default function IndustryProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    bio: "",
    avatar_url: "",
    phone_number: "",
    company_address: "",
  });
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const { toast } = useToast();
  const { currency, saveCurrencyPreference } = useCurrency();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('full_name, bio, avatar_url, phone_number, company_address')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData && !error) {
          setProfile({
            full_name: profileData.full_name || "",
            bio: profileData.bio || "",
            avatar_url: profileData.avatar_url || "",
            phone_number: profileData.phone_number || "",
            company_address: profileData.company_address || "",
          });
        }
        
        setCompanyName(user.user_metadata?.company_name || "");
        setWebsite(user.user_metadata?.website || "");
        setLocation(user.user_metadata?.location || "");
      }
      setFetchingProfile(false);
    };

    fetchUserAndProfile();
  }, []);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
          phone_number: profile.phone_number,
          company_address: profile.company_address,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: profile.full_name, company_name: companyName, website, location }
      });

      if (authError) throw authError;
      toast({ title: "Profile updated successfully" });
    } catch (error: any) {
      toast({ title: "Error updating profile", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    try {
      const avatarFile = await prepareAvatarImage(file);
      const filePath = `${user.id}/logo.jpg`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', user.id);
      toast({ title: "Logo uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Error uploading logo", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
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
      // Update password
      const { error } = await supabase.auth.updateUser({ currentPassword: oldPassword, password: newPassword });
      if (error) throw error;

      toast({ title: "Password changed successfully" });
      setPasswordDialogOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Error changing password", description: error.message, variant: "destructive" });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (fetchingProfile) {
    return (
      <IndustryLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </IndustryLayout>
    );
  }

  return (
    <IndustryLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Company Profile</h1>
          <p className="text-muted-foreground">Manage your company information</p>
        </div>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Profile Tips</h4>
                <p className="text-sm text-muted-foreground">A complete profile attracts more researchers.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="w-5 h-5 text-primary" />Company Logo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-primary-foreground text-3xl font-bold shadow-lg overflow-hidden">
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="Logo" className="w-full h-full object-cover" /> : companyName?.charAt(0)?.toUpperCase() || "C"}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo" className="cursor-pointer">
                    <Button variant="outline" className="rounded-xl" asChild disabled={loading}><span>{loading ? "Uploading..." : "Upload Logo"}</span></Button>
                  </Label>
                  <Input id="logo" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <p className="text-xs text-muted-foreground">Auto-cropped square, compressed to 50KB</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" />Company Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Enter company name" className="rounded-xl mt-1" />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profile.phone_number || ""}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="e.g. +234 801 234 5678"
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2 mt-1"><Mail className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">{user?.email}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-primary" />Website</CardTitle></CardHeader>
          <CardContent><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://www.yourcompany.com" className="rounded-xl" /></CardContent>
        </Card>

        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />Location</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label htmlFor="location">City / Region</Label><Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lagos, Nigeria" className="rounded-xl mt-1" /></div>
              <div><Label htmlFor="address">Address</Label><Input id="address" value={profile.company_address || ""} onChange={(e) => setProfile(prev => ({ ...prev, company_address: e.target.value }))} placeholder="Company address" className="rounded-xl mt-1" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent><Textarea value={profile.bio || ""} onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))} placeholder="Describe your company..." className="rounded-xl min-h-[100px]" /></CardContent>
        </Card>

        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader><CardTitle>Currency Preference</CardTitle></CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Select value={currency} onValueChange={saveCurrencyPreference}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="NGN">₦ NGN</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                  <SelectItem value="GBP">£ GBP</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">Currency will be applied across all pages</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Security</CardTitle></CardHeader>
          <CardContent>
            <Button variant="outline" className="rounded-xl" onClick={() => setPasswordDialogOpen(true)}>Change Password</Button>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleUpdateProfile} disabled={loading} className="rounded-xl px-8 gradient-hero">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </div>

        {/* Change Password Modal */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Current Password</Label>
                <div className="relative mt-1">
                  <Input type={showOldPassword ? "text" : "password"} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Enter current password" className="rounded-xl pr-10" />
                  <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>New Password</Label>
                <div className="relative mt-1">
                  <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="rounded-xl pr-10" />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="rounded-xl mt-1" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setPasswordDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleChangePassword} disabled={passwordLoading} className="rounded-xl gradient-hero">
                  {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Change Password
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </IndustryLayout>
  );
}
