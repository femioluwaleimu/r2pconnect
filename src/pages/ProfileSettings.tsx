import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User as UserIcon, Mail, Camera, Shield, Bell, Phone, Building2, Info, Loader2, GraduationCap, Briefcase, BadgeCheck, Globe, KeyRound, FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/context/CurrencyContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ReferralCard from "@/components/ReferralCard";

interface Profile {
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  company_address: string | null;
  researcher_type: string | null;
  matric_number: string | null;
  department: string | null;
  level: string | null;
  skills: string[] | null;
  fields_of_interest: string[] | null;
  cv_url: string | null;
  availability: string | null;
  preferred_job_type: string[] | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  is_verified: boolean | null;
  institution_id: string | null;
}

interface NotificationPreferences {
  email_notifications: boolean;
  collaboration_requests: boolean;
  challenge_updates: boolean;
}

interface Institution {
  id: string;
  name: string;
}

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      // Treat as comma-separated legacy text below.
    }

    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

export default function ProfileSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    email_notifications: true,
    collaboration_requests: true,
    challenge_updates: true,
  });
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    bio: "",
    avatar_url: "",
    phone_number: "",
    company_address: "",
    researcher_type: null,
    matric_number: null,
    department: null,
    level: null,
    skills: [],
    fields_of_interest: [],
    cv_url: null,
    availability: null,
    preferred_job_type: [],
    bank_name: null,
    account_number: null,
    account_name: null,
    is_verified: false,
    institution_id: null,
  });
  const { toast } = useToast();
  const { currency, saveCurrencyPreference } = useCurrency();
  const notificationPrefsKey = user?.id ? `notification_prefs_${user.id}` : null;

  const availableCurrencies = ['USD', 'NGN', 'EUR', 'GBP'];

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileData && !error) {
          setProfile({
            full_name: profileData.full_name || "",
            bio: profileData.bio || "",
            avatar_url: profileData.avatar_url || "",
            phone_number: profileData.phone_number || "",
            company_address: profileData.company_address || "",
            researcher_type: profileData.researcher_type,
            matric_number: profileData.matric_number,
            department: profileData.department,
            level: profileData.level,
            skills: toStringArray(profileData.skills),
            fields_of_interest: toStringArray(profileData.fields_of_interest),
            cv_url: profileData.cv_url,
            availability: profileData.availability,
            preferred_job_type: toStringArray(profileData.preferred_job_type),
            bank_name: profileData.bank_name,
            account_number: profileData.account_number,
            account_name: profileData.account_name,
            is_verified: profileData.is_verified,
            institution_id: profileData.institution_id,
          });
        }

        // Fetch institutions
        const { data: institutionsData } = await supabase
          .from('institutions')
          .select('id, name')
          .order('name');
        
        if (institutionsData) {
          setInstitutions(institutionsData);
        }

        // Load notification preferences from localStorage
        const savedNotifPrefs = localStorage.getItem(`notification_prefs_${user.id}`);
        if (savedNotifPrefs) {
          setNotificationPrefs(JSON.parse(savedNotifPrefs));
        }
      }
      setFetchingProfile(false);
    };

    fetchUserAndProfile();
  }, []);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          phone_number: profile.phone_number,
          company_address: profile.company_address,
          researcher_type: profile.researcher_type,
          matric_number: profile.matric_number,
          department: profile.department,
          level: profile.level,
          skills: profile.skills,
          fields_of_interest: profile.fields_of_interest,
          cv_url: profile.cv_url,
          availability: profile.availability,
          preferred_job_type: profile.preferred_job_type,
          bank_name: profile.bank_name,
          account_number: profile.account_number,
          account_name: profile.account_name,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Also update auth metadata for full_name
      await supabase.auth.updateUser({
        data: { full_name: profile.full_name }
      });

      // Save notification preferences to localStorage
      if (user?.id) {
        localStorage.setItem(`notification_prefs_${user.id}`, JSON.stringify(notificationPrefs));
      }
      
      toast({ title: "Profile updated successfully" });
    } catch (error: any) {
      toast({ title: "Error updating profile", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      
      // Update profile in database
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);
      
      toast({ title: "Avatar uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Error uploading avatar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.new || !passwordForm.confirm) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (passwordForm.new.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setPasswordLoading(true);
    try {
      // Use Supabase auth updateUser for password change
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new
      });

      if (error) {
        // Handle specific error for reauthentication requirement
        if (error.message.includes("reauthentication") || error.message.includes("session")) {
          toast({ 
            title: "Session expired", 
            description: "Please log out and log back in to change your password.",
            variant: "destructive" 
          });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: "Password updated successfully" });
      setPasswordDialogOpen(false);
      setPasswordForm({ current: "", new: "", confirm: "" });
    } catch (error: any) {
      toast({ title: "Error updating password", description: error.message, variant: "destructive" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const getInstitutionName = () => {
    if (!profile.institution_id) return "Not selected";
    const inst = institutions.find(i => i.id === profile.institution_id);
    return inst?.name || "Unknown institution";
  };

  if (fetchingProfile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* Referral Card */}
        <ReferralCard />

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Profile Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• A complete profile increases your visibility to collaborators</li>
                  <li>• Add a professional photo to build trust</li>
                  <li>• Your bio appears on your research papers</li>
                  <li>• Keep your contact information up to date</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currency Preferences */}
        <Card className="shadow-card rounded-2xl border-border/50 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Currency Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Default Currency</Label>
                <p className="text-sm text-muted-foreground">This will apply across your wallet, earnings, subscriptions, and payments</p>
              </div>
              <Select
                value={currency}
                onValueChange={(value) => saveCurrencyPreference(value)}
              >
                <SelectTrigger className="w-32 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((curr) => (
                    <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Researcher Type Card */}
        <Card className="shadow-card rounded-2xl border-border/50 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Researcher Type
              {profile.is_verified && (
                <Badge className="ml-2 bg-green-500 text-white">
                  <BadgeCheck className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Are you a Lecturer or Student?</Label>
              <Select
                value={profile.researcher_type || ""}
                onValueChange={(value) => setProfile(prev => ({ ...prev, researcher_type: value }))}
              >
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue placeholder="Select researcher type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lecturer">Lecturer / Academic Staff</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="graduate">Graduate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Institution</Label>
              <div className="mt-1 p-3 bg-muted/50 rounded-xl border border-border/50">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{getInstitutionName()}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Institution is set during registration and cannot be changed</p>
              </div>
            </div>

            {profile.researcher_type === 'student' && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="matric">Matric Number / Student ID</Label>
                    <Input
                      id="matric"
                      value={profile.matric_number || ""}
                      onChange={(e) => setProfile(prev => ({ ...prev, matric_number: e.target.value }))}
                      placeholder="e.g. CSC/2020/001"
                      className="rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <Label>Level</Label>
                    <Select
                      value={profile.level || ""}
                      onValueChange={(value) => setProfile(prev => ({ ...prev, level: value }))}
                    >
                      <SelectTrigger className="rounded-xl mt-1">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ND1">ND 1</SelectItem>
                        <SelectItem value="ND2">ND 2</SelectItem>
                        <SelectItem value="HND1">HND 1</SelectItem>
                        <SelectItem value="HND2">HND 2</SelectItem>
                        <SelectItem value="100">100 Level</SelectItem>
                        <SelectItem value="200">200 Level</SelectItem>
                        <SelectItem value="300">300 Level</SelectItem>
                        <SelectItem value="400">400 Level</SelectItem>
                        <SelectItem value="500">500 Level</SelectItem>
                        <SelectItem value="postgraduate">Postgraduate</SelectItem>
                        <SelectItem value="postgraduate_master">Postgraduate - Master</SelectItem>
                        <SelectItem value="postgraduate_phd">Postgraduate - PhD</SelectItem>
                        <SelectItem value="graduate">Graduate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={profile.department || ""}
                    onChange={(e) => setProfile(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g. Computer Science"
                    className="rounded-xl mt-1"
                  />
                </div>
              </>
            )}

            {profile.researcher_type === 'lecturer' && (
              <>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={profile.department || ""}
                    onChange={(e) => setProfile(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g. Computer Science"
                    className="rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label>Fields of Interest</Label>
                  <Textarea
                    value={profile.fields_of_interest?.join(', ') || ""}
                    onChange={(e) => setProfile(prev => ({ 
                      ...prev, 
                      fields_of_interest: e.target.value.split(',').map(f => f.trim()).filter(Boolean) 
                    }))}
                    placeholder="e.g. Machine Learning, Data Science, Artificial Intelligence"
                    className="rounded-xl mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Separate multiple fields with commas</p>
                </div>
              </>
            )}

            {profile.researcher_type === 'graduate' && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="matric">Matric Number / Student ID</Label>
                    <Input
                      id="matric"
                      value={profile.matric_number || ""}
                      onChange={(e) => setProfile(prev => ({ ...prev, matric_number: e.target.value }))}
                      placeholder="e.g. CSC/2020/001"
                      className="rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <Label>Level</Label>
                    <Select
                      value={profile.level || ""}
                      onValueChange={(value) => setProfile(prev => ({ ...prev, level: value }))}
                    >
                      <SelectTrigger className="rounded-xl mt-1">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ND1">ND 1</SelectItem>
                        <SelectItem value="ND2">ND 2</SelectItem>
                        <SelectItem value="HND1">HND 1</SelectItem>
                        <SelectItem value="HND2">HND 2</SelectItem>
                        <SelectItem value="100">100 Level</SelectItem>
                        <SelectItem value="200">200 Level</SelectItem>
                        <SelectItem value="300">300 Level</SelectItem>
                        <SelectItem value="400">400 Level</SelectItem>
                        <SelectItem value="500">500 Level</SelectItem>
                        <SelectItem value="postgraduate">Postgraduate</SelectItem>
                        <SelectItem value="postgraduate_master">Postgraduate - Master</SelectItem>
                        <SelectItem value="postgraduate_phd">Postgraduate - PhD</SelectItem>
                        <SelectItem value="graduate">Graduate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={profile.department || ""}
                    onChange={(e) => setProfile(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g. Computer Science"
                    className="rounded-xl mt-1"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Skills & Job Preferences (for students) */}
        {(profile.researcher_type === 'student' || profile.researcher_type === 'graduate') && (
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Skills & Job Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Skills</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && skillInput.trim()) {
                        e.preventDefault();
                        setProfile(prev => ({
                          ...prev,
                          skills: [...(prev.skills || []), skillInput.trim()]
                        }));
                        setSkillInput("");
                      }
                    }}
                    placeholder="Type a skill and press Enter"
                    className="rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (skillInput.trim()) {
                        setProfile(prev => ({
                          ...prev,
                          skills: [...(prev.skills || []), skillInput.trim()]
                        }));
                        setSkillInput("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.skills?.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => {
                      setProfile(prev => ({
                        ...prev,
                        skills: prev.skills?.filter((_, i) => i !== index)
                      }));
                    }}>
                      {skill} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Availability</Label>
                <Select
                  value={profile.availability || ""}
                  onValueChange={(value) => setProfile(prev => ({ ...prev, availability: value }))}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available Now</SelectItem>
                    <SelectItem value="part_time">Part-time Only</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Preferred Job Types</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['part_time', 'siwes', 'industrial_training', 'internship'].map((type) => (
                    <Badge
                      key={type}
                      variant={profile.preferred_job_type?.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setProfile(prev => ({
                          ...prev,
                          preferred_job_type: prev.preferred_job_type?.includes(type)
                            ? prev.preferred_job_type.filter(t => t !== type)
                            : [...(prev.preferred_job_type || []), type]
                        }));
                      }}
                    >
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* CV Upload */}
              <div>
                <Label>CV / Resume</Label>
                <div className="mt-2">
                  {profile.cv_url ? (
                    <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <FileText className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-700 flex-1">CV uploaded successfully</span>
                      <a
                        href={profile.cv_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        View CV
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProfile(prev => ({ ...prev, cv_url: null }))}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !user) return;

                          if (file.size > 10 * 1024 * 1024) {
                            toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
                            return;
                          }

                          setLoading(true);
                          try {
                            const fileExt = file.name.split('.').pop();
                            const filePath = `${user.id}/cv.${fileExt}`;

                            const { error: uploadError } = await supabase.storage
                              .from('avatars')
                              .upload(filePath, file, { upsert: true });

                            if (uploadError) throw uploadError;

                            const { data: { publicUrl } } = supabase.storage
                              .from('avatars')
                              .getPublicUrl(filePath);

                            setProfile(prev => ({ ...prev, cv_url: publicUrl }));
                            toast({ title: "CV uploaded successfully" });
                          } catch (error: any) {
                            toast({ title: "Error uploading CV", description: error.message, variant: "destructive" });
                          } finally {
                            setLoading(false);
                          }
                        }}
                        id="cv-upload"
                        className="hidden"
                      />
                      <label
                        htmlFor="cv-upload"
                        className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Upload CV (PDF, DOC, DOCX - Max 10MB)</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bank Details (for all researcher types) */}
        {(profile.researcher_type === 'student' || profile.researcher_type === 'lecturer' || profile.researcher_type === 'graduate') && (
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Bank Details (For Withdrawals)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={profile.bank_name || ""}
                    onChange={(e) => setProfile(prev => ({ ...prev, bank_name: e.target.value }))}
                    placeholder="e.g. First Bank"
                    className="rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={profile.account_number || ""}
                    onChange={(e) => setProfile(prev => ({ ...prev, account_number: e.target.value }))}
                    placeholder="0123456789"
                    className="rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    value={profile.account_name || ""}
                    onChange={(e) => setProfile(prev => ({ ...prev, account_name: e.target.value }))}
                    placeholder="Account holder name"
                    className="rounded-xl mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Avatar Card */}
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-3xl font-bold shadow-lg overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    profile.full_name?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar" className="cursor-pointer">
                    <Button variant="outline" className="rounded-xl" asChild disabled={loading}>
                      <span>{loading ? "Uploading..." : "Upload Photo"}</span>
                    </Button>
                  </Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <p className="text-xs text-muted-foreground">JPG, PNG up to 5MB</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Info Card */}
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-primary" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={profile.full_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{user?.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Info Card */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profile.phone_number || ""}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="+234 800 000 0000"
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={profile.company_address || ""}
                  onChange={(e) => setProfile(prev => ({ ...prev, company_address: e.target.value }))}
                  placeholder="Enter company address"
                  className="rounded-xl mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio Card */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle>Bio</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={profile.bio || ""}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about yourself, your research interests, and expertise..."
              className="rounded-xl min-h-[120px]"
            />
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates about your research</p>
              </div>
              <Switch 
                checked={notificationPrefs.email_notifications}
                onCheckedChange={(checked) => setNotificationPrefs(prev => ({ ...prev, email_notifications: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Collaboration Requests</p>
                <p className="text-sm text-muted-foreground">Get notified when someone wants to collaborate</p>
              </div>
              <Switch 
                checked={notificationPrefs.collaboration_requests}
                onCheckedChange={(checked) => setNotificationPrefs(prev => ({ ...prev, collaboration_requests: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Challenge Updates</p>
                <p className="text-sm text-muted-foreground">Updates on challenges you're participating in</p>
              </div>
              <Switch 
                checked={notificationPrefs.challenge_updates}
                onCheckedChange={(checked) => setNotificationPrefs(prev => ({ ...prev, challenge_updates: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="rounded-xl" onClick={() => setPasswordDialogOpen(true)}>
              <KeyRound className="w-4 h-4 mr-2" />
              Change Password
            </Button>
            <p className="text-sm text-muted-foreground">
              Keep your account secure with a strong password
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleUpdateProfile} 
            disabled={loading}
            className="rounded-xl px-8 gradient-hero"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Enter your new password below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={passwordForm.new}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setPasswordDialogOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleChangePassword} 
                disabled={passwordLoading}
                className="rounded-xl"
              >
                {passwordLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
