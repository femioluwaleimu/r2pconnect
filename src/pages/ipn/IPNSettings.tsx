import { useState, useEffect } from "react";
import IPNLayout from "@/components/layout/IPNLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Shield, Loader2, Save, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function IPNSettings() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email || "");
      setLoading(false);
    };
    fetch();
  }, []);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Error updating password", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated successfully" });
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast({ title: "Signed out successfully" });
  };

  if (loading) {
    return (
      <IPNLayout>
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </IPNLayout>
    );
  }

  return (
    <IPNLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Info */}
          <Card className="shadow-card rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="w-5 h-5 text-primary" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={email} disabled className="rounded-xl bg-muted/50" />
                <p className="text-xs text-muted-foreground">Contact support to change your email</p>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="shadow-card rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="w-5 h-5 text-primary" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="rounded-xl"
                />
              </div>
              <Button onClick={handleChangePassword} disabled={changingPassword} className="rounded-xl gap-2">
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Update Password
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sign Out */}
        <Card className="shadow-card rounded-2xl border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <LogOut className="w-5 h-5" />
              Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Sign out of your account on this device.</p>
            <Button variant="destructive" className="rounded-xl gap-2" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </IPNLayout>
  );
}
