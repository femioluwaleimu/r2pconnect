import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Loader2, CheckCircle, XCircle, Building2, ArrowLeft } from "lucide-react";

interface InviteDetails {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  institution_id: string;
  institution_name: string;
  status: string;
  expires_at: string;
}

export default function SupervisorInvite() {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("code");
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (inviteCode) {
      validateInvite();
    } else {
      setError("No invite code provided");
      setLoading(false);
    }
  }, [inviteCode]);

  const validateInvite = async () => {
    setLoading(true);
    try {
      // Fetch invite details
      const { data: inviteData, error: inviteError } = await supabase
        .from("supervisor_invites")
        .select(`
          id,
          full_name,
          email,
          department,
          institution_id,
          status,
          expires_at
        `)
        .eq("invite_code", inviteCode)
        .maybeSingle();

      if (inviteError || !inviteData) {
        setError("Invalid or expired invite code");
        setLoading(false);
        return;
      }

      if (inviteData.status !== "pending") {
        setError("This invitation has already been used or cancelled");
        setLoading(false);
        return;
      }

      if (new Date(inviteData.expires_at) < new Date()) {
        setError("This invitation has expired");
        setLoading(false);
        return;
      }

      // Fetch institution name
      const { data: institutionData } = await supabase
        .from("institutions")
        .select("name")
        .eq("id", inviteData.institution_id)
        .maybeSingle();

      setInvite({
        ...inviteData,
        institution_name: institutionData?.name || "Unknown Institution"
      });
    } catch (err) {
      setError("Failed to validate invitation");
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invite) return;

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: {
            full_name: invite.full_name,
            role: "supervisor",
            institution_id: invite.institution_id
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update user role to supervisor
        await supabase.from("user_roles").upsert({
          user_id: authData.user.id,
          role: "supervisor"
        });

        // Create supervisor record
        await supabase.from("supervisors").insert({
          user_id: authData.user.id,
          institution_id: invite.institution_id,
          department: invite.department,
          max_students: 10,
          current_students: 0,
          is_active: false,
          verification_status: "pending_verification"
        });

        // Update profile with institution_id
        await supabase
          .from("profiles")
          .update({ 
            institution_id: invite.institution_id,
            department: invite.department
          })
          .eq("user_id", authData.user.id);

        // Mark invite as accepted
        await supabase
          .from("supervisor_invites")
          .update({ 
            status: "accepted",
            accepted_at: new Date().toISOString()
          })
          .eq("id", invite.id);

        // Send notification email to institution admin
        const { data: institutionData } = await supabase
          .from("institutions")
          .select("admin_user_id, name")
          .eq("id", invite.institution_id)
          .maybeSingle();

        if (institutionData?.admin_user_id) {
          const { data: adminProfile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("user_id", institutionData.admin_user_id)
            .maybeSingle();

          if (adminProfile?.email) {
            await supabase.functions.invoke("send-email", {
              body: {
                type: "supervisor_registered",
                to: adminProfile.email,
                data: {
                  adminName: adminProfile.full_name,
                  supervisorName: invite.full_name,
                  supervisorEmail: invite.email,
                  department: invite.department,
                  institutionName: institutionData.name
                }
              }
            });
          }
        }

        setSuccess(true);
        toast({ 
          title: "Account created successfully!", 
          description: "You can now sign in as a supervisor" 
        });
      }
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast({ 
        title: "Error creating account", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-teal-50 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-teal-50 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-2xl shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link to="/">
              <Button variant="outline" className="rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-teal-50 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-2xl shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Account Created!</h2>
            <p className="text-muted-foreground mb-6">
              Your supervisor account has been created successfully. You can now sign in to access your dashboard.
            </p>
            <Button 
              onClick={() => navigate("/auth")} 
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-teal-50 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Supervisor Invitation</CardTitle>
          <CardDescription>
            Complete your registration to join as a supervisor
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {/* Institution Info */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">{invite?.institution_name}</p>
                <p className="text-sm text-muted-foreground">has invited you to join as a supervisor</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={invite?.full_name || ""}
                disabled
                className="rounded-xl bg-muted"
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                value={invite?.email || ""}
                disabled
                className="rounded-xl bg-muted"
              />
            </div>

            {invite?.department && (
              <div>
                <Label>Department</Label>
                <Input
                  value={invite.department}
                  disabled
                  className="rounded-xl bg-muted"
                />
              </div>
            )}

            <div>
              <Label htmlFor="password">Create Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="rounded-xl"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link to="/auth" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
