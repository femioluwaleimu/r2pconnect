import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Upload, CreditCard, CheckCircle, Loader2, FileText, ArrowRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function IPNActivation() {
  const [step, setStep] = useState<"loading" | "upload_id" | "payment" | "pending_review" | "rejected" | "activated">("loading");
  const [uploading, setUploading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [activationFee, setActivationFee] = useState(5000);
  const [idDocUrl, setIdDocUrl] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkActivationStatus();
  }, []);

  const checkActivationStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: feeSetting } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "ipn_activation_fee_ngn")
      .maybeSingle();
    if (feeSetting?.value) setActivationFee(Number(feeSetting.value));

    const { data: activation } = await supabase
      .from("ipn_activations")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (activation) {
      if (activation.status === "activated") {
        setStep("activated");
        setTimeout(() => navigate("/ipn"), 1500);
      } else if (activation.status === "pending_review") {
        setStep("pending_review");
      } else if (activation.status === "rejected") {
        setRejectionReason((activation as any).rejection_reason || null);
        setStep("rejected");
      } else if (activation.status === "pending_payment") {
        setIdDocUrl(activation.id_document_url);
        setStep("payment");
      } else {
        setStep("upload_id");
      }
    } else {
      await supabase
        .from("ipn_activations")
        .insert({ user_id: user.id, status: "pending_id" });
      setStep("upload_id");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/id-document-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("ipn-documents")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    await supabase
      .from("ipn_activations")
      .update({ id_document_url: path, status: "pending_payment", rejection_reason: null })
      .eq("user_id", user.id);

    setIdDocUrl(path);
    setStep("payment");
    setUploading(false);
    toast({ title: "ID uploaded successfully" });
  };

  const handlePayment = async () => {
    setPaying(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke("paystack", {
        body: {
          action: "initialize_ipn_activation",
          amount: activationFee,
          callback_url: `${window.location.origin}/ipn/activate`,
        },
      });

      if (error) throw error;
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error("Could not initialize payment");
      }
    } catch (err: any) {
      toast({ title: "Payment error", description: err.message, variant: "destructive" });
      setPaying(false);
    }
  };

  // Verify payment on return — Paystack redirects with ?trxref=xxx&reference=xxx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    if (reference && reference.startsWith("ipn_activation_")) {
      verifyPayment(reference);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const verifyPayment = async (reference: string) => {
    setStep("loading");
    try {
      const { data, error } = await supabase.functions.invoke("paystack", {
        body: { action: "verify_ipn_activation", reference },
      });

      if (error) throw error;
      if (data?.success) {
        setStep("pending_review");
        toast({ title: "Payment successful!", description: "Your ID is now under review by admin." });

        // Notify admin via email
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: ipnProfile } = await supabase
            .from("ipn_profiles")
            .select("company_name")
            .eq("user_id", user.id)
            .maybeSingle();

          // Get admin emails
          const { data: adminRoles } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

          if (adminRoles) {
            for (const admin of adminRoles) {
              const { data: adminProfile } = await supabase
                .from("profiles")
                .select("email")
                .eq("user_id", admin.user_id)
                .maybeSingle();

              if (adminProfile?.email) {
                await supabase.functions.invoke("send-email", {
                  body: {
                    type: "ipn_activation_submitted",
                    to: adminProfile.email,
                    data: {
                      companyName: ipnProfile?.company_name || "Unknown",
                      email: user.email,
                      amount: data.amount || activationFee,
                      reference,
                    },
                  },
                });
              }

              // In-app notification for admin
              await supabase.from("notifications").insert({
                user_id: admin.user_id,
                title: "New IPN Activation Request",
                message: `${ipnProfile?.company_name || "An IPN user"} has submitted activation payment and ID for review.`,
                type: "info",
                link: "/admin/ipn",
              });
            }
          }
        }
      } else {
        toast({ title: "Payment not confirmed", description: "Please try again.", variant: "destructive" });
        setStep("payment");
      }
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
      setStep("payment");
    }
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking activation status...</p>
        </div>
      </div>
    );
  }

  if (step === "activated") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-2xl shadow-xl border-none">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Account Activated!</h2>
            <p className="text-muted-foreground">Redirecting to your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "pending_review") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-2xl shadow-xl border-none">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Under Review</h2>
            <p className="text-muted-foreground">Your payment was received and your ID document is being reviewed by admin. You'll be notified once approved.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "rejected") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-2xl shadow-xl border-none">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">ID Rejected</h2>
            <p className="text-muted-foreground">
              Your identity document was rejected. Please re-upload a valid government-issued ID. You do not need to pay again.
            </p>
            {rejectionReason && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
                <strong>Reason:</strong> {rejectionReason}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              className="w-full h-12 rounded-xl"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-5 h-5 mr-2" /> Re-upload ID Document</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${step === "upload_id" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Upload ID</span>
            <span className="sm:hidden">1</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${step === "payment" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Payment</span>
            <span className="sm:hidden">2</span>
          </div>
        </div>

        {step === "upload_id" && (
          <Card className="rounded-2xl shadow-xl border-none">
            <CardHeader className="text-center pb-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-xl">Activate Your IPN Account</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Upload a valid government-issued ID to verify your identity
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  NIN Slip, International Passport, Driver's License, or Voter's Card
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full h-24 rounded-xl border-2 border-dashed flex flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Uploading...</span></>
                  ) : (
                    <><Upload className="w-6 h-6 text-muted-foreground" /><span className="text-sm text-muted-foreground">Click to upload (Max 5MB)</span></>
                  )}
                </Button>
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground">
                  <strong>Activation Fee:</strong> ₦{activationFee.toLocaleString()} (one-time payment after upload)
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "payment" && (
          <Card className="rounded-2xl shadow-xl border-none">
            <CardHeader className="text-center pb-4">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-7 h-7 text-green-600" />
              </div>
              <CardTitle className="text-xl">Pay Activation Fee</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Complete a one-time payment to activate your account
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700 dark:text-green-400">ID document uploaded successfully</span>
              </div>
              <div className="bg-muted/50 rounded-xl p-5 text-center">
                <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
                <p className="text-3xl font-bold text-foreground">₦{activationFee.toLocaleString()}</p>
                <Badge variant="secondary" className="mt-2 rounded-full">One-time fee</Badge>
              </div>
              <Button
                onClick={handlePayment}
                disabled={paying}
                className="w-full h-12 rounded-xl text-base font-semibold"
              >
                {paying ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</>
                ) : (
                  <><CreditCard className="w-5 h-5 mr-2" />Pay ₦{activationFee.toLocaleString()}</>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Secured by Paystack. You'll be redirected to complete payment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
