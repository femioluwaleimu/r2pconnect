import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleEdgeFunctionResponse } from "@/lib/edgeFunctionError";
import { Loader2, UserCheck, Eye, EyeOff, ArrowLeft, Shield, CheckCircle, KeyRound } from "lucide-react";

interface Institution {
  id: string;
  name: string;
  website: string | null;
}

export default function ReviewerInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const inviteCodeFromUrl = searchParams.get("code") || "";
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [validating, setValidating] = useState(false);
  const [codeValid, setCodeValid] = useState(false);
  const [codeId, setCodeId] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registered, setRegistered] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    verificationCode: inviteCodeFromUrl,
  });

  // Auto-validate if code is in URL
  useEffect(() => {
    if (inviteCodeFromUrl) {
      setFormData(prev => ({ ...prev, verificationCode: inviteCodeFromUrl }));
      validateInviteCode(inviteCodeFromUrl);
    }
  }, [inviteCodeFromUrl]);

  const validateInviteCode = async (code: string) => {
    if (!code.trim()) {
      toast({ title: "Please enter a verification code", variant: "destructive" });
      return;
    }

    setValidating(true);
    try {
      // First try the new reviewer_invites table
      const { data: reviewerInvite, error: inviteError } = await supabase
        .from("reviewer_invites")
        .select("id, institution_id, full_name, email, status, expires_at")
        .eq("invite_code", code.trim())
        .maybeSingle();

      if (reviewerInvite && !inviteError) {
        if (reviewerInvite.status !== "pending") {
          toast({ title: "Invalid code", description: "This invitation has already been used", variant: "destructive" });
          setValidating(false);
          return;
        }
        if (new Date(reviewerInvite.expires_at) < new Date()) {
          toast({ title: "Invalid code", description: "This invitation has expired", variant: "destructive" });
          setValidating(false);
          return;
        }

        // Fetch institution details
        const { data: instData } = await supabase
          .from("institutions")
          .select("id, name, website")
          .eq("id", reviewerInvite.institution_id)
          .maybeSingle();

        if (instData) {
          setCodeValid(true);
          setCodeId(reviewerInvite.id);
          setInstitution({ id: instData.id, name: instData.name, website: instData.website });
          setFormData(prev => ({ 
            ...prev, 
            fullName: reviewerInvite.full_name,
            email: reviewerInvite.email 
          }));
          toast({ title: "Code verified!", description: `Institution: ${instData.name}` });
          setValidating(false);
          return;
        }
      }

      // Fallback to edge function for legacy codes
      const { data, error } = await supabase.functions.invoke("validate-institution-code", {
        body: { verification_code: code.trim() },
      });

      const [result, errorMsg] = handleEdgeFunctionResponse(data, error);
      if (errorMsg) throw new Error(errorMsg);

      if (result?.valid) {
        setCodeValid(true);
        setCodeId(result.code_id);
        setInstitution({
          id: result.institution_id,
          name: result.institution_name,
          website: result.institution_website,
        });
        toast({ title: "Code verified!", description: `Institution: ${result.institution_name}` });
      } else {
        setCodeValid(false);
        setInstitution(null);
        toast({ title: "Invalid code", description: result?.error || "This code is invalid or has been used", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error validating code:", error);
      toast({ title: "Verification Error", description: error.message || "Failed to validate code", variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!institution) {
      toast({ title: "Please verify your invitation code first", variant: "destructive" });
      return;
    }

    if (formData.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Sign up the reviewer
      const { data: authData, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/reviewer`,
          data: {
            full_name: formData.fullName,
            phone_number: formData.phoneNumber,
            role: "reviewer",
            institution_id: institution.id,
          },
        },
      });

      if (error) throw error;

      // Mark the code as used and update invite status
      if (authData.user && codeId) {
        // Mark invite as accepted in reviewer_invites table
        await supabase
          .from("reviewer_invites")
          .update({ 
            status: "accepted",
            accepted_at: new Date().toISOString()
          })
          .eq("id", codeId);

        // Update profile with institution_id (handle_new_user trigger should do this, 
        // but we ensure it's set in case of any timing issues)
        await supabase
          .from("profiles")
          .update({ institution_id: institution.id })
          .eq("user_id", authData.user.id);

        // Send notification email to institution admin
        const { data: institutionData } = await supabase
          .from("institutions")
          .select("admin_user_id, name")
          .eq("id", institution.id)
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
                type: "reviewer_registered",
                to: adminProfile.email,
                data: {
                  adminName: adminProfile.full_name,
                  reviewerName: formData.fullName,
                  reviewerEmail: formData.email,
                  institutionName: institutionData.name
                }
              }
            });
          }
        }
      }

      setRegistered(true);
      toast({ title: "Registration successful!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-none shadow-2xl">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Registration Complete!</h2>
            <p className="text-muted-foreground mb-6">
              You can now sign in to your reviewer dashboard.
            </p>
            <Link to="/auth">
              <Button className="rounded-xl">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCheck className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Reviewer Registration</CardTitle>
          <CardDescription>
            {institution 
              ? <>You've been invited to join <span className="font-medium text-foreground">{institution.name}</span> as a reviewer</>
              : "Enter your invitation code to register as a reviewer"
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Verification Code Section */}
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Invitation Code</Label>
              <div className="flex gap-2">
                <Input
                  id="verificationCode"
                  name="verificationCode"
                  placeholder="Enter your invitation code"
                  value={formData.verificationCode}
                  onChange={handleInputChange}
                  disabled={codeValid}
                  className="rounded-xl flex-1"
                />
                <Button
                  type="button"
                  variant={codeValid ? "default" : "outline"}
                  onClick={() => validateInviteCode(formData.verificationCode)}
                  disabled={validating || codeValid || !formData.verificationCode.trim()}
                  className="rounded-xl"
                >
                  {validating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : codeValid ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
            </div>

            {/* Institution Display (when verified) */}
            {institution && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium text-sm">Verified Institution</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                  {institution.name}
                </p>
                {institution.website && (
                  <p className="text-xs text-green-600/70 dark:text-green-500/70">
                    {institution.website}
                  </p>
                )}
              </div>
            )}

            {/* Registration Fields - Only show after code is verified */}
            {codeValid && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="rounded-xl"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full rounded-xl" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Reviewer Account"
                  )}
                </Button>
              </>
            )}

            {/* Show hint when code not verified */}
            {!codeValid && (
              <div className="p-4 bg-muted/50 rounded-xl text-center">
                <KeyRound className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Enter and verify your invitation code to continue with registration
                </p>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Already have an account? Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
