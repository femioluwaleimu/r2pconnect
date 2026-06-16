import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserPlus, Loader2, Mail, User, Building2, Copy, Check } from "lucide-react";

interface InviteExternalSupervisorProps {
  onInviteSent?: () => void;
}

const isDatabaseQueryError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String((error as any)?.message || error || "");
  return message.includes("Database query failed") || message.includes("Database query error");
};

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

export default function InviteExternalSupervisor({ onInviteSent }: InviteExternalSupervisorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    department: "",
    institutionName: "",
  });
  const { toast } = useToast();

  const generateInviteCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async () => {
    if (!formData.email.trim() || !formData.fullName.trim()) {
      toast({ title: "Email and full name are required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const inviteCode = generateInviteCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      const { error } = await supabase
        .from("external_supervisor_invites")
        .insert({
          id: createUuid(),
          student_id: user.id,
          email: formData.email.toLowerCase(),
          full_name: formData.fullName,
          department: formData.department || null,
          institution_name: formData.institutionName || null,
          invite_code: inviteCode,
          status: "pending",
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        if (isDatabaseQueryError(error)) {
          throw new Error("External supervisor invites are not available yet. Please contact the administrator.");
        }
        throw error;
      }

      const link = `${window.location.origin}/external-supervisor-invite?code=${inviteCode}`;
      setInviteLink(link);

      // Send email notification
      await supabase.functions.invoke("send-email", {
        body: {
          type: "external_supervisor_invite",
          to: formData.email,
          data: {
            supervisorName: formData.fullName,
            inviteLink: link,
            studentName: user.user_metadata?.full_name || "A student",
          },
        },
      });

      toast({ title: "Invitation sent!", description: "Supervisor will receive an email with the invite link" });
      onInviteSent?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied!" });
    }
  };

  const resetForm = () => {
    setFormData({ email: "", fullName: "", department: "", institutionName: "" });
    setInviteLink(null);
    setCopied(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      setDialogOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl border-dashed border-primary/50 text-primary hover:bg-primary/5">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite External Supervisor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Invite External Supervisor
          </DialogTitle>
          <DialogDescription>
            Invite a supervisor who is not on the platform. They will receive a link to register.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-stat-green/10 rounded-xl border border-stat-green/20">
              <p className="text-sm font-medium text-stat-green mb-2">✓ Invitation Created!</p>
              <p className="text-sm text-muted-foreground">
                An email has been sent to {formData.email}. You can also share this link:
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="rounded-xl text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyLink}
                className="shrink-0 rounded-xl"
              >
                {copied ? <Check className="w-4 h-4 text-stat-green" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => setDialogOpen(false)} className="rounded-xl">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div>
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g., Dr. John Smith"
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="supervisor@example.com"
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Institution Name (Optional)
              </Label>
              <Input
                value={formData.institutionName}
                onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                placeholder="e.g., University of Lagos"
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label>Department (Optional)</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Computer Science"
                className="mt-1.5 rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="rounded-xl">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
