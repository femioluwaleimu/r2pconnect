import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import SupervisorLayout from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus,
  Copy,
  Link as LinkIcon,
  ExternalLink,
  Clock,
  Loader2,
  AlertCircle,
  Users,
  Trash2,
} from "lucide-react";
import { formatLagos } from "@/lib/dateUtils";

interface InviteLink {
  id: string;
  invite_code: string;
  max_students: number;
  used_count: number;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const isEnabled = (value: unknown) => value === true || value === 1 || value === "1";

const inviteUrl = (code: string) =>
  `${window.location.origin}/auth?mode=signup&supervisor_invite=${encodeURIComponent(code)}`;

export default function SupervisorInviteStudents() {
  const [user, setUser] = useState<User | null>(null);
  const [invites, setInvites] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [maxStudents, setMaxStudents] = useState(10);
  const [expiryDays, setExpiryDays] = useState(30);
  const [verificationStatus, setVerificationStatus] = useState<string>("pending_verification");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchData(user.id);
    });
  }, [navigate]);

  const fetchData = async (userId: string) => {
    setLoading(true);

    // Fetch supervisor verification status
    const { data: supervisor } = await supabase
      .from("supervisors")
      .select("verification_status")
      .eq("user_id", userId)
      .maybeSingle();

    if (supervisor) {
      setVerificationStatus(supervisor.verification_status || "pending_verification");
    }

    // Fetch existing invites
    const { data: inviteData } = await supabase
      .from("supervisor_student_invites")
      .select("*")
      .eq("supervisor_id", userId)
      .order("created_at", { ascending: false });

    if (inviteData) setInvites(inviteData);
    setLoading(false);
  };

  const generateInviteCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "SUP-";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateInvite = async () => {
    if (!user) return;
    setCreating(true);

    try {
      // Get supervisor's institution
      const { data: supervisor } = await supabase
        .from("supervisors")
        .select("institution_id, department")
        .eq("user_id", user.id)
        .maybeSingle();

      const inviteCode = generateInviteCode();

      const { error } = await supabase.from("supervisor_student_invites").insert({
        id: createId(),
        supervisor_id: user.id,
        institution_id: supervisor?.institution_id || null,
        department: supervisor?.department || null,
        invite_code: inviteCode,
        max_students: maxStudents,
        used_count: 0,
        is_active: true,
        expires_at: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (error) throw error;

      // Log activity
      await supabase.from("supervisor_activity_logs").insert({
        supervisor_id: user.id,
        action_type: "invite_created",
        details: `Created student invite link with code ${inviteCode}`,
      });

      toast({ title: "Invite link created!", description: "Share this link with your students" });
      fetchData(user.id);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (inviteId: string) => {
    const { error } = await supabase
      .from("supervisor_student_invites")
      .update({ is_active: false })
      .eq("id", inviteId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invite deactivated" });
      if (user) fetchData(user.id);
    }
  };

  const copyInviteLink = async (code: string) => {
    const link = inviteUrl(code);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const input = document.createElement("textarea");
        input.value = link;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }

      toast({ title: "Link copied!", description: link });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Select and copy the visible invite link manually.",
        variant: "destructive",
      });
    }
  };

  const isVerified = verificationStatus === "verified";

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invite Students</h1>
          <p className="text-muted-foreground">Generate invite links for students to register under your supervision</p>
        </div>

        {/* Verification Warning */}
        {!isVerified && (
          <Card className="border-none shadow-lg bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div className="text-white">
                  <h4 className="font-bold text-lg mb-1">Verification Required</h4>
                  <p className="text-white/90 text-sm">
                    Your account is currently <strong>{verificationStatus.replace("_", " ")}</strong>. 
                    You need to be verified by a platform admin before you can invite students. 
                    Please wait for verification or contact support.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Invite */}
        {isVerified && (
          <Card className="rounded-2xl border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Generate New Invite Link
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Max Students</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(parseInt(e.target.value) || 10)}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Link Expires In (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(parseInt(e.target.value) || 30)}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateInvite}
                disabled={creating}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600"
              >
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Generate Invite Link
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Existing Invites */}
        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary" />
              Your Invite Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : invites.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No invite links created yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invites.map((invite) => {
                  const usedCount = Number(invite.used_count || 0);
                  const maxAllowed = Number(invite.max_students || 0);
                  const isExpired = new Date(invite.expires_at) < new Date();
                  const isFull = maxAllowed > 0 && usedCount >= maxAllowed;
                  const isActive = isEnabled(invite.is_active) && !isExpired && !isFull;
                  const link = inviteUrl(invite.invite_code);

                  return (
                    <div
                      key={invite.id}
                      className={`p-4 rounded-xl border ${isActive ? "bg-muted/30" : "bg-muted/10 opacity-60"}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-primary/10 px-2 py-1 rounded-lg text-primary">
                              {invite.invite_code}
                            </code>
                            {isActive ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                            ) : isExpired ? (
                              <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Expired</Badge>
                            ) : isFull ? (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Full</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 max-w-full">
                            <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary underline-offset-2 hover:underline truncate"
                            >
                              {link}
                            </a>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {usedCount}/{maxAllowed} students
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Expires: {formatLagos(invite.expires_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => copyInviteLink(invite.invite_code)}
                              >
                                <Copy className="w-3.5 h-3.5 mr-1" />
                                Copy Link
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                asChild
                              >
                                <a href={link} target="_blank" rel="noreferrer">
                                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                  Open
                                </a>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-xl text-destructive"
                                onClick={() => handleDeactivate(invite.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SupervisorLayout>
  );
}
