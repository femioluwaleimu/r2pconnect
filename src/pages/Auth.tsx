import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Play,
  User,
  Building2,
  Factory,
  TrendingUp,
  ArrowLeft,
  Eye,
  EyeOff,
  Shield,
  Sparkles,
  Globe,
  Phone,
  Loader2,
  KeyRound,
  CheckCircle,
  Download,
  GraduationCap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleEdgeFunctionResponse } from "@/lib/edgeFunctionError";
import { Database } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TermsCheckbox } from "@/components/TermsDialog";
import PublicBrand from "@/components/layout/PublicBrand";

type UserRole = Database["public"]["Enums"]["app_role"];

interface Institution {
  id: string;
  name: string;
}

interface ValidatedInstitution {
  institution_id: string;
  institution_name: string;
  institution_website: string | null;
  code_id: string;
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const roles = [
  {
    id: "researcher" as UserRole,
    title: "Student Research / Jobs",
    description: "Upload research, get AI insights, earn credits, apply for job",
    icon: User,
    color: "bg-blue-600",
  },
  {
    id: "supervisor" as UserRole,
    title: "Supervisor",
    description: "Supervise students' research and guide them",
    icon: GraduationCap,
    color: "bg-indigo-600",
  },
  {
    id: "institution" as UserRole,
    title: "Institution",
    description: "Manage researchers, reviewers, and research",
    icon: Building2,
    color: "bg-purple-600",
  },
  {
    id: "industry" as UserRole,
    title: "Industry",
    description: "Discover solutions and post challenges",
    icon: Factory,
    color: "bg-amber-600",
  },
  {
    id: "investor" as UserRole,
    title: "Investor",
    description: "Fund promising research projects",
    icon: TrendingUp,
    color: "bg-teal-600",
  },
];

const industryTypes = [
  {
    id: "industry" as UserRole,
    title: "Direct Industry",
    description: "Register a single company and post opportunities",
    icon: Factory,
    color: "bg-amber-600",
  },
  {
    id: "ipn" as UserRole,
    title: "Industry Partner Network (IPN)",
    description: "Manage multiple companies and recruit at scale",
    icon: Globe,
    color: "bg-orange-600",
  },
];

const getWeakPasswordMessage = (password: string): string | null => {
  if (password.length < 8) {
    return "Password is too weak. Use at least 8 characters.";
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password is too weak. Use at least one letter and one number.";
  }

  return null;
};

const getAuthErrorMessage = (error: any): string => {
  const fallback = error?.message || "Something went wrong. Please try again.";
  const data = error?.data;

  if (data && typeof data === "object" && "errors" in data) {
    const errors = (data as { errors?: Record<string, string[] | string> }).errors;
    const passwordError = errors?.password;
    if (Array.isArray(passwordError) && passwordError.length > 0) {
      return passwordError[0];
    }
    if (typeof passwordError === "string") {
      return passwordError;
    }

    const messages = Object.entries(errors || {})
      .flatMap(([field, value]) => {
        const label = field.replace(/_/g, " ");
        if (Array.isArray(value)) {
          return value.map((message) => String(message || "").trim()).filter(Boolean);
        }
        const message = String(value || "").trim();
        return message ? [`${label}: ${message}`] : [];
      });

    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  if (data && typeof data === "object" && "message" in data && typeof (data as { message?: unknown }).message === "string") {
    return (data as { message: string }).message;
  }

  if (/password.*at least|password.*min|weak password/i.test(fallback)) {
    return "Password is too weak. Use at least 8 characters with one letter and one number.";
  }

  return fallback;
};

// Helper function to get dashboard URL based on role
const getDashboardByRole = (role: UserRole): string => {
  switch (role) {
    case "admin":
      return "/admin";
    case "institution":
      return "/institution";
    case "industry":
      return "/industry";
    case "investor":
      return "/investor";
    case "reviewer":
      return "/reviewer";
    case "supervisor":
      return "/supervisor";
    case "ipn":
      return "/ipn";
    case "job_applicant":
      return "/dashboard";
    case "researcher":
    default:
      return "/dashboard";
  }
};

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showIndustryTypeSelection, setShowIndustryTypeSelection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Department-level onboarding state
  const [institutionOnboardingType, setInstitutionOnboardingType] = useState<string | null>(null);
  const [activeDepartments, setActiveDepartments] = useState<{ id: string; name: string }[]>([]);
  
  // Institution code validation state
  const [validatingCode, setValidatingCode] = useState(false);
  const [validatedInstitution, setValidatedInstitution] = useState<ValidatedInstitution | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  
  // Terms acceptance state
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Supervisor invite for students
  const supervisorInviteCode = searchParams.get("supervisor_invite");
  const [supervisorInviteData, setSupervisorInviteData] = useState<{
    supervisor_id: string;
    institution_id: string | null;
    department: string | null;
    supervisor_name: string;
  } | null>(null);

  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  // Referral code from URL
  const referralCode = searchParams.get("ref");
  const [referrerName, setReferrerName] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phoneNumber: "",
    institutionCode: "",
    institutionId: "",
    companyName: "",
    department: "",
    academicRank: "",
    staffId: "",
    meansOfIdentification: "",
    whatDoYouDo: "",
  });

  // Fetch referrer name when referral code is present
  useEffect(() => {
    const fetchReferrerName = async () => {
      if (referralCode) {
        const { data } = await supabase
          .from("referral_codes")
          .select("user_id")
          .eq("code", referralCode.toUpperCase())
          .maybeSingle();
        
        if (data?.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", data.user_id)
            .maybeSingle();
          
          if (profile?.full_name) {
            setReferrerName(profile.full_name);
          }
        }
      }
    };
    fetchReferrerName();
  }, [referralCode]);

  // Validate supervisor invite code for students
  useEffect(() => {
    const validateSupervisorInvite = async () => {
      if (!supervisorInviteCode) return;
      const { data: invite } = await supabase
        .from("supervisor_student_invites")
        .select("supervisor_id, institution_id, department, is_active, expires_at, used_count, max_students")
        .eq("invite_code", supervisorInviteCode)
        .eq("is_active", true)
        .maybeSingle();

      if (invite && new Date(invite.expires_at) > new Date() && invite.used_count < invite.max_students) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", invite.supervisor_id)
          .maybeSingle();

        setSupervisorInviteData({
          supervisor_id: invite.supervisor_id,
          institution_id: invite.institution_id,
          department: invite.department,
          supervisor_name: profile?.full_name || "Supervisor",
        });
        setIsSignUp(true);
        setSelectedRole("researcher");
        if (invite.institution_id) {
          setFormData(prev => ({ ...prev, institutionId: invite.institution_id! }));
        }
      }
    };
    validateSupervisorInvite();
  }, [supervisorInviteCode]);

  // Fetch institutions for researcher/reviewer signup
  useEffect(() => {
    const fetchInstitutions = async () => {
      const { data } = await supabase.from("institutions").select("id, name").eq("is_verified", true).order("name");

      if (data) setInstitutions(data);
    };
    fetchInstitutions();
  }, []);

  // Fetch onboarding type and departments when institution changes
  useEffect(() => {
    const fetchOnboardingData = async () => {
      if (!formData.institutionId) {
        setInstitutionOnboardingType(null);
        setActiveDepartments([]);
        return;
      }
      const { data: inst } = await supabase
        .from("institutions")
        .select("onboarding_type")
        .eq("id", formData.institutionId)
        .maybeSingle();

      const obType = inst?.onboarding_type || "full_institution";
      setInstitutionOnboardingType(obType);

      // Always fetch active departments for the chosen institution.
      // If any are configured, users must pick from them; otherwise manual entry is allowed.
      const { data: depts } = await supabase
        .from("departments")
        .select("id, name")
        .eq("institution_id", formData.institutionId)
        .eq("is_active", true)
        .order("name");
      setActiveDepartments(depts || []);
      if (depts?.length) {
        setFormData((prev) =>
          prev.department && !depts.some((dept) => dept.name === prev.department)
            ? { ...prev, department: "" }
            : prev
        );
      }
    };
    fetchOnboardingData();
  }, [formData.institutionId]);

  // PWA install prompt listener
  useEffect(() => {
    const isStandalone = () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    const updateInstallVisibility = (prompt: BeforeInstallPromptEvent | null = deferredPrompt) => {
      setShowInstallButton(Boolean(prompt) && !isStandalone());
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      updateInstallVisibility(promptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallButton(false);
      toast({ title: "App installed", description: "R2P Connect has been added to your home screen." });
    };
    
    updateInstallVisibility(null);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const displayModeQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = () => updateInstallVisibility();
    displayModeQuery.addEventListener?.("change", handleDisplayModeChange);
    
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      displayModeQuery.removeEventListener?.("change", handleDisplayModeChange);
    };
  }, [deferredPrompt, toast]);
  
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowInstallButton(false);
      return;
    }
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setShowInstallButton(false);
      toast({ title: "Installing app", description: "R2P Connect is being added to your device." });
    }
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  // Check if user is already logged in and redirect
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if email is verified
        const { data: profile } = await supabase
          .from("profiles")
          .select("email_verified")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (profile && !profile.email_verified) {
          // Redirect to verify email page
          navigate(`/verify-email?email=${encodeURIComponent(session.user.email || "")}`);
          return;
        }

        // Fetch user role from database
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        const role = roleData?.role || (session.user.user_metadata?.role as UserRole) || "researcher";
        navigate(getDashboardByRole(role));
      }
    };
    checkAuth();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Reset validation when code changes
    if (name === "institutionCode") {
      setValidatedInstitution(null);
      setCodeError(null);
    }
  };

  // Validate institution code via backend
  const validateInstitutionCode = async () => {
    if (!formData.institutionCode.trim()) {
      setCodeError("Please enter a verification code");
      return;
    }

    setValidatingCode(true);
    setCodeError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("validate-institution-code", {
        body: { verification_code: formData.institutionCode.trim() },
      });

      const [result, errorMsg] = handleEdgeFunctionResponse(data, error);
      if (errorMsg) {
        setCodeError(errorMsg);
        return;
      }

      if (result?.valid) {
        setValidatedInstitution({
          institution_id: result.institution_id,
          institution_name: result.institution_name,
          institution_website: result.institution_website,
          code_id: result.code_id,
        });
        toast({ title: "Code verified!", description: `Institution: ${result.institution_name}` });
      } else {
        setCodeError(result?.error || "Invalid verification code");
      }
    } catch (error: any) {
      console.error("Error validating code:", error);
      setCodeError(error.message || "Failed to validate code");
    } finally {
      setValidatingCode(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      toast({ title: "Please select a role", variant: "destructive" });
      return;
    }

    const weakPasswordMessage = getWeakPasswordMessage(formData.password);
    if (weakPasswordMessage) {
      toast({
        title: "Weak password",
        description: weakPasswordMessage,
        variant: "destructive",
      });
      return;
    }

    // Require terms acceptance
    if (!termsAccepted) {
      toast({
        title: "Accept Terms & Conditions",
        description: "Please accept the terms and conditions to continue",
        variant: "destructive",
      });
      return;
    }

    // Make institution mandatory for researchers and supervisors
    if ((selectedRole === "researcher" || selectedRole === "supervisor") && !formData.institutionId) {
      toast({
        title: "Please select your institution",
        description: selectedRole === "supervisor" 
          ? "Institution is required for supervisors" 
          : "Institution is required for researchers/students",
        variant: "destructive",
      });
      return;
    }

    const departmentRequired =
      (selectedRole === "researcher" || selectedRole === "supervisor") &&
      !!formData.institutionId &&
      activeDepartments.length > 0;

    if (departmentRequired && !formData.department.trim()) {
      toast({
        title: "Please select your department",
        description: "Your institution requires you to choose an active department",
        variant: "destructive",
      });
      return;
    }

    if (departmentRequired && !activeDepartments.some((dept) => dept.name === formData.department)) {
      toast({
        title: "Invalid department",
        description: "Please select one of your institution's active departments",
        variant: "destructive",
      });
      return;
    }

    // Require department for supervisors
    if (selectedRole === "supervisor" && !formData.department.trim()) {
      toast({
        title: "Please enter your department",
        description: "Department is required for supervisors",
        variant: "destructive",
      });
      return;
    }

    // Require validated institution code for institution role
    if (selectedRole === "institution" && !validatedInstitution) {
      toast({
        title: "Please validate your institution code",
        description: "Click 'Verify Code' to validate your institution code first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}${getDashboardByRole(selectedRole)}`;

      // For institution role, use validated institution data
      const institutionId = selectedRole === "institution" 
        ? validatedInstitution?.institution_id 
        : formData.institutionId;

      const { data: authData, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.fullName,
            phone_number: formData.phoneNumber,
            role: selectedRole,
            institution_id: institutionId,
            company_name: (selectedRole === "industry" || selectedRole === "ipn") ? formData.companyName : undefined,
            means_of_identification: selectedRole === "ipn" ? formData.meansOfIdentification : undefined,
            what_do_you_do: selectedRole === "ipn" ? formData.whatDoYouDo : undefined,
            department: (selectedRole === "supervisor" || selectedRole === "researcher") ? formData.department.trim() : undefined,
            academic_rank: selectedRole === "supervisor" ? formData.academicRank : undefined,
            staff_id: selectedRole === "supervisor" ? formData.staffId : undefined,
            researcher_type: supervisorInviteData ? "student" : undefined,
            assigned_supervisor_id: supervisorInviteData?.supervisor_id || undefined,
          },
        },
      });

      if (error) throw error;

      if (authData.user && selectedRole === "researcher") {
        try {
          await supabase.functions.invoke("ensure-free-ai-credits", {
            body: { userId: authData.user.id },
          });
        } catch (creditError) {
          console.error("Error initializing free AI credits:", creditError);
        }
      }

      if (authData.user && selectedRole === "supervisor") {
        try {
          await supabase.functions.invoke("notify-supervisor-registration", {
            body: { supervisor_user_id: authData.user.id },
          });
        } catch (notificationError) {
          console.error("Error sending supervisor registration notification:", notificationError);
        }
      }

      // If institution registration, mark the code as used
      if (selectedRole === "institution" && validatedInstitution && authData.user) {
        try {
          await supabase.functions.invoke("mark-code-used", {
            body: {
              code_id: validatedInstitution.code_id,
              user_id: authData.user.id,
              institution_id: validatedInstitution.institution_id,
              is_admin: true,
            },
          });
        } catch (markError) {
          console.error("Error marking code as used:", markError);
          // Don't fail registration if this fails
        }
      }

      // If student registered via supervisor invite, increment used count and current_students
      if (supervisorInviteData && supervisorInviteCode && authData.user && selectedRole === "researcher") {
        try {
          const { data: currentInvite } = await supabase
            .from("supervisor_student_invites")
            .select("used_count")
            .eq("invite_code", supervisorInviteCode)
            .single();
          if (currentInvite) {
            await supabase
              .from("supervisor_student_invites")
              .update({ used_count: (currentInvite.used_count || 0) + 1 })
              .eq("invite_code", supervisorInviteCode);
          }

          // Also increment current_students in the supervisors table
          const { data: supervisorRecord } = await supabase
            .from("supervisors")
            .select("current_students")
            .eq("user_id", supervisorInviteData.supervisor_id)
            .single();
          if (supervisorRecord) {
            await supabase
              .from("supervisors")
              .update({ current_students: (supervisorRecord.current_students || 0) + 1 })
              .eq("user_id", supervisorInviteData.supervisor_id);
          }
        } catch (inviteError) {
          console.error("Error updating supervisor invite:", inviteError);
        }
      }

      // Handle referral code via server-side edge function (bypasses RLS)
      if (referralCode && authData.user) {
        try {
          // Wait briefly for trigger to create subscription row
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          await supabase.functions.invoke("process-referral", {
            body: {
              referralCode: referralCode.toUpperCase(),
              newUserId: authData.user.id,
            },
          });
        } catch (refError) {
          console.error("Error processing referral:", refError);
          // Don't fail registration if referral fails
        }
      }

      // Send verification code email
      try {
        await supabase.functions.invoke("send-verification-code", {
          body: {
            email: formData.email,
            type: "email_verification",
          },
        });
      } catch (emailError) {
        console.error("Error sending verification email:", emailError);
        // Don't fail registration if email fails
      }

      toast({
        title: "Account created!",
        description: referralCode ? "You were referred! You'll enjoy great research tools. Check your email for verification." : "Please check your email for a verification code.",
      });
      
      // Redirect to verify email page
      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
      
      setValidatedInstitution(null);
    } catch (error: any) {
      toast({
        title: /password/i.test(getAuthErrorMessage(error)) ? "Weak password" : "Error",
        description: getAuthErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if email is verified
        const { data: profile } = await supabase
          .from("profiles")
          .select("email_verified")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (profile && !profile.email_verified) {
          // Send new verification code
          try {
            await supabase.functions.invoke("send-verification-code", {
              body: {
                email: data.user.email,
                type: "email_verification",
              },
            });
          } catch (emailError) {
            console.error("Error sending verification email:", emailError);
          }

          toast({
            title: "Email not verified",
            description: "Please verify your email to continue.",
          });
          navigate(`/verify-email?email=${encodeURIComponent(data.user.email || "")}`);
          return;
        }

        // Fetch user role from database
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .single();

        const role = roleData?.role || (data.user.user_metadata?.role as UserRole) || "researcher";
        navigate(getDashboardByRole(role));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast({ title: "Please enter your email", variant: "destructive" });
      return;
    }

    setResetLoading(true);
    try {
      // Redirect to reset password page with email pre-filled
      setForgotPasswordOpen(false);
      navigate(`/reset-password?email=${encodeURIComponent(resetEmail)}`);
    } finally {
      setResetLoading(false);
    }
  };

  const showInstitutionSelector = selectedRole === "researcher" || selectedRole === "supervisor";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero flex-col justify-between p-12">
        <PublicBrand inverted />

        <div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Transform Research Into
            <span className="block text-white/90">Real-World Impact</span>
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Join Nigeria's leading platform connecting researchers, institutions, industries, and investors.
          </p>

          {/* Info Card */}
          <Card className="border-none shadow-lg bg-white/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Secure & Trusted</h4>
                  <ul className="text-sm text-white/80 space-y-1">
                    <li>• Enterprise-grade security for your research</li>
                    <li>• Verified institutions and researchers</li>
                    <li>• AI-powered insights and matching</li>
                    <li>• Direct connection with industry partners</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-white/60 text-sm">© {new Date().getFullYear()} R2P CONNECT Nigeria</div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="lg:hidden flex items-center gap-2 mb-8 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to home</span>
          </Link>

          <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="text-center pb-4">
              {isSignUp && supervisorInviteData && (
                <div className="mb-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center justify-center gap-2 text-indigo-700 dark:text-indigo-300">
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Invited by <strong>{supervisorInviteData.supervisor_name}</strong>
                    </span>
                  </div>
                  {supervisorInviteData.department && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 text-center">
                      Department: {supervisorInviteData.department}
                    </p>
                  )}
                </div>
              )}

              {/* Referral Banner */}
              {isSignUp && referrerName && (
                <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      You're being invited by <strong>{referrerName}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 text-center">
                    You'll both get 5 AI credits when you sign up!
                  </p>
                </div>
              )}
              <CardTitle className="text-2xl font-bold text-foreground">
                {isSignUp ? "Create Account" : "Welcome Back"}
              </CardTitle>
              <CardDescription>
                {isSignUp ? "Join R2P CONNECT and start your journey" : "Sign in to continue to your dashboard"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isSignUp && !selectedRole && !showIndustryTypeSelection ? (
                <div className="space-y-4">
                  <Label className="text-center block mb-4 text-foreground">Select your role</Label>
                  <div className="flex flex-col gap-2.5">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => {
                          if (role.id === "industry") {
                            setShowIndustryTypeSelection(true);
                          } else {
                            setSelectedRole(role.id);
                            setTermsAccepted(false);
                          }
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-border hover:border-primary transition-all text-left group bg-card hover:shadow-md"
                      >
                        <div
                          className={`w-9 h-9 rounded-lg ${role.color} flex items-center justify-center flex-shrink-0 shadow-lg`}
                        >
                          <role.icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                            {role.title}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">{role.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 mt-6">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground text-sm mb-1">Getting Started</h4>
                          <p className="text-xs text-muted-foreground">
                            Select your role to unlock features tailored for you. You can always update this later.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : isSignUp && showIndustryTypeSelection && !selectedRole ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowIndustryTypeSelection(false)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to roles
                  </button>
                  <Label className="text-center block mb-4 text-foreground">Select Industry Type</Label>
                  <div className="flex flex-col gap-2.5">
                    {industryTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => {
                          setSelectedRole(type.id);
                          setShowIndustryTypeSelection(false);
                          setTermsAccepted(false);
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-border hover:border-primary transition-all text-left group bg-card hover:shadow-md"
                      >
                        <div className={`w-9 h-9 rounded-lg ${type.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                          <type.icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                            {type.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
                  {isSignUp && selectedRole && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole(null);
                        setShowIndustryTypeSelection(false);
                        setValidatedInstitution(null);
                        setCodeError(null);
                        setTermsAccepted(false);
                      }}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Change role
                    </button>
                  )}

                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        placeholder="Enter your full name"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                        className="rounded-xl"
                      />
                    </div>
                  )}

                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        name="phoneNumber"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        required
                        className="rounded-xl"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        minLength={6}
                        className="rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                   {/* Institution Selector for Researchers/Reviewers */}
                  {isSignUp && showInstitutionSelector && (
                    <div className="space-y-2">
                      <Label htmlFor="institutionId">Select Institution</Label>
                      <Select
                        value={formData.institutionId}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, institutionId: value }))}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Choose your institution" />
                        </SelectTrigger>
                        <SelectContent>
                          {institutions.map((inst) => (
                            <SelectItem key={inst.id} value={inst.id}>
                              {inst.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Department field for Researchers/Students */}
                  {isSignUp && selectedRole === "researcher" && (
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      {formData.institutionId && activeDepartments.length > 0 ? (
                        <Select
                          value={formData.department}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, department: value }))}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select your department" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeDepartments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="department"
                          name="department"
                          placeholder="e.g., Computer Science"
                          value={formData.department}
                          onChange={handleInputChange}
                          className="rounded-xl"
                        />
                      )}
                    </div>
                  )}

                  {/* Institution Code Validation for Institution Role */}
                  {isSignUp && selectedRole === "institution" && (
                    <div className="space-y-2">
                      <Label htmlFor="institutionCode">Institution Verification Code</Label>
                      <div className="flex gap-2">
                        <Input
                          id="institutionCode"
                          name="institutionCode"
                          placeholder="Enter code provided by admin"
                          value={formData.institutionCode}
                          onChange={handleInputChange}
                          disabled={!!validatedInstitution}
                          className="rounded-xl flex-1"
                        />
                        <Button
                          type="button"
                          variant={validatedInstitution ? "default" : "outline"}
                          onClick={validateInstitutionCode}
                          disabled={validatingCode || !!validatedInstitution}
                          className="rounded-xl"
                        >
                          {validatingCode ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : validatedInstitution ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            "Verify"
                          )}
                        </Button>
                      </div>
                      {codeError && (
                        <p className="text-sm text-destructive">{codeError}</p>
                      )}
                      {validatedInstitution && (
                        <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-900">
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium text-sm">Verified Institution</span>
                          </div>
                          <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                            {validatedInstitution.institution_name}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Supervisor Fields */}
                  {isSignUp && selectedRole === "supervisor" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department *</Label>
                        {formData.institutionId && activeDepartments.length > 0 ? (
                          <Select
                            value={formData.department}
                            onValueChange={(value) => setFormData((prev) => ({ ...prev, department: value }))}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Select your department" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeDepartments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="department"
                            name="department"
                            placeholder="e.g., Computer Science"
                            value={formData.department}
                            onChange={handleInputChange}
                            required
                            className="rounded-xl"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="academicRank">Academic Rank</Label>
                        <Select
                          value={formData.academicRank}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, academicRank: value }))}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select your rank" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="graduate_assistant">Graduate Assistant</SelectItem>
                            <SelectItem value="assistant_lecturer">Assistant Lecturer</SelectItem>
                            <SelectItem value="lecturer_ii">Lecturer II</SelectItem>
                            <SelectItem value="lecturer_i">Lecturer I</SelectItem>
                            <SelectItem value="senior_lecturer">Senior Lecturer</SelectItem>
                            <SelectItem value="reader">Reader / Associate Professor</SelectItem>
                            <SelectItem value="professor">Professor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="staffId">Staff ID (optional)</Label>
                        <Input
                          id="staffId"
                          name="staffId"
                          placeholder="Enter your staff ID"
                          value={formData.staffId}
                          onChange={handleInputChange}
                          className="rounded-xl"
                        />
                      </div>
                    </>
                  )}

                  {/* Company Name for Industry / IPN */}
                  {isSignUp && (selectedRole === "industry" || selectedRole === "ipn") && (
                    <div className="space-y-2">
                      <Label htmlFor="companyName">{selectedRole === "ipn" ? "Network Name" : "Company Name"}</Label>
                      <Input
                        id="companyName"
                        name="companyName"
                        placeholder={selectedRole === "ipn" ? "Enter your network name" : "Enter your company name"}
                        value={formData.companyName}
                        onChange={handleInputChange}
                        required
                        className="rounded-xl"
                      />
                    </div>
                  )}

                  {/* IPN-specific fields */}
                  {isSignUp && selectedRole === "ipn" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="meansOfIdentification">Means of Identification (NIN)</Label>
                        <Input
                          id="meansOfIdentification"
                          name="meansOfIdentification"
                          placeholder="Enter your NIN"
                          value={formData.meansOfIdentification}
                          onChange={handleInputChange}
                          required
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="whatDoYouDo">What do you do?</Label>
                        <Input
                          id="whatDoYouDo"
                          name="whatDoYouDo"
                          placeholder="e.g., Recruitment Agency, HR Consulting"
                          value={formData.whatDoYouDo}
                          onChange={handleInputChange}
                          required
                          className="rounded-xl"
                        />
                      </div>
                    </>
                  )}

                  {/* Terms and Conditions Checkbox */}
                  {isSignUp && selectedRole && (
                    <TermsCheckbox
                      checked={termsAccepted}
                      onCheckedChange={setTermsAccepted}
                      role={selectedRole}
                    />
                  )}

                  <Button type="submit" className="w-full rounded-xl" size="lg" disabled={loading || (isSignUp && !termsAccepted)}>
                    {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
                  </Button>

                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setForgotPasswordOpen(true)}
                      className="w-full text-sm text-muted-foreground hover:text-primary transition-colors mt-2"
                    >
                      Forgot your password?
                    </button>
                  )}

                  {!isSignUp && (
                    <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 mt-4">
                      <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm mb-1">New to R2P CONNECT?</h4>
                  <p className="text-xs text-muted-foreground">
                    Create an account to upload research, connect with industry, and access AI tools.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* PWA Install Button */}
        {showInstallButton && (
          <Button
            type="button"
            variant="outline"
            onClick={handleInstallClick}
            className="w-full mt-4 rounded-xl border-2 border-primary/30 hover:border-primary bg-gradient-to-r from-primary/5 to-accent/5"
          >
            <Download className="w-4 h-4 mr-2" />
            Install R2P Connect App
          </Button>
        )}
      </form>
              )}

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setSelectedRole(null);
                    setShowIndustryTypeSelection(false);
                    setValidatedInstitution(null);
                    setCodeError(null);
                    setTermsAccepted(false);
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resetEmail">Email Address</Label>
              <Input
                id="resetEmail"
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setForgotPasswordOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleForgotPassword} disabled={resetLoading} className="rounded-xl">
                {resetLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Reset Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
