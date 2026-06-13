import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import InvestorLayout from "@/components/layout/InvestorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User as UserIcon, Mail, Camera, Shield, Info, Briefcase } from "lucide-react";

export default function InvestorProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [investmentFocus, setInvestmentFocus] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        setFullName(user.user_metadata?.full_name || "");
        setInvestmentFocus(user.user_metadata?.investment_focus || "");
        setAvatarUrl(user.user_metadata?.avatar_url || "");
      }
    });
  }, []);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName, investment_focus: investmentFocus, avatar_url: avatarUrl }
      });

      if (error) throw error;
      
      toast({ title: "Profile updated successfully" });
    } catch (error: any) {
      toast({ title: "Error updating profile", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <InvestorLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Investor Profile</h1>
          <p className="text-muted-foreground">Manage your investor account</p>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Profile Tips</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• A complete profile builds trust with researchers</li>
                  <li>• Define your investment focus areas</li>
                  <li>• Add verification for credibility</li>
                  <li>• Connect your organization details</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

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
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-primary-foreground text-3xl font-bold shadow-lg overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    fullName?.charAt(0)?.toUpperCase() || "I"
                  )}
                </div>
                <div className="space-y-2">
                  <Button variant="outline" className="rounded-xl">
                    Upload Photo
                  </Button>
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
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
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

        {/* Investment Focus Card */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Investment Focus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={investmentFocus}
              onChange={(e) => setInvestmentFocus(e.target.value)}
              placeholder="Describe your investment interests, preferred research areas, and funding criteria..."
              className="rounded-xl min-h-[120px]"
            />
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
            <Button variant="outline" className="rounded-xl">
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleUpdateProfile} 
            disabled={loading}
            className="rounded-xl px-8 gradient-hero"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </InvestorLayout>
  );
}