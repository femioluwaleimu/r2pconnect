import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, CheckCircle, RefreshCw } from "lucide-react";
import { getEdgeFunctionError } from "@/lib/edgeFunctionError";

const roleRoutes: Record<string, string> = {
  researcher: "/dashboard",
  institution: "/institution",
  industry: "/industry",
  investor: "/investor",
  admin: "/admin",
  reviewer: "/reviewer",
  supervisor: "/supervisor",
};

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const email = searchParams.get("email") || "";
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/dashboard");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 6) {
      toast({ title: "Please enter a valid 6-digit code", variant: "destructive" });
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-code", {
        body: { email, code, type: "email_verification" },
      });

      if (error) {
        const errorMessage = await getEdgeFunctionError(error);
        throw new Error(errorMessage);
      }

      if (data.valid) {
        setVerified(true);
        
        // Determine redirect path based on role
        const role = data.role || "researcher";
        const path = roleRoutes[role] || "/dashboard";
        setRedirectPath(path);
        
        toast({ title: "Email verified successfully!" });
        setTimeout(() => navigate(path), 2000);
      } else {
        toast({ title: data.error || "Invalid code", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-verification-code", {
        body: { email, type: "email_verification" },
      });

      if (error) {
        const errorMessage = await getEdgeFunctionError(error);
        throw new Error(errorMessage);
      }

      toast({ title: "Verification code resent", description: "Check your inbox" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-none shadow-2xl">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Email Verified!</h2>
            <p className="text-muted-foreground">Redirecting you to your dashboard...</p>
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
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Verify Your Email</CardTitle>
          <CardDescription>
            We sent a 6-digit verification code to <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="rounded-xl text-center text-2xl tracking-widest font-mono"
                autoComplete="one-time-code"
              />
            </div>

            <Button type="submit" className="w-full rounded-xl" size="lg" disabled={verifying || code.length !== 6}>
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Didn't receive the code?</p>
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={resending}
              className="text-primary"
            >
              {resending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Code
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
