import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Loader2, CheckCircle, XCircle, Building2, ArrowLeft, User, Mail } from "lucide-react";

interface InviteDetails {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  institution_name: string | null;
  student_id: string;
  status: string;
  expires_at: string;
}

const createUuid = () => {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
};

export default function ExternalSupervisorInvite() {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("code");
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [studentName, setStudentName] = useState<string>("");
  const [studentEmail, setStudentEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    department: "",
    institutionName: "",
  });
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
      const { data: inviteData, error: inviteError } = await supabase
        .from("external_supervisor_invites")
        .select("*")
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

      // Get student name
      const { data: studentProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", inviteData.student_id)
        .maybeSingle();

      setStudentName(studentProfile?.full_name || "A student");
      setStudentEmail(studentProfile?.email || "");
      setInvite(inviteData);
      setFormData({
        fullName: inviteData.full_name,
        department: inviteData.department || "",
        institutionName: inviteData.institution_name || "",
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
            full_name: formData.fullName,
            role: "supervisor",
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update user role to supervisor
        const { error: roleError } = await supabase.from("user_roles").upsert({
          user_id: authData.user.id,
          role: "supervisor"
        });
        if (roleError) console.error("Role upsert failed:", roleError);

        // Create supervisor record (external - no institution_id)
        const { error: supError } = await supabase.from("supervisors").insert({
          user_id: authData.user.id,
          institution_id: null,
          department: formData.department || null,
          max_students: 10,
          current_students: 0,
          is_active: true,
          is_external: true,
        });
        if (supError) console.error("Supervisor insert failed:", supError);

        // Update profile
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ 
            department: formData.department || null,
            full_name: formData.fullName,
          })
          .eq("user_id", authData.user.id);
        if (profileError) console.error("Profile update failed:", profileError);

        // Mark invite as accepted
        const { error: inviteError } = await supabase
          .from("external_supervisor_invites")
          .update({ 
            status: "accepted",
            accepted_at: new Date().toISOString()
          })
          .eq("id", invite.id);
        if (inviteError) console.error("Invite status update failed:", inviteError);

        const notificationMessage = `${formData.fullName} has accepted your invitation and registered as your supervisor.`;

        const { error: notificationError } = await supabase.from("notifications").insert({
          id: createUuid(),
          user_id: invite.student_id,
          title: "Supervisor Registered",
          message: notificationMessage,
          type: "success",
          link: "/dashboard/research",
          is_read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (notificationError) console.error("Student notification failed:", notificationError);

        if (studentEmail) {
          const { error: emailError } = await supabase.functions.invoke("send-email", {
            body: {
              type: "external_supervisor_accepted",
              to: studentEmail,
              data: {
                studentName,
                supervisorName: formData.fullName,
                supervisorEmail: invite.email,
                dashboardLink: `${window.location.origin}/dashboard/research`,
              },
            },
          });
          if (emailError) console.error("Student email notification failed:", emailError);
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
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-background to-purple-50 dark:from-violet-950/20 dark:via-background dark:to-purple-950/20 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-background to-purple-50 dark:from-violet-950/20 dark:via-background dark:to-purple-950/20 flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-background to-purple-50 dark:from-violet-950/20 dark:via-background dark:to-purple-950/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-2xl shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stat-green/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-stat-green" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Account Created!</h2>
            <p className="text-muted-foreground mb-6">
              Your supervisor account has been created successfully. You can now sign in to supervise {studentName}'s research.
            </p>
            <Button 
              onClick={() => navigate("/auth")} 
              className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-background to-purple-50 dark:from-violet-950/20 dark:via-background dark:to-purple-950/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">External Supervisor Invitation</CardTitle>
          <CardDescription>
            {studentName} has invited you to be their research supervisor
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </Label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className="rounded-xl mt-1"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                value={invite?.email || ""}
                disabled
                className="rounded-xl mt-1 bg-muted"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Institution Name
              </Label>
              <Input
                value={formData.institutionName}
                onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                placeholder="e.g., University of Lagos"
                className="rounded-xl mt-1"
              />
            </div>

            <div>
              <Label>Department (Optional)</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Computer Science"
                className="rounded-xl mt-1"
              />
            </div>

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
                className="rounded-xl mt-1"
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
                className="rounded-xl mt-1"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account & Accept"
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
